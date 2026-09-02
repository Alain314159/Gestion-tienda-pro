import Dexie from 'dexie';
import { MONEY_SCHEMA, toCentsDeep, fromCentsDeep, n } from './util.js';

export const DB_NAME = 'tienda-pro-v8';

let db = null;

/* ================================================================
   CLONACIÓN SEGURA
   ================================================================ */

/** Deep clone: structuredClone nativo con fallback a JSON */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}

/* ================================================================
   CONVERSIÓN MONETARIA (centavos <-> float)
   Cada función tiene UNA sola responsabilidad.
   ================================================================ */

/** Obtiene la configuración de campos monetarios para una tabla */
function getMoneyConfig(tabla) {
  return MONEY_SCHEMA[tabla] || null;
}

/** Convierte un objeto de float a centavos ANTES de guardar */
function toCentsObj(tabla, obj) {
  const cfg = getMoneyConfig(tabla);
  return cfg ? toCentsDeep(obj, cfg.fields, cfg.nested || {}) : obj;
}

/** Convierte un objeto de centavos a float DESPUÉS de leer */
function fromCentsObj(tabla, obj) {
  const cfg = getMoneyConfig(tabla);
  return cfg ? fromCentsDeep(obj, cfg.fields, cfg.nested || {}) : obj;
}

/** Convierte un array de objetos de centavos a float */
function fromCentsArray(tabla, arr) {
  const cfg = getMoneyConfig(tabla);
  return cfg ? arr.map(o => fromCentsDeep(o, cfg.fields, cfg.nested || {})) : arr;
}

/* ================================================================
   VERSIONADO DE SCHEMA
   ================================================================ */

