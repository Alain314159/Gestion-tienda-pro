/** ================================================================
 *  MOTOR MATEMÁTICO NATIVO BLINDADO
 *  ================================================================ */

/** Convierte cualquier valor a número seguro. null/undefined/'' → 0 */
export function n(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'string') v = parseFloat(v.replace(',', '.'));
  const num = Number(v);
  return isNaN(num) ? 0 : num;
}

/** Convierte valor monetario a centavos enteros (para almacenamiento preciso) */
export function toCents(v) {
  return Math.round(n(v) * 100);
}

/** Convierte centavos enteros a valor monetario (para display/cálculos) */
export function fromCents(cents) {
  return (n(cents) / 100);
}

/** Redondea a 2 decimales (moneda) */
export function m(v) {
  return Math.round(n(v) * 100) / 100;
}

/** Redondea a 3 decimales (cantidades) */
export function q(v) {
  return Math.round(n(v) * 1000) / 1000;
}

/** Genera fecha actual con informacion local y UTC
 *  @returns { iso: string, local: string, offset: number }
 */
export function nowLocal() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
  return { iso: d.toISOString(), local, offset };
}

/** Extrae fecha local (YYYY-MM-DD) de un ISO string respetando zona horaria del usuario */
export function isoToLocal(iso) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Compara si dos fechas ISO son el mismo dia en zona horaria local */
export function mismoDiaLocal(iso1, iso2) {
  return isoToLocal(iso1) === isoToLocal(iso2);
}
export function genId(p = '') {
  try {
    return p + crypto.randomUUID();
  } catch (e) {
    return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

/** Vibración táctil */
export function vib(ms = 20) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {}
}

/** Deep clone seguro usando structuredClone nativo (fallback a JSON) */
export function clean(x) {
  if (x === null || typeof x !== 'object') return x;
  try {
    return structuredClone(x);
  } catch {
    return JSON.parse(JSON.stringify(x));
  }
}

/** Debounce para inputs de busqueda */
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Formato de dinero */
export function fmt(val, moneda = '$') {
  const v = m(val);
  return moneda + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formato de cantidad (enteros sin decimales, decimales limpios) */
export function fmtCant(val, forceDecimals = false) {
  const v = n(val);
  if (Number.isInteger(v) && !forceDecimals) return v.toString();
  return v.toFixed(3).replace(/\.?0+$/, '');
}

/** Formato fecha dd/mm/yy */
export function fmtFecha(iso) {
  try {
    const d = new Date(iso);
    return String(d.getDate()).padStart(2, '0') + '/' +
           String(d.getMonth() + 1).padStart(2, '0') + '/' +
           String(d.getFullYear()).slice(2);
  } catch (e) { return ''; }
}

/** Formato fecha + hora */
export function fmtFH(iso) {
  try {
    const d = new Date(iso);
    return fmtFecha(iso) + ' ' +
           String(d.getHours()).padStart(2, '0') + ':' +
           String(d.getMinutes()).padStart(2, '0');
  } catch (e) { return ''; }
}

/** Cálculo FIFO para costo de ventas
 *  @returns { costoTotal, usados: [{loteId, cantidad, costo}] }
 */
export function calcFIFO(lotes, productoId, cant) {
  const lotesDisp = lotes
    .filter(l => l.productoId === productoId && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1));

  let rest = cant, total = 0, usados = [];
  for (const l of lotesDisp) {
    if (rest <= 0) break;
    const disp = n(l.cantidadInicial) - n(l.cantidadVendida);
    const usar = Math.min(disp, rest);
    total = m(total + (usar * n(l.costo)));
    usados.push({ loteId: l.id, cantidad: usar, costo: l.costo });
    rest -= usar;
  }
  if (rest > 0.001) return { error: 'Stock insuficiente (faltan ' + rest.toFixed(3) + ')' };
  return { costoTotal: total, usados };
}

/** Stock total de un producto */
export function stockProducto(lotes, productoId) {
  return lotes
    .filter(l => l.productoId === productoId)
    .reduce((s, l) => s + Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)), 0);
}

/** Valor del inventario */
export function valorInventario(lotes) {
  return m(lotes.reduce((s, l) => {
    const disp = Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida));
    return s + (disp * n(l.costo));
  }, 0));
}

/** Lotes activos de un producto */
export function lotesDeProducto(lotes, productoId) {
  return lotes
    .filter(l => l.productoId === productoId && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1));
}

/** Valor de lotes de un producto */
export function valorLotesProducto(lotes, productoId) {
  return m(lotesDeProducto(lotes, productoId).reduce((s, l) => {
    const disp = n(l.cantidadInicial) - n(l.cantidadVendida);
    return s + (disp * n(l.costo));
  }, 0));
}

