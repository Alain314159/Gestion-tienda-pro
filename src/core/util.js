/** ================================================================
 *  MOTOR MATEMÁTICO NATIVO BLINDADO
 *  ================================================================ */
\
import { toBig, m2, m3, toCents as moneyToCents, fromCents as moneyFromCents, toNumber, add, sub, mul, div, round, sum, sumWhere, pct, margin, eq, gt, lt, gte, lte, abs, max, min, allocate, toFixed, toString as moneyToString } from './Money.js';

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

/** Redondea a 2 decimales (moneda) - usa big.js para precision exacta */
export function m(v) {
  return toNumber(m2(v));
}

/** Redondea a 3 decimales (cantidades) - usa big.js para precision exacta */
export function q(v) {
  return toNumber(m3(v));
}

/** ================================================================
 *  UTILIDADES DE SEGURIDAD
 *  ================================================================ */

/** Escapa caracteres HTML para prevenir XSS */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Valida que una URL de webhook sea segura (HTTPS, no localhost) */
export function validateWebhookUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return { ok: false, error: 'Solo se permiten URLs HTTPS' };
    const hostname = u.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      return { ok: false, error: 'No se permiten URLs de red local' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'URL invalida' };
  }
}

/** Genera fecha actual con informacion local y UTC
 *  Usa toLocaleDateString('sv-SE') para evitar bugs de DST y zona horaria
 *  @returns { iso: string, local: string, offset: number }
 */
export function nowLocal() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = d.toLocaleDateString('sv-SE', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  return { iso: d.toISOString(), local, offset };
}

/** Extrae fecha local (YYYY-MM-DD) de un ISO string respetando zona horaria del usuario */
export function isoToLocal(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('sv-SE', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
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

/** Búsqueda fuzzy: "det 1kg" encuentra "Detergente 1kg"
 *  Cada token del query debe aparecer en alguna parte del texto
 */
export function fuzzySearch(items, query, getter) {
  const qry = (query || '').toLowerCase().trim();
  if (!qry) return items;
  const tokens = qry.split(/\s+/).filter(t => t.length > 0);
  return items.filter(item => {
    const text = (getter ? getter(item) : item).toLowerCase();
    return tokens.every(t => text.includes(t));
  });
}

/** Búsqueda fuzzy con scoring (mejores coincidencias primero) */
export function fuzzySearchScored(items, query, getter) {
  const qry = (query || '').toLowerCase().trim();
  if (!qry) return items.map(it => ({ item: it, score: 0 }));
  const tokens = qry.split(/\s+/).filter(t => t.length > 0);
  const scored = items.map(item => {
    const text = (getter ? getter(item) : item).toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (text.startsWith(t)) score += 3;
      else if (text.includes(' ' + t)) score += 2;
      else if (text.includes(t)) score += 1;
    }
    return { item, score };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
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

/** FIFO por producto (legacy, usa calcFIFOVariante para variantes)
 *  @deprecated Usar calcFIFOVariante con varianteId
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
  if (q(rest) > 0) return { error: 'Stock insuficiente (faltan ' + q(rest).toFixed(3) + ')' };
  return { costoTotal: total, usados };
}

/** FIFO por variante (nueva forma preferida) */
export function calcFIFOVariante(lotes, varianteId, cant) {
  const lotesDisp = lotes
    .filter(l => l.varianteId === varianteId && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0)
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
  if (q(rest) > 0) return { error: 'Stock insuficiente (faltan ' + q(rest).toFixed(3) + ')' };
  return { costoTotal: total, usados };
}

/** Stock total de un producto (legacy, suma todas las variantes)
 *  @deprecated Usar stockVariante con varianteId
 */
export function stockProducto(lotes, productoId) {
  return lotes
    .filter(l => l.productoId === productoId)
    .reduce((s, l) => s + Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)), 0);
}

/** Stock total de una variante específica */
export function stockVariante(lotes, varianteId) {
  return lotes
    .filter(l => l.varianteId === varianteId)
    .reduce((s, l) => s + Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)), 0);
}

