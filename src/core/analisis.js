import { n } from './util.js';

export function analisisABC(productos, ventas, lotes) {
  const data = {};
  const hoy = new Date();
  const mesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);

  ventas.filter(v => !v.anulada && new Date(v.fecha) >= mesesAtras).forEach(v => {
    v.items.forEach(it => {
      if (!data[it.productoId]) {
        const p = productos.find(x => x.id === it.productoId);
        data[it.productoId] = {
          id: it.productoId,
          nombre: it.nombre,
          volumen: 0,
          ganancia: 0,
          revenue: 0
        };
      }
      data[it.productoId].volumen += n(it.cantidad);
      data[it.productoId].ganancia += n(it.ganancia);
      data[it.productoId].revenue += n(it.precio) * n(it.cantidad);
    });
  });

  const arr = Object.values(data).sort((a, b) => b.ganancia - a.ganancia);
  const totalGan = arr.reduce((s, x) => s + x.ganancia, 0);
  const totalVol = arr.reduce((s, x) => s + x.volumen, 0);

  let acumG = 0, acumV = 0;
  return arr.map(x => {
    acumG += x.ganancia;
    acumV += x.volumen;
    const catG = acumG / totalGan <= 0.8 ? 'A' : acumG / totalGan <= 0.95 ? 'B' : 'C';
    const catV = acumV / totalVol <= 0.8 ? 'A' : acumV / totalVol <= 0.95 ? 'B' : 'C';
    return { ...x, catGanancia: catG, catVolumen: catV, pctGan: totalGan > 0 ? ((x.ganancia / totalGan) * 100).toFixed(1) : 0 };
  });
}

export function detectarAnomalias(ventas, compras, ajustes) {
  const alertas = [];
  const hoy = new Date().toISOString().slice(0, 10);

  ventas.filter(v => !v.anulada && v.fecha.slice(0, 10) === hoy).forEach(v => {
    v.items.forEach(it => {
      const margen = it.precio > 0 ? ((it.precio * it.cantidad - it.costo) / (it.precio * it.cantidad)) * 100 : 0;
      if (margen < 0) alertas.push({ tipo: 'perdida', msg: `${it.nombre} vendido con perdida`, gravedad: 'alta' });
      else if (margen < 5) alertas.push({ tipo: 'margen_bajo', msg: `${it.nombre} margen ${margen.toFixed(1)}%`, gravedad: 'media' });
    });
  });

  const robos = ajustes.filter(a => a.motivo === 'robo' && a.fecha.slice(0, 7) === hoy.slice(0, 7));
  if (robos.length > 2) alertas.push({ tipo: 'robo', msg: `${robos.length} robos este mes`, gravedad: 'alta' });

  const hoyVentas = ventas.filter(v => !v.anulada && v.fecha.slice(0, 10) === hoy).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  for (let i = 1; i < hoyVentas.length; i++) {
    const diff = new Date(hoyVentas[i].fecha) - new Date(hoyVentas[i - 1].fecha);
    if (diff < 120000 && Math.abs(hoyVentas[i].total - hoyVentas[i - 1].total) < 0.01) {
      alertas.push({ tipo: 'duplicado', msg: `Venta duplicada ${hoyVentas[i].total}`, gravedad: 'media' });
    }
  }

  return alertas;
}
