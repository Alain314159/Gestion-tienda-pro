/** ================================================================
 *  MOTOR MATEMATICO NATIVO BLINDADO - Con precision decimal (big.js)
 *  ================================================================ */

import {
  toBig,
  m2,
  m3,
  toCents as moneyToCents,
  fromCents as moneyFromCents,
  toNumber,
  add,
  sub,
  mul,
  div,
  round,
  sum,
  sumWhere,
  pct,
  margin,
  eq,
  gt,
  lt,
  gte,
  lte,
  abs,
  max,
  min,
  allocate,
  toFixed,
  toString as moneyToString,
  Big,
} from './Money.js';
import { nanoid } from 'nanoid';
import Fuse from 'fuse.js';
import { parseISO, isAfter, isBefore, isSameDay, format, addDays, subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

/** Convierte cualquier valor a numero seguro. null/undefined/'' → 0
 *  ATENCION: Para calculos financieros usar Money.toBig() en lugar de n()
 */
export function n(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'string') v = parseFloat(v.replace(',', '.'));
  const num = Number(v);
  return isNaN(num) ? 0 : num;
}

/** Convierte valor monetario a centavos enteros (para almacenamiento preciso) */
export function toCents(v) {
  return moneyToCents(v);
}

/** Convierte centavos enteros a valor monetario (para display/calculos) */
export function fromCents(cents) {
  return toNumber(moneyFromCents(cents));
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


/** ================================================================ *  SAFE LOCALSTORAGE - Wrapper con try/catch para entornos restringidos *  Previene crashes en modo incognito, Safari ITP, storage lleno *  ================================================================ */ const LS_PREFIX = 'tp_'; export const safeLocalStorage = { get(key, fallback = null) { try { const val = localStorage.getItem(LS_PREFIX + key); return val !== null ? val : fallback; } catch { return fallback; } }, set(key, value) { try { localStorage.setItem(LS_PREFIX + key, String(value)); return true; } catch { return false; } }, remove(key) { try { localStorage.removeItem(LS_PREFIX + key); return true; } catch { return false; } }, getJSON(key, fallback = null) { try { const val = localStorage.getItem(LS_PREFIX + key); return val !== null ? JSON.parse(val) : fallback; } catch { return fallback; } }, setJSON(key, value) { try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); return true; } catch { return false; } }, }; /** Genera fecha actual con informacion local y UTC
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
/** Genera IDs unicos seguros usando nanoid (criptograficamente seguro, 21 chars)
 *  Reemplaza el fallback manual de crypto.randomUUID que era predecible
 */
export function genId(p = '') {
  return p + nanoid(12);
}

/** Vibracion tactil */
export function vib(ms = 20) {
  try {
    navigator.vibrate && navigator.vibrate(ms);
  } catch (e) {
    /* no-op */
  }
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

/** ================================================================
 *  BUSQUEDA FUZZY - Fuse.js (algoritmo Bitap probado, maneja typos)
 *  Reemplaza la busqueda manual con .includes() que no manejaba typos
 *  ================================================================ */

let _fuseCache = null;
let _fuseItems = null;
let _fuseGetter = null;

/** Busqueda fuzzy con Fuse.js: "detrgente" encuentra "Detergente"
 *  Maneja typos, multi-token, scoring profesional
 *  @param {Array} items - Array de objetos a buscar
 *  @param {string} query - Texto de busqueda
 *  @param {Function} getter - Funcion que extrae el texto de cada item
 *  @param {Object} options - Opciones adicionales de Fuse.js
 *  @returns {Array} - Items filtrados y ordenados por relevancia
 */
export function fuzzySearch(items, query, getter, options = {}) {
  const qry = (query || '').trim();
  if (!qry) return items;

  const fuseOptions = {
    threshold: 0.4,
    distance: 100,
    includeScore: false,
    keys: getter ? [{ getter: (item) => getter(item), name: 'text' }] : ['text'],
    ...options,
  };

  // Preparar items para Fuse (necesita objetos con la key)
  const fuseItems = getter
    ? items.map((item) => ({ item, text: getter(item) }))
    : items.map((item) => ({ item, text: item }));

  const fuse = new Fuse(fuseItems, fuseOptions);
  const results = fuse.search(qry);
  return results.map((r) => r.item.item);
}

/** Busqueda fuzzy con scoring (mejores coincidencias primero)
 *  Devuelve {item, score} donde score es 0-1 (1 = match perfecto)
 */
export function fuzzySearchScored(items, query, getter, options = {}) {
  const qry = (query || '').trim();
  if (!qry) return items.map((it) => ({ item: it, score: 0 }));

  const fuseOptions = {
    threshold: 0.4,
    distance: 100,
    includeScore: true,
    keys: getter ? [{ getter: (item) => getter(item), name: 'text' }] : ['text'],
    ...options,
  };

  const fuseItems = getter
    ? items.map((item) => ({ item, text: getter(item) }))
    : items.map((item) => ({ item, text: item }));

  const fuse = new Fuse(fuseItems, fuseOptions);
  const results = fuse.search(qry);

  // Invertir score: Fuse devuelve 0 = perfecto, 1 = peor
  // Nosotros queremos: 1 = perfecto, 0 = peor
  return results.map((r) => ({
    item: r.item.item,
    score: Math.max(0, 1 - (r.score || 0)),
  }));
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
    return (
      String(d.getDate()).padStart(2, '0') +
      '/' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '/' +
      String(d.getFullYear()).slice(2)
    );
  } catch (e) {
    return '';
  }
}