/** Lotes activos de una variante */
export function lotesDeVariante(lotes, varianteId) {
  return lotes
    .filter(l => l.varianteId === varianteId && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1));
}

/** Valor de lotes de una variante */
export function valorLotesVariante(lotes, varianteId) {
  return m(lotesDeVariante(lotes, varianteId).reduce((s, l) => {
    const disp = n(l.cantidadInicial) - n(l.cantidadVendida);
    return s + (disp * n(l.costo));
  }, 0));
}

/** Badge de stock para una variante */
export function badgeStockVariante(variante, lotes) {
  const s = stockVariante(lotes, variante.id);
  if (variante.archivado) return { clase: 'arch', texto: 'ARCHIVADO' };
  if (s === 0) return { clase: 'out', texto: 'AGOTADO' };
  if (s <= n(variante.stockMinimo)) return { clase: 'low', texto: 'BAJO' };
  return { clase: 'ok', texto: 'OK' };
}

/** Valor del inventario */
export function valorInventario(lotes) {
  return m(lotes.reduce((s, l) => {
    const disp = Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida));
    return s + (disp * n(l.costo));
  }, 0));
}

/** Lotes activos de un producto (legacy, suma todas las variantes)
 *  @deprecated Usar lotesDeVariante con varianteId
 */
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

/** Agrupa inventario por variante (optimizado: O(n+m) con Map)
 *  Muestra stock separado por cada presentacion del producto
 */
export function inventarioGrupos(productos, variantes, lotes) {
  const varMap = new Map();
  for (const v of variantes) {
    varMap.set(v.id, { nombre: v.nombre, unidad: v.unidad, productoId: v.productoId });
  }
  const prodMap = new Map();
  for (const p of productos) {
    prodMap.set(p.id, p.nombre);
  }
  const map = {};
  for (const l of lotes) {
    const disp = n(l.cantidadInicial) - n(l.cantidadVendida);
    if (disp <= 0) continue;
    const vid = l.varianteId || l.productoId;
    if (!map[vid]) {
      const v = varMap.get(vid);
      const pName = prodMap.get(l.productoId) || l.productoNombre || 'Desconocido';
      map[vid] = {
        varianteId: vid,
        productoId: l.productoId,
        nombre: v?.nombre || l.productoNombre || pName,
        nombreBase: pName,
        unidad: v?.unidad || l.productoUnidad || '',
        lotes: [],
        stockTotal: 0,
        valorTotal: 0
      };
    }
    map[vid].lotes.push(l);
    map[vid].stockTotal += disp;
    map[vid].valorTotal = m(map[vid].valorTotal + (disp * n(l.costo)));
  }
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
  const movs = (movCaja || []).reduce((s, mv) => mv.tipo === 'ingreso' ? s + n(mv.monto) : s - n(mv.monto), 0);
  return m(n(cfg.capitalInicial) + aportes + vta - cmp - ret + movs);
}

/** Ganancia disponible para retiro
 *  Formula: min(ganancias acumuladas, efectivo en caja que excede el capital)
 *  El capital debe permanecer en el negocio (caja + inventario).
 *  Solo se puede retirar el excedente de efectivo sobre el capital,
 *  limitado por las ganancias reales acumuladas.
 */