/** Genera un número de versión estable a partir del schema */
function schemaVersion(tablas) {
  const keys = Object.keys(tablas).sort();
  const schemaStr = keys.map(k => `${k}:${tablas[k]}`).join('|');
  let hash = 0;
  for (let i = 0; i < schemaStr.length; i++) {
    const char = schemaStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100000 + 1;
}

/* ================================================================
   MIGRACIÓN DE DATOS EXISTENTES (una sola vez)
   ================================================================ */

/** Migra datos existentes de floats a centavos. Idempotente. */
async function migrateMoneyToCents() {
  const cfg = await db.config.get('cfg');
  if (cfg?.value?._moneyMigrated) return;

  for (const [tabla, config] of Object.entries(MONEY_SCHEMA)) {
    if (!db.tables.some(t => t.name === tabla)) continue;
    const items = await db.table(tabla).toArray();
    if (items.length === 0) continue;

    const converted = items.map(obj => toCentsDeep(obj, config.fields, config.nested || {}));
    await db.table(tabla).bulkPut(converted);
  }

  await db.config.put({
    key: 'cfg',
    value: { ...(cfg?.value || {}), _moneyMigrated: true }
  });
}

/* ================================================================
   APERTURA / CIERRE DE BASE DE DATOS
   ================================================================ */

/** Abre la base de datos con las tablas declaradas por los módulos */
export async function abrirDB(manifiestos = []) {
  if (db) return db;

  db = new Dexie(DB_NAME);
  const tablas = {
    config: 'key',
    tiendas: '++id, nombre',
    socios: '++id, tiendaId',
    gastosOp: '++id, fecha, tiendaId',
    contabilidad: '++id, fecha, tipo, tiendaId',
    webhookLog: '++id, fecha',
    webhookQueue: '++id, estado, fecha'
  };

  for (const m of manifiestos) {
    if (m.tablas) Object.assign(tablas, m.tablas);
  }

  const version = schemaVersion(tablas);
  db.version(version).stores(tablas);

  await db.open();
  await migrateMoneyToCents();
  return db;
}

export function getDB() {
  if (!db) throw new Error('Base de datos no inicializada. Llama a abrirDB() primero.');
  return db;
}

export async function cerrarDB() {
  if (db) {
    await db.close();
    db = null;
  }
}

/* ================================================================
   OPERACIONES CRUD CON CONVERSIÓN MONETARIA EXPLÍCITA
   Cada función hace UNA sola cosa.
   ================================================================ */

/** Guarda un objeto. Responsabilidad: clonar + convertir a centavos + persistir. */
export async function guardar(tabla, obj) {
  const db = getDB();
  const cloned = deepClone(obj);
  const converted = toCentsObj(tabla, cloned);
  return db.table(tabla).put(converted);
}

/** Bulk put. Responsabilidad: clonar + convertir cada objeto a centavos + persistir en lote. */
export async function guardarBulk(tabla, objs) {
  const db = getDB();
  const converted = objs.map(o => toCentsObj(tabla, deepClone(o)));
  return db.table(tabla).bulkPut(converted);
}

/** Elimina por id. Responsabilidad: eliminar. */
export async function eliminar(tabla, id) {
  const db = getDB();
  return db.table(tabla).delete(id);
}

/** Lista todos los registros. Responsabilidad: leer + convertir de centavos a float. */
export async function listar(tabla) {
  const db = getDB();
  const items = await db.table(tabla).toArray();
  return fromCentsArray(tabla, items);
}

/** Lista registros paginados. Responsabilidad: leer + convertir de centavos a float. */
export async function listarPaginado(tabla, offset = 0, limit = 50) {
  const db = getDB();
  const items = await db.table(tabla).offset(offset).limit(limit).toArray();
  return fromCentsArray(tabla, items);
}

/** Cuenta registros de una tabla sin cargarlos todos. */
export async function contar(tabla) {
  const db = getDB();
  return db.table(tabla).count();
}

/** Obtiene un registro por id. Responsabilidad: leer + convertir de centavos a float. */
export async function obtener(tabla, id) {
  const db = getDB();
  const item = await db.table(tabla).get(id);
  return item ? fromCentsObj(tabla, item) : null;
}

/** Limpia tabla. Responsabilidad: vaciar. */
export async function limpiar(tabla) {
  const db = getDB();
  return db.table(tabla).clear();
}

/* ================================================================
   AGREGACIONES (para dashboards sin cargar todo en memoria)
   ================================================================ */

/** Suma un campo numerico de una tabla (en centavos, devuelve float). */
export async function sumarCampo(tabla, campo, filtro = null) {
  const db = getDB();
  let coll = db.table(tabla);
  if (filtro) coll = coll.filter(filtro);
  const items = await coll.toArray();
  return fromCentsArray(tabla, items).reduce((s, it) => s + (n(it[campo]) || 0), 0);
}

/** Obtiene los N ultimos registros ordenados por fecha descendente. */
export async function ultimos(tabla, n = 5) {
  const db = getDB();
  const items = await db.table(tabla).orderBy('fecha').reverse().limit(n).toArray();
  return fromCentsArray(tabla, items);
}

/** Obtiene registros de una fecha especifica (comparando solo YYYY-MM-DD). */
export async function porFecha(tabla, fechaIso) {
  const db = getDB();
  const fechaStr = fechaIso.slice(0, 10);
  const items = await db.table(tabla).filter(it => it.fecha && it.fecha.slice(0, 10) === fechaStr).toArray();
  return fromCentsArray(tabla, items);
}

/* ================================================================
   OPERACIONES DENTRO DE TRANSACCIONES DEXIE
   Misma responsabilidad que las funciones CRUD pero dentro de tx.
   ================================================================ */

/** Guarda un objeto dentro de una transacción Dexie. Responsabilidad: clonar + convertir a centavos + persistir vía trans. */
export function txPut(tabla, obj, trans) {
  const cloned = deepClone(obj);
  const converted = toCentsObj(tabla, cloned);
  return trans.table(tabla).put(converted);
}

/** Bulk put dentro de una transacción Dexie. */
export function txBulkPut(tabla, objs, trans) {
  const converted = objs.map(o => toCentsObj(tabla, deepClone(o)));
  return trans.table(tabla).bulkPut(converted);
}

/** Obtiene un registro por id dentro de una transacción, con conversión de centavos a float. */
export async function txGet(tabla, id, trans) {
  const item = await trans.table(tabla).get(id);
  return item ? fromCentsObj(tabla, item) : null;
}

/** Lista todos los registros de una tabla dentro de una transacción, con conversión de centavos a float. */
export async function txToArray(tabla, trans) {
  const items = await trans.table(tabla).toArray();
  return fromCentsArray(tabla, items);
}

/* ================================================================
   CONFIGURACIÓN (wrapper con conversión monetaria)
   ================================================================ */

/** Lee configuración por clave y convierte centavos → float. Devuelve el objeto value. */
export async function leerConfig(key = 'cfg') {
  const db = getDB();
  const c = await db.config.get(key);
  if (!c) return null;
  const converted = fromCentsObj('config', deepClone(c));
  return converted.value;
}

/** Guarda configuración convirtiendo float → centavos en campos monetarios anidados. */
export async function guardarConfig(key, value) {
  return guardar('config', { key, value });
}