/** Formato fecha + hora */
export function fmtFH(iso) {
  try {
    const d = new Date(iso);
    return fmtFecha(iso) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  } catch (e) {
    return '';
  }
}

/** ================================================================
 *  FIFO - First In First Out (con precision decimal via big.js)
 *  ================================================================ */

/** FIFO por producto (legacy, usa calcFIFOVariante para variantes)
 *  @deprecated Usar calcFIFOVariante con varianteId
 */
export function calcFIFO(lotes, productoId, cant) {
  const lotesDisp = lotes
    .filter((l) => l.productoId === productoId && n(l.cantidadInicial) - n(l.cantidadVendida) > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1));

  let rest = cant;
  let total = new Big('0');
  const usados = [];
  for (const l of lotesDisp) {
    if (rest <= 0) break;
    const disp = n(l.cantidadInicial) - n(l.cantidadVendida);
    const usar = Math.min(disp, rest);
    total = total.plus(toBig(usar).times(toBig(l.costo)));
    usados.push({ loteId: l.id, cantidad: usar, costo: l.costo });
    rest -= usar;
  }
  if (q(rest) > 0) return { error: 'Stock insuficiente (faltan ' + q(rest).toFixed(3) + ')' };
  return { costoTotal: toNumber(total.round(2, 1)), usados };
}

/** FIFO por variante (nueva forma preferida) */
export function calcFIFOVariante(lotes, varianteId, cant) {
  const lotesDisp = lotes
    .filter((l) => l.varianteId === varianteId && n(l.cantidadInicial) - n(l.cantidadVendida) > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1));

  let rest = cant;
  let total = new Big('0');
  const usados = [];
  for (const l of lotesDisp) {
    if (rest <= 0) break;
    const disp = n(l.cantidadInicial) - n(l.cantidadVendida);
    const usar = Math.min(disp, rest);
    total = total.plus(toBig(usar).times(toBig(l.costo)));
    usados.push({ loteId: l.id, cantidad: usar, costo: l.costo });
    rest -= usar;
  }
  if (q(rest) > 0) return { error: 'Stock insuficiente (faltan ' + q(rest).toFixed(3) + ')' };
  return { costoTotal: toNumber(total.round(2, 1)), usados };
}

/** ================================================================
 *  STOCK Y VALORACION DE INVENTARIO (con precision decimal)
 *  ================================================================ */

/** Stock total de un producto (legacy, suma todas las variantes)
 *  @deprecated Usar stockVariante con varianteId
 */
export function stockProducto(lotes, productoId) {
  return lotes
    .filter((l) => l.productoId === productoId)
    .reduce((s, l) => s + Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)), 0);
}

/** Stock total de una variante especifica */
export function stockVariante(lotes, varianteId) {
  return lotes
    .filter((l) => l.varianteId === varianteId)
    .reduce((s, l) => s + Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)), 0);
}

/** Lotes activos de una variante */
export function lotesDeVariante(lotes, varianteId) {
  return lotes
    .filter((l) => l.varianteId === varianteId && n(l.cantidadInicial) - n(l.cantidadVendida) > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1));
}

/** Valor de lotes de una variante */
export function valorLotesVariante(lotes, varianteId) {
  return toNumber(
    sum(lotesDeVariante(lotes, varianteId), (l) => {
      const disp = Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida));
      return toNumber(toBig(disp).times(toBig(l.costo)));
    })
  );
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
  return toNumber(
    sum(lotes, (l) => {
      const disp = Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida));
      return toNumber(toBig(disp).times(toBig(l.costo)));
    })
  );
}