export function gananciaDisponible({ cfg, capital, ventas, compras, retiros, movCaja, ajustes, cierres, lotes, periodoInicio }) {
  const ventasArr = ventas.filter(v => !v.anulada && isoToLocal(v.fecha) >= isoToLocal(periodoInicio));
  const ganBruta = m(ventasArr.reduce((s, v) => s + n(v.ganancia), 0));
  const gastosOp = m(ajustes.filter(a => a.cantidad < 0 && isoToLocal(a.fecha) >= isoToLocal(periodoInicio))
    .reduce((s, a) => s + n(a.costoPerdida), 0));
  const ganNeta = m(ganBruta - gastosOp);
  const retirosTotal = retiros.reduce((s, r) => s + n(r.monto), 0);
  const acum = m(cierres.reduce((s, x) => s + n(x.neta), 0) + ganNeta - retirosTotal);
  if (acum <= 0) return 0;
  const capTotal = m(n(cfg.capitalInicial) + capital.reduce((s, c) => s + n(c.monto), 0));
  const valInv = valorInventario(lotes);
  const saldo = saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja });
  // El capital debe cubrir: inventario + parte de caja
  // Efectivo libre = lo que sobra en caja despues de reservar el capital
  // Si el inventario ya cubre parte del capital, esa parte no necesita estar en caja
  const capReservadoEnCaja = Math.max(0, capTotal - valInv);
  const efectivoLibre = Math.max(0, saldo - capReservadoEnCaja);
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
  productoVariantes: { fields: ['precioBase'] },
  lotes: { fields: ['costo'] },
  ventas: { fields: ['total', 'ganancia'], nested: { items: ['precio', 'costo', 'ganancia'] } },
  compras: { fields: ['costo', 'total'] },
  ajustes: { fields: ['costoPerdida'] },
  movCaja: { fields: ['monto'] },
  arqueos: { fields: ['montoFisico', 'saldoSistema', 'diferencia'] },
  cierres: { fields: ['ingresos', 'cogs', 'bruta', 'mermas', 'gastos', 'neta'] },
  retiros: { fields: ['monto'] },
  capital: { fields: ['monto'] },
  gastosOp: { fields: ['monto'] },
  config: { fields: [], nested: { value: ['capitalInicial'] } }
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
    if (nestedPath in result && result[nestedPath] != null) {
      if (Array.isArray(result[nestedPath])) {
        result[nestedPath] = result[nestedPath].map(item => toCentsDeep(item, nestedFields));
      } else if (typeof result[nestedPath] === 'object') {
        result[nestedPath] = toCentsDeep(result[nestedPath], nestedFields);
      }
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
    if (nestedPath in result && result[nestedPath] != null) {
      if (Array.isArray(result[nestedPath])) {
        result[nestedPath] = result[nestedPath].map(item => fromCentsDeep(item, nestedFields));
      } else if (typeof result[nestedPath] === 'object') {
        result[nestedPath] = fromCentsDeep(result[nestedPath], nestedFields);
      }
    }
  }
  return result;
}
/** Reporte por período */
export function generarReporte({ ventas, ajustes, gastosOp }, fechaInicio, fechaFin) {
  const i = new Date(fechaInicio), f = new Date(fechaFin);
  f.setHours(23, 59, 59);
  if (i > f) return { error: 'Fecha inicio > fin' };

  const vp = ventas.filter(v => !v.anulada && new Date(v.fecha) >= i && new Date(v.fecha) <= f);
  const ing = m(vp.reduce((s, v) => s + n(v.total), 0));
  const cogs = m(vp.reduce((s, v) => s + v.items.reduce((ss, it) => ss + n(it.costo), 0), 0));
  const bruta = m(ing - cogs);
  const mermas = m(ajustes.filter(a => a.cantidad < 0 && new Date(a.fecha) >= i && new Date(a.fecha) <= f)
    .reduce((s, a) => s + n(a.costoPerdida), 0));
  const gastos = m((gastosOp || []).filter(g => new Date(g.fecha) >= i && new Date(g.fecha) <= f)
    .reduce((s, g) => s + n(g.monto), 0));
  const neta = m(bruta - mermas - gastos);

  return {
    ingresos: ing, cogs, bruta, mermas, gastos, neta,
    numVentas: vp.length,
    margenB: ing > 0 ? m((bruta / ing) * 100) : 0,
    margenN: ing > 0 ? m((neta / ing) * 100) : 0,
    _vp: vp
  };
}
