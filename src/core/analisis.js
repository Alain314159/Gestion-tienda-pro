import { toBig, toNumber, add, sub, mul, div, pct, Big } from './Money.js';

export function analisisABC(productos, ventas, lotes) {
  const data = {};
  const hoy = new Date();
  const mesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);

  ventas
    .filter((v) => !v.anulada && new Date(v.fecha) >= mesesAtras)
    .forEach((v) => {
      v.items.forEach((it) => {
        if (!data[it.productoId]) {
          const p = productos.find((x) => x.id === it.productoId);
          data[it.productoId] = {
            id: it.productoId,
            nombre: it.nombre,
            volumen: new Big('0'),
            ganancia: new Big('0'),
            revenue: new Big('0'),
          };
        }
        data[it.productoId].volumen = data[it.productoId].volumen.plus(toBig(it.cantidad));
        data[it.productoId].ganancia = data[it.productoId].ganancia.plus(toBig(it.ganancia));
        data[it.productoId].revenue = data[it.productoId].revenue.plus(toBig(it.precio).times(toBig(it.cantidad)));
      });
    });

  const arr = Object.values(data).sort((a, b) => toNumber(b.ganancia) - toNumber(a.ganancia));
  const totalGan = arr.reduce((s, x) => s.plus(x.ganancia), new Big('0'));
  const totalVol = arr.reduce((s, x) => s.plus(x.volumen), new Big('0'));

  let acumG = new Big('0'),
    acumV = new Big('0');
  return arr.map((x) => {
    acumG = acumG.plus(x.ganancia);
    acumV = acumV.plus(x.volumen);
    const catG = acumG.div(totalGan).lte('0.8') ? 'A' : acumG.div(totalGan).lte('0.95') ? 'B' : 'C';
    const catV = acumV.div(totalVol).lte('0.8') ? 'A' : acumV.div(totalVol).lte('0.95') ? 'B' : 'C';
    return {
      ...x,
      volumen: toNumber(x.volumen),
      ganancia: toNumber(x.ganancia),
      revenue: toNumber(x.revenue),
      catGanancia: catG,
      catVolumen: catV,
      pctGan: totalGan.gt('0') ? toNumber(pct(x.ganancia, totalGan)) : 0,
    };
  });
}

export function detectarAnomalias(ventas, compras, ajustes) {
  const alertas = [];
  const hoy = new Date().toISOString().slice(0, 10);

  ventas
    .filter((v) => !v.anulada && v.fecha && v.fecha.slice(0, 10) === hoy)
    .forEach((v) => {
      if (!v.items || !Array.isArray(v.items)) return;
      v.items.forEach((it) => {
        const revenue = toBig(it.precio).times(toBig(it.cantidad));
        const costo = toBig(it.costo);
        let margen;
        if (revenue.gt('0')) {
          margen = toNumber(revenue.minus(costo).div(revenue).times('100'));
        } else if (costo.gt('0')) {
          margen = -100;
        } else {
          margen = 0;
        }
        if (margen < 0) alertas.push({ tipo: 'perdida', msg: `${it.nombre} vendido con perdida`, gravedad: 'alta' });
        else if (margen < 5 && toNumber(revenue) > 0)
          alertas.push({ tipo: 'margen_bajo', msg: `${it.nombre} margen ${margen.toFixed(1)}%`, gravedad: 'media' });
      });
    });

  const robos = ajustes.filter((a) => a.motivo === 'robo' && a.fecha.slice(0, 7) === hoy.slice(0, 7));
  if (robos.length > 2) alertas.push({ tipo: 'robo', msg: `${robos.length} robos este mes`, gravedad: 'alta' });

  const hoyVentas = ventas
    .filter((v) => !v.anulada && v.fecha.slice(0, 10) === hoy)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  for (let i = 1; i < hoyVentas.length; i++) {
    const diff = new Date(hoyVentas[i].fecha) - new Date(hoyVentas[i - 1].fecha);
    if (diff < 30000 && Math.abs(hoyVentas[i].total - hoyVentas[i - 1].total) < 0.01) {
      alertas.push({ tipo: 'duplicado', msg: `Venta duplicada ${hoyVentas[i].total}`, gravedad: 'media' });
    }
  }

  return alertas;
}