/** Lotes activos de un producto (legacy, suma todas las variantes)
 *  @deprecated Usar lotesDeVariante con varianteId
 */
export function lotesDeProducto(lotes, productoId) {
  return lotes
    .filter((l) => l.productoId === productoId && n(l.cantidadInicial) - n(l.cantidadVendida) > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1));
}

/** Valor de lotes de un producto */
export function valorLotesProducto(lotes, productoId) {
  return toNumber(
    sum(lotesDeProducto(lotes, productoId), (l) => {
      const disp = Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida));
      return toNumber(toBig(disp).times(toBig(l.costo)));
    })
  );
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
        valorTotal: new Big('0'),
      };
    }
    map[vid].lotes.push(l);
    map[vid].stockTotal += disp;
    map[vid].valorTotal = map[vid].valorTotal.plus(toBig(disp).times(toBig(l.costo)));
  }
  return Object.values(map)
    .sort((a, b) => toNumber(b.valorTotal) - toNumber(a.valorTotal))
    .map((g) => ({ ...g, valorTotal: toNumber(g.valorTotal.round(2, 1)) }));
}

/** ================================================================
 *  CAJA Y MOVIMIENTOS (con precision decimal)
 *  ================================================================ */

/** Movimientos de caja desnormalizados */
export function movimientosCaja({ cfg, capital, ventas, compras, retiros, movCaja }) {
  const arr = [];
  if (n(cfg.capitalInicial) > 0) {
    arr.push({
      id: 'ci',
      fecha: cfg.periodoInicio,
      tipo: 'ingreso',
      monto: n(cfg.capitalInicial),
      concepto: 'Capital inicial',
    });
  }
  capital.forEach((c) =>
    arr.push({
      id: c.id,
      fecha: c.fecha,
      tipo: 'ingreso',
      monto: n(c.monto),
      concepto: 'Aporte' + (c.nota ? ' · ' + c.nota : ''),
    })
  );
  ventas
    .filter((v) => !v.anulada)
    .forEach((v) =>
      arr.push({
        id: v.id,
        fecha: v.fecha,
        tipo: 'ingreso',
        monto: n(v.total),
        concepto: 'Venta',
      })
    );
  compras
    .filter((c) => !c.anulada)
    .forEach((c) =>
      arr.push({
        id: c.id,
        fecha: c.fecha,
        tipo: 'egreso',
        monto: n(c.total),
        concepto: 'Compra · ' + c.productoNombre,
      })
    );
  retiros.forEach((r) =>
    arr.push({
      id: r.id,
      fecha: r.fecha,
      tipo: 'egreso',
      monto: n(r.monto),
      concepto: 'Retiro · ' + r.concepto,
    })
  );
  movCaja.forEach((x) =>
    arr.push({
      id: x.id,
      fecha: x.fecha,
      tipo: x.tipo,
      monto: n(x.monto),
      concepto: x.concepto,
    })
  );
  return arr.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

/** Saldo de caja */
export function saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja }) {
  const aportes = toNumber(sum(capital, 'monto'));
  const vta = toNumber(sumWhere(ventas, (v) => !v.anulada, 'total'));
  const cmp = toNumber(sumWhere(compras, (c) => !c.anulada, 'total'));
  const ret = toNumber(sum(retiros, 'monto'));
  const movs = toNumber(sum(movCaja || [], (mv) => (mv.tipo === 'ingreso' ? mv.monto : -mv.monto)));
  return toNumber(add(cfg.capitalInicial || 0, aportes, vta, -cmp, -ret, movs));
}

/** Ganancia disponible para retiro
 *  Formula: ganancias netas acumuladas - retiros ya realizados
 *  Las ganancias netas incluyen: ganancias de ventas del periodo menos mermas,
 *  mas ganancias retenidas de cierres anteriores, menos retiros realizados.
 *  Nunca puede ser negativa.
 */
export function gananciaDisponible({
  cfg,
  capital,
  ventas,
  compras,
  retiros,
  movCaja,
  ajustes,
  cierres,
  lotes,
  periodoInicio,
}) {
  const ventasArr = ventas.filter((v) => !v.anulada && isoToLocal(v.fecha) >= isoToLocal(periodoInicio));
  const ganBruta = toNumber(sum(ventasArr, 'ganancia'));
  const gastosOp = toNumber(
    sumWhere(ajustes, (a) => a.cantidad < 0 && isoToLocal(a.fecha) >= isoToLocal(periodoInicio), 'costoPerdida')
  );
  const ganNeta = toNumber(sub(ganBruta, gastosOp));
  const retirosTotal = toNumber(sum(retiros, 'monto'));
  const acum = toNumber(add(sum(cierres, 'neta'), ganNeta, -retirosTotal));
  return Math.max(0, acum);
}

