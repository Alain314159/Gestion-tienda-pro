import { n, m, saldoCaja, isoToLocal } from './util.js';

function enRango(fechaIso, inicio, fin) {
  const f = isoToLocal(fechaIso);
  const i = isoToLocal(inicio);
  const fn = isoToLocal(fin);
  return f >= i && f <= fn;
}

export function libroDiario({ ventas, compras, retiros, capital, gastosOp, ajustes }, fechaInicio, fechaFin) {
  const movs = [];

  // Ventas: Caja (Debe) + Ventas (Haber)
  ventas
    .filter((v) => !v.anulada && enRango(v.fecha, fechaInicio, fechaFin))
    .forEach((v) => {
      movs.push({ fecha: v.fecha, cuenta: 'Caja', debe: v.total, haber: 0, doc: v.id, tipo: 'venta' });
      movs.push({ fecha: v.fecha, cuenta: 'Ventas', debe: 0, haber: v.total, doc: v.id, tipo: 'venta' });
    });

  // Compras: Compras (Debe) + Caja (Haber)
  compras
    .filter((c) => !c.anulada && enRango(c.fecha, fechaInicio, fechaFin))
    .forEach((c) => {
      movs.push({ fecha: c.fecha, cuenta: 'Compras', debe: c.total, haber: 0, doc: c.id, tipo: 'compra' });
      movs.push({ fecha: c.fecha, cuenta: 'Caja', debe: 0, haber: c.total, doc: c.id, tipo: 'compra' });
    });

  // Retiros: Retiros (Debe) + Caja (Haber)
  retiros
    .filter((r) => enRango(r.fecha, fechaInicio, fechaFin))
    .forEach((r) => {
      movs.push({ fecha: r.fecha, cuenta: 'Retiros', debe: r.monto, haber: 0, doc: r.id, tipo: 'retiro' });
      movs.push({ fecha: r.fecha, cuenta: 'Caja', debe: 0, haber: r.monto, doc: r.id, tipo: 'retiro' });
    });

  // Capital: Caja (Debe) + Capital (Haber)
  capital
    .filter((c) => enRango(c.fecha, fechaInicio, fechaFin))
    .forEach((c) => {
      movs.push({ fecha: c.fecha, cuenta: 'Caja', debe: c.monto, haber: 0, doc: c.id, tipo: 'capital' });
      movs.push({ fecha: c.fecha, cuenta: 'Capital', debe: 0, haber: c.monto, doc: c.id, tipo: 'capital' });
    });

  // Gastos operativos: Gasto (Debe) + Caja (Haber)
  gastosOp
    ?.filter((g) => enRango(g.fecha, fechaInicio, fechaFin))
    .forEach((g) => {
      movs.push({ fecha: g.fecha, cuenta: g.concepto || 'Gasto', debe: g.monto, haber: 0, doc: g.id, tipo: 'gasto' });
      movs.push({ fecha: g.fecha, cuenta: 'Caja', debe: 0, haber: g.monto, doc: g.id, tipo: 'gasto' });
    });

  // Ajustes
  ajustes
    ?.filter((a) => enRango(a.fecha, fechaInicio, fechaFin))
    .forEach((a) => {
      if (a.cantidad < 0) {
        // Ajuste negativo: Merma (Debe) + Inventario (Haber)
        movs.push({ fecha: a.fecha, cuenta: 'Merma', debe: n(a.costoPerdida), haber: 0, doc: a.id, tipo: 'ajuste' });
        movs.push({
          fecha: a.fecha,
          cuenta: 'Inventario',
          debe: 0,
          haber: n(a.costoPerdida),
          doc: a.id,
          tipo: 'ajuste',
        });
      } else {
        // Ajuste positivo: Inventario (Debe) + AjustePositivo (Haber)
        movs.push({
          fecha: a.fecha,
          cuenta: 'Inventario',
          debe: n(a.costoPerdida),
          haber: 0,
          doc: a.id,
          tipo: 'ajuste',
        });
        movs.push({
          fecha: a.fecha,
          cuenta: 'Ajuste positivo (sobrante)',
          debe: 0,
          haber: n(a.costoPerdida),
          doc: a.id,
          tipo: 'ajuste',
        });
      }
    });

  return movs.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

export function estadoPyG({ ventas, compras, ajustes, gastosOp }, fechaInicio, fechaFin) {
  const v = ventas.filter((x) => !x.anulada && enRango(x.fecha, fechaInicio, fechaFin));
  const ing = v.reduce((s, x) => s + n(x.total), 0);
  const cogs = v.reduce((s, x) => s + x.items.reduce((ss, it) => ss + n(it.costo), 0), 0);
  const mermas = ajustes
    .filter((a) => a.cantidad < 0 && enRango(a.fecha, fechaInicio, fechaFin))
    .reduce((s, a) => s + n(a.costoPerdida), 0);
  const sobrantes = ajustes
    .filter((a) => a.cantidad > 0 && enRango(a.fecha, fechaInicio, fechaFin))
    .reduce((s, a) => s + n(a.costoPerdida), 0);
  const gastos =
    gastosOp?.filter((g) => enRango(g.fecha, fechaInicio, fechaFin)).reduce((s, g) => s + n(g.monto), 0) || 0;

  return {
    ingresos: m(ing),
    cogs: m(cogs),
    gananciaBruta: m(ing - cogs + sobrantes),
    mermas: m(mermas),
    sobrantes: m(sobrantes),
    gastosOperativos: m(gastos),
    gananciaNeta: m(ing - cogs + sobrantes - mermas - gastos),
  };
}

export function balanceGeneral({
  cfg,
  capital,
  retiros,
  ventas,
  compras,
  lotes,
  cierres,
  movCaja,
  ajustes,
  pasivos = [],
}) {
  const valInv = m(
    lotes.reduce((s, l) => {
      const disp = Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida));
      return s + disp * n(l.costo);
    }, 0)
  );
  const capTotal = m(n(cfg.capitalInicial || 0) + capital.reduce((s, c) => s + n(c.monto), 0));
  const cajaReal = saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja });
  const ganAcum = m(cierres.reduce((s, x) => s + n(x.neta), 0));
  const pasivosTotal = m(pasivos.reduce((s, p) => s + n(p.monto), 0));

  const activosTotal = m(cajaReal + valInv);
  const patrimonioTotal = m(capTotal + ganAcum);

  return {
    activos: {
      caja: cajaReal,
      inventario: valInv,
      total: activosTotal,
    },
    pasivos: {
      total: pasivosTotal,
      items: pasivos,
    },
    patrimonio: {
      capital: capTotal,
      gananciasRetenidas: ganAcum,
      total: patrimonioTotal,
    },
    cuadra: m(activosTotal) === m(patrimonioTotal + pasivosTotal),
  };
}
