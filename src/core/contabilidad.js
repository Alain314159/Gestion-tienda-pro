import { n, m } from './util.js';

export function libroDiario({ ventas, compras, retiros, capital, gastosOp, ajustes }, fechaInicio, fechaFin) {
  const movs = [];
  const i = new Date(fechaInicio), f = new Date(fechaFin);
  f.setHours(23, 59, 59);

  ventas.filter(v => !v.anulada && new Date(v.fecha) >= i && new Date(v.fecha) <= f)
    .forEach(v => movs.push({ fecha: v.fecha, cuenta: 'Ventas', debe: 0, haber: v.total, doc: v.id }));
  compras.filter(c => !c.anulada && new Date(c.fecha) >= i && new Date(c.fecha) <= f)
    .forEach(c => movs.push({ fecha: c.fecha, cuenta: 'Compras', debe: c.total, haber: 0, doc: c.id }));
  retiros.filter(r => new Date(r.fecha) >= i && new Date(r.fecha) <= f)
    .forEach(r => movs.push({ fecha: r.fecha, cuenta: 'Retiros', debe: r.monto, haber: 0, doc: r.id }));
  gastosOp?.filter(g => new Date(g.fecha) >= i && new Date(g.fecha) <= f)
    .forEach(g => movs.push({ fecha: g.fecha, cuenta: g.concepto || 'Gasto', debe: g.monto, haber: 0, doc: g.id }));
  ajustes?.filter(a => new Date(a.fecha) >= i && new Date(a.fecha) <= f)
    .forEach(a => movs.push({
      fecha: a.fecha,
      cuenta: a.cantidad > 0 ? 'Ajuste positivo (sobrante)' : 'Ajuste negativo (merma)',
      debe: a.cantidad > 0 ? a.costoPerdida : 0,
      haber: a.cantidad < 0 ? a.costoPerdida : 0,
      doc: a.id
    }));

  return movs.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

export function estadoPyG({ ventas, compras, ajustes, gastosOp }, fechaInicio, fechaFin) {
  const i = new Date(fechaInicio), f = new Date(fechaFin);
  f.setHours(23, 59, 59);
  const v = ventas.filter(x => !x.anulada && new Date(x.fecha) >= i && new Date(x.fecha) <= f);
  const ing = v.reduce((s, x) => s + n(x.total), 0);
  const cogs = v.reduce((s, x) => s + x.items.reduce((ss, it) => ss + n(it.costo), 0), 0);
  const mermas = ajustes.filter(a => a.cantidad < 0 && new Date(a.fecha) >= i && new Date(a.fecha) <= f)
    .reduce((s, a) => s + n(a.costoPerdida), 0);
  const gastos = gastosOp?.filter(g => new Date(g.fecha) >= i && new Date(g.fecha) <= f)
    .reduce((s, g) => s + n(g.monto), 0) || 0;

  return {
    ingresos: m(ing),
    cogs: m(cogs),
    gananciaBruta: m(ing - cogs),
    mermas: m(mermas),
    gastosOperativos: m(gastos),
    gananciaNeta: m(ing - cogs - mermas - gastos)
  };
}

export function balanceGeneral({ cfg, capital, retiros, ventas, compras, lotes, cierres, movCaja, ajustes }) {
  const valInv = m(lotes.reduce((s, l) => {
    const disp = Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida));
    return s + (disp * n(l.costo));
  }, 0));
  const capTotal = m(n(cfg.capitalInicial || 0) + capital.reduce((s, c) => s + n(c.monto), 0));
  const vtaTotal = m(ventas.filter(v => !v.anulada).reduce((s, v) => s + n(v.total), 0));
  const compTotal = m(compras.filter(c => !c.anulada).reduce((s, c) => s + n(c.total), 0));
  const retTotal = m(retiros.reduce((s, r) => s + n(r.monto), 0));
  const ajusteTotal = m((ajustes || []).reduce((s, a) => a.cantidad > 0 ? s + n(a.costoPerdida) : s - n(a.costoPerdida), 0));
  const cajaMovs = m((movCaja || []).reduce((s, m) => m.tipo === 'ingreso' ? s + n(m.monto) : s - n(m.monto), 0));
  const cajaReal = m(capTotal + vtaTotal - compTotal - retTotal + ajusteTotal + cajaMovs);
  const ganAcum = m(cierres.reduce((s, x) => s + n(x.neta), 0));

  return {
    activos: {
      caja: cajaReal,
      inventario: valInv,
      total: m(cajaReal + valInv)
    },
    patrimonio: {
      capital: capTotal,
      gananciasRetenidas: ganAcum,
      total: m(capTotal + ganAcum)
    }
  };
}