/** ================================================================
 *  ANALISIS Y REPORTES (con precision decimal)
 *  ================================================================ */

/** Top rentables del mes actual */
export function topRentables(ventas) {
  const now = new Date(),
    mes = now.getMonth(),
    an = now.getFullYear();
  const r = {};
  ventas
    .filter((v) => !v.anulada)
    .forEach((v) => {
      const f = new Date(v.fecha);
      if (f.getMonth() === mes && f.getFullYear() === an) {
        v.items.forEach((it) => {
          if (!r[it.productoId]) r[it.productoId] = { id: it.productoId, nombre: it.nombre, gan: new Big('0') };
          r[it.productoId].gan = r[it.productoId].gan.plus(toBig(it.ganancia));
        });
      }
    });
  return Object.values(r)
    .sort((a, b) => toNumber(b.gan) - toNumber(a.gan))
    .slice(0, 5)
    .map((x) => ({ ...x, gan: toNumber(x.gan.round(2, 1)) }));
}

/** Datos para grafica de 6 meses */
export function datosChart6Meses(ventas) {
  const meses = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const f = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push({
      m: f.getMonth(),
      y: f.getFullYear(),
      label: f.toLocaleDateString('es', { month: 'short' }),
      v: new Big('0'),
      g: new Big('0'),
    });
  }
  ventas
    .filter((v) => !v.anulada)
    .forEach((v) => {
      const f = new Date(v.fecha);
      const mes = meses.find((x) => x.m === f.getMonth() && x.y === f.getFullYear());
      if (mes) {
        mes.v = mes.v.plus(toBig(v.total));
        mes.g = mes.g.plus(toBig(v.ganancia));
      }
    });
  return meses.map((m) => ({
    ...m,
    v: toNumber(m.v.round(2, 1)),
    g: toNumber(m.g.round(2, 1)),
  }));
}

/** Reporte por periodo */
export function generarReporte({ ventas, compras, ajustes, gastosOp }, fechaInicio, fechaFin) {
  const i = new Date(fechaInicio),
    f = new Date(fechaFin);
  f.setHours(23, 59, 59);
  if (i > f) return { error: 'Fecha inicio > fin' };

  const vp = ventas.filter((v) => !v.anulada && new Date(v.fecha) >= i && new Date(v.fecha) <= f);
  const cp = (compras || []).filter((c) => !c.anulada && new Date(c.fecha) >= i && new Date(c.fecha) <= f);
  const ing = toNumber(sum(vp, 'total'));
  const cogs = toNumber(sum(vp, (v) => toNumber(sum(v.items, 'costo'))));
  const comprasTotal = toNumber(sum(cp, 'total'));
  const bruta = toNumber(sub(ing, cogs));
  const mermas = toNumber(
    sumWhere(ajustes, (a) => a.cantidad < 0 && new Date(a.fecha) >= i && new Date(a.fecha) <= f, 'costoPerdida')
  );
  const gastos = toNumber(sumWhere(gastosOp || [], (g) => new Date(g.fecha) >= i && new Date(g.fecha) <= f, 'monto'));
  const neta = toNumber(sub(bruta, add(mermas, gastos)));

  return {
    ingresos: ing,
    cogs,
    compras: comprasTotal,
    bruta,
    mermas,
    gastos,
    neta,
    numVentas: vp.length,
    margenB: ing > 0 ? toNumber(pct(bruta, ing)) : 0,
    margenN: ing > 0 ? toNumber(pct(neta, ing)) : 0,
    _vp: vp,
  };
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
  config: { fields: [], nested: { value: ['capitalInicial'] } },
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
    if (nestedPath in result && result[nestedPath] !== null) {
      if (Array.isArray(result[nestedPath])) {
        result[nestedPath] = result[nestedPath].map((item) => toCentsDeep(item, nestedFields));
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
    if (nestedPath in result && result[nestedPath] !== null) {
      if (Array.isArray(result[nestedPath])) {
        result[nestedPath] = result[nestedPath].map((item) => fromCentsDeep(item, nestedFields));
      } else if (typeof result[nestedPath] === 'object') {
        result[nestedPath] = fromCentsDeep(result[nestedPath], nestedFields);
      }
    }
  }
  return result;
}