/** Determina badge de stock */
export function badgeStock(producto, lotes) {
  const s = stockProducto(lotes, producto.id);
  if (producto.archivado) return { clase: 'arch', texto: 'ARCHIVADO' };
  if (s === 0) return { clase: 'out', texto: 'AGOTADO' };
  if (s <= n(producto.stockMinimo)) return { clase: 'low', texto: 'BAJO' };
  return { clase: 'ok', texto: 'OK' };
}

/** Agrupa inventario por producto */
export function inventarioGrupos(productos, lotes) {
  const map = {};
  const activos = lotes.filter(l => (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0);
  activos.forEach(l => {
    if (!map[l.productoId]) {
      const p = productos.find(x => x.id === l.productoId);
      map[l.productoId] = {
        productoId: l.productoId,
        nombre: l.productoNombre || (p?.nombre) || 'Desconocido',
        unidad: l.productoUnidad || (p?.unidad) || '',
        lotes: [],
        stockTotal: 0,
        valorTotal: 0
      };
    }
    const disp = n(l.cantidadInicial) - n(l.cantidadVendida);
    map[l.productoId].lotes.push(l);
    map[l.productoId].stockTotal += disp;
    map[l.productoId].valorTotal = m(map[l.productoId].valorTotal + (disp * n(l.costo)));
  });
  return Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal);
}

/** Movimientos de caja desnormalizados */
export function movimientosCaja({ cfg, capital, ventas, compras, retiros, movCaja }) {
  const arr = [];
  if (n(cfg.capitalInicial) > 0) {
    arr.push({ id: 'ci', fecha: cfg.periodoInicio, tipo: 'ingreso', monto: n(cfg.capitalInicial), concepto: 'Capital inicial' });
  }
  capital.forEach(c => arr.push({
    id: c.id, fecha: c.fecha, tipo: 'ingreso', monto: n(c.monto),
    concepto: 'Aporte' + (c.nota ? ' · ' + c.nota : '')
  }));
  ventas.filter(v => !v.anulada).forEach(v => arr.push({
    id: v.id, fecha: v.fecha, tipo: 'ingreso', monto: n(v.total), concepto: 'Venta'
  }));
  compras.filter(c => !c.anulada).forEach(c => arr.push({
    id: c.id, fecha: c.fecha, tipo: 'egreso', monto: n(c.total), concepto: 'Compra · ' + c.productoNombre
  }));
  retiros.forEach(r => arr.push({
    id: r.id, fecha: r.fecha, tipo: 'egreso', monto: n(r.monto), concepto: 'Retiro · ' + r.concepto
  }));
  movCaja.forEach(x => arr.push({
    id: x.id, fecha: x.fecha, tipo: x.tipo, monto: n(x.monto), concepto: x.concepto
  }));
  return arr.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

/** Saldo de caja */
export function saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja }) {
  const aportes = capital.reduce((s, c) => s + n(c.monto), 0);
  const vta = ventas.filter(v => !v.anulada).reduce((s, v) => s + n(v.total), 0);
  const cmp = compras.filter(c => !c.anulada).reduce((s, c) => s + n(c.total), 0);
  const ret = retiros.reduce((s, r) => s + n(r.monto), 0);
  const arq = movCaja
    .filter(mv => mv.concepto && mv.concepto.toLowerCase().includes('arqueo'))
    .reduce((s, mv) => mv.tipo === 'ingreso' ? s + n(mv.monto) : s - n(mv.monto), 0);
  return m(n(cfg.capitalInicial) + aportes + vta - cmp - ret + arq);
}

/** Ganancia disponible para retiro */
export function gananciaDisponible({ cfg, capital, ventas, compras, retiros, movCaja, ajustes, cierres, lotes, periodoInicio }) {
  const ventasArr = ventas.filter(v => !v.anulada && new Date(v.fecha) >= new Date(periodoInicio));
  const ganBruta = m(ventasArr.reduce((s, v) => s + n(v.ganancia), 0));
  const gastosOp = m(ajustes.filter(a => a.cantidad < 0 && new Date(a.fecha) >= new Date(periodoInicio))
    .reduce((s, a) => s + n(a.costoPerdida), 0));
  const ganNeta = m(ganBruta - gastosOp);
  const acum = m(cierres.reduce((s, x) => s + n(x.ganancia), 0) + ganNeta - retiros.reduce((s, r) => s + n(r.monto), 0));
  if (acum <= 0) return 0;
  const capTotal = m(n(cfg.capitalInicial) + capital.reduce((s, c) => s + n(c.monto), 0));
  const capEnCaja = Math.max(0, capTotal - valorInventario(lotes));
  const efectivoLibre = Math.max(0, saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja }) - capEnCaja);
  return Math.max(0, Math.min(acum, efectivoLibre));
}

/** Top rentables del mes actual */
export function topRentables(ventas) {
  const now = new Date(), mes = now.getMonth(), an = now.getFullYear();
  const r = {};
  ventas.filter(v => !v.anulada).forEach(v => {
    const f = new Date(v.fecha);
    if (f.getMonth() === mes && f.getFullYear() === an) {
      v.items.forEach(it => {
        if (!r[it.productoId]) r[it.productoId] = { id: it.productoId, nombre: it.nombre, gan: 0 };
        r[it.productoId].gan = m(r[it.productoId].gan + n(it.ganancia));
      });
    }
  });
  return Object.values(r).sort((a, b) => b.gan - a.gan).slice(0, 5);
}

/** Datos para gráfica de 6 meses */
export function datosChart6Meses(ventas) {
  const meses = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const f = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push({ m: f.getMonth(), y: f.getFullYear(), label: f.toLocaleDateString('es', { month: 'short' }), v: 0, g: 0 });
  }
  ventas.filter(v => !v.anulada).forEach(v => {
    const f = new Date(v.fecha);
    const mes = meses.find(x => x.m === f.getMonth() && x.y === f.getFullYear());
    if (mes) { mes.v = m(mes.v + n(v.total)); mes.g = m(mes.g + n(v.ganancia)); }
  });
  return meses;
}

/** ================================================================
 *  SCHEMA DE CAMPOS MONETARIOS (para migracion a centavos)
 *  ================================================================ */

export const MONEY_SCHEMA = {
  productos: { fields: ['precio'] },
  lotes: { fields: ['costo'] },
  ventas: { fields: ['total', 'ganancia'], nested: { items: ['precio', 'costo', 'ganancia'] } },
  compras: { fields: ['costo', 'total'] },
  ajustes: { fields: ['costoPerdida'] },
  movCaja: { fields: ['monto'] },
  arqueos: { fields: ['montoFisico', 'saldoSistema', 'diferencia'] },
  cierres: { fields: ['gananciaNeta', 'totalVentas', 'totalCompras', 'totalRetiros', 'totalGastos', 'totalAportes', 'totalAjustes', 'inventarioValor', 'capitalTotal'] },
  retiros: { fields: ['monto'] },
  capital: { fields: ['monto'] },
  gastosOp: { fields: ['monto'] },
  config: { fields: ['capitalInicial'] }
};

/** Convierte campos monetarios de un objeto a centavos (para guardar en DB) */
export function toCentsDeep(obj, fields, nested = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const field of fields) {
    if (field in result && result[field] !== null && result[field] !== undefined) {
      result[field] = toCents(result[field]);
    }
  }
  for (const [nestedPath, nestedFields] of Object.entries(nested)) {
    if (nestedPath in result && Array.isArray(result[nestedPath])) {
      result[nestedPath] = result[nestedPath].map(item => toCentsDeep(item, nestedFields));
    }
  }
  return result;
}

/** Convierte campos monetarios de un objeto de centavos a float (para leer de DB) */
export function fromCentsDeep(obj, fields, nested = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const field of fields) {
    if (field in result && result[field] !== null && result[field] !== undefined) {
      result[field] = fromCents(result[field]);
    }
  }
  for (const [nestedPath, nestedFields] of Object.entries(nested)) {
    if (nestedPath in result && Array.isArray(result[nestedPath])) {
      result[nestedPath] = result[nestedPath].map(item => fromCentsDeep(item, nestedFields));
    }
  }
  return result;
}
/** Reporte por período */
export function generarReporte({ ventas, ajustes }, fechaInicio, fechaFin) {
  const i = new Date(fechaInicio), f = new Date(fechaFin);
  f.setHours(23, 59, 59);
  if (i > f) return { error: 'Fecha inicio > fin' };

  const vp = ventas.filter(v => !v.anulada && new Date(v.fecha) >= i && new Date(v.fecha) <= f);
  const ing = m(vp.reduce((s, v) => s + n(v.total), 0));
  const cogs = m(vp.reduce((s, v) => s + v.items.reduce((ss, it) => ss + n(it.costo), 0), 0));
  const bruta = m(ing - cogs);
  const mermas = m(ajustes.filter(a => a.cantidad < 0 && new Date(a.fecha) >= i && new Date(a.fecha) <= f)
    .reduce((s, a) => s + n(a.costoPerdida), 0));
  const neta = m(bruta - mermas);

  return {
    ingresos: ing, cogs, bruta, mermas, neta,
    numVentas: vp.length,
    margenB: ing > 0 ? ((bruta / ing) * 100).toFixed(1) : '0.0',
    margenN: ing > 0 ? ((neta / ing) * 100).toFixed(1) : '0.0',
    _vp: vp
  };
}
