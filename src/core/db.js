import Dexie from 'dexie';
import { MONEY_SCHEMA, toCentsDeep, fromCentsDeep, n } from './util.js';

export const DB_NAME = 'tienda-pro-v9';

/* ================================================================
   TABLAS DE SINCRONIZACION (siempre presentes, no dependen de modulos)
   ================================================================ */

const SYNC_TABLES = {
  deviceInfo: 'id',
  syncState: '++id, [deviceId+tabla]',
  syncLog: '++id, status, timestamp',
};

/* ================================================================
   DEVICE ID — Identificador unico persistente de este dispositivo
   Usa localStorage como fuente primaria para evitar dependencia
   circular con la DB (los hooks necesitan deviceId antes de abrir).
   ================================================================ */

let _deviceId = null;

function getOrCreateDeviceId() {
  let id = null;
  try {
    id = localStorage.getItem('tienda-pro-device-id');
  } catch { /* localStorage no disponible en modo privado */ }
  if (!id) {
    const prefix = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36);
    const suffix = Math.random().toString(36).slice(2, 6);
    id = `dev-${prefix}-${ts}-${suffix}`;
    try {
      localStorage.setItem('tienda-pro-device-id', id);
    } catch { /* ignore */ }
  }
  return id;
}

/** Genera o recupera el deviceId unico de este dispositivo */
export function getDeviceId() {
  if (!_deviceId) _deviceId = getOrCreateDeviceId();
  return _deviceId;
}

/** Resetea el cache en memoria de deviceId (usado en tests) */
export function resetDeviceId() {
  _deviceId = null;
}

/** Devuelve el nombre amigable de este dispositivo */
export async function getDeviceName() {
  try {
    const db = getDB();
    const info = await db.deviceInfo.get('this');
    return info?.name || info?.deviceId || _deviceId || 'Dispositivo desconocido';
  } catch {
    return _deviceId || 'Dispositivo desconocido';
  }
}

/** Establece el nombre amigable de este dispositivo */
export async function setDeviceName(name) {
  const db = getDB();
  const info = (await db.deviceInfo.get('this')) || {};
  await db.deviceInfo.put({ ...info, id: 'this', name: String(name).trim(), deviceId: getDeviceId() });
}

/** Persiste el deviceId en la DB (llamar despues de abrirDB) */
export async function persistDeviceId() {
  const db = getDB();
  const existing = await db.deviceInfo.get('this');
  if (!existing?.deviceId) {
    await db.deviceInfo.put({ id: 'this', deviceId: getDeviceId(), createdAt: new Date().toISOString() });
  }
}

let db = null;

/* ================================================================
   MANEJO DE ERRORES DE BASE DE DATOS
   ================================================================ */

/** Detecta si un error es por almacenamiento lleno (QuotaExceeded) */
function esQuotaExceeded(err) {
  return err && (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    (err.message && err.message.toLowerCase().includes('quota')) ||
    (err.message && err.message.toLowerCase().includes('storage'))
  );
}

/** Convierte errores de DB en mensajes amigables para el usuario */
export function manejarErrorDB(err, operacion = 'operacion') {
  if (esQuotaExceeded(err)) {
    return {
      tipo: 'quota',
      mensaje: 'Almacenamiento lleno. Elimina datos antiguos o exporta un backup antes de continuar.',
      original: err
    };
  }
  if (err.name === 'VersionError' || err.name === 'UpgradeError') {
    return {
      tipo: 'version',
      mensaje: 'Error de version de base de datos. Recarga la pagina.',
      original: err
    };
  }
  if (err.name === 'OpenFailedError') {
    return {
      tipo: 'open',
      mensaje: 'No se pudo abrir la base de datos. Verifica que no haya otra pestana abierta.',
      original: err
    };
  }
  return {
    tipo: 'desconocido',
    mensaje: `Error en ${operacion}: ${err.message || err}`,
    original: err
  };
}

/** Wrapper async que captura errores de DB y los normaliza */
async function conManejoError(operacion, fn) {
  try {
    return await fn();
  } catch (err) {
    const errorNormalizado = manejarErrorDB(err, operacion);
    console.error(`[DB Error] ${operacion}:`, errorNormalizado);
    throw errorNormalizado;
  }
}

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
   MIGRACIÓN: Productos simples → Variantes de producto
   ================================================================ */

async function migrarAVariantes() {
  const cfg = await db.config.get('cfg');
  if (cfg?.value?._variantesMigrated) return;

  // Solo migrar si existen las tablas necesarias
  const hasProductos = db.tables.some(t => t.name === 'productos');
  const hasLotes = db.tables.some(t => t.name === 'lotes');
  const hasCompras = db.tables.some(t => t.name === 'compras');
  const hasVentas = db.tables.some(t => t.name === 'ventas');

  if (!hasProductos) {
    await db.config.put({
      key: 'cfg',
      value: { ...(cfg?.value || {}), _variantesMigrated: true }
    });
    return;
  }

  const productos = await db.productos.toArray();
  if (productos.length === 0) {
    await db.config.put({
      key: 'cfg',
      value: { ...(cfg?.value || {}), _variantesMigrated: true }
    });
    return;
  }

  const lotes = hasLotes ? await db.lotes.toArray() : [];
  const comprasArr = hasCompras ? await db.compras.toArray() : [];
  const ventasArr = hasVentas ? await db.ventas.toArray() : [];

  for (const p of productos) {
    const variante = {
      id: 'pv-' + p.id,
      productoId: p.id,
      nombre: p.nombre,
      codigo: p.codigo || '',
      unidad: p.unidad || '',
      precioBase: p.precio || 0,
      stockMinimo: p.stockMinimo || 5,
      archivado: p.archivado || false,
      esCaja: false,
      unidadesPorCaja: 0,
      varianteUnidadId: '',
      preciosEscalonados: [],
    };
    await db.productoVariantes.put(variante);

    for (const l of lotes) {
      if (l.productoId === p.id) {
        l.varianteId = variante.id;
        await db.lotes.put(l);
      }
    }

    for (const c of comprasArr) {
      if (c.productoId === p.id) {
        c.varianteId = variante.id;
        await db.compras.put(c);
      }
    }

    for (const v of ventasArr) {
      let cambio = false;
      for (const it of v.items || []) {
        if (it.productoId === p.id) {
          it.varianteId = variante.id;
          cambio = true;
        }
      }
      if (cambio) await db.ventas.put(v);
    }
  }

  await db.config.put({
    key: 'cfg',
    value: { ...(cfg?.value || {}), _variantesMigrated: true }
  });
}

/* ================================================================
   APERTURA / CIERRE DE BASE DE DATOS
   ================================================================ */

/** Abre la base de datos con las tablas declaradas por los módulos */
export async function abrirDB(manifiestos = []) {
  if (db) return db;

  // Precalcular deviceId antes de abrir la DB (los hooks lo necesitan)
  getDeviceId();

  db = new Dexie(DB_NAME);
  const tablas = {
    config: 'key',
    tiendas: '++id, nombre',
    socios: '++id, tiendaId',
    gastosOp: '++id, fecha, tiendaId',
    contabilidad: '++id, fecha, tipo, tiendaId',
    webhookLog: '++id, fecha',
    webhookQueue: '++id, estado, fecha',
    productoVariantes: '++id, productoId, nombre, codigo, archivado',
    ...SYNC_TABLES,
  };

  for (const m of manifiestos) {
    if (m.tablas) Object.assign(tablas, m.tablas);
  }

  const version = schemaVersion(tablas);
  db.version(version).stores(tablas);

  // Instalar hooks ANTES de abrir la DB
  installSyncHooks(db);

  await db.open();
  await migrateMoneyToCents();
  await migrarAVariantes();
  await persistDeviceId();
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
  return conManejoError(`guardar(${tabla})`, async () => {
    const db = getDB();
    const cloned = deepClone(obj);
    const converted = toCentsObj(tabla, cloned);
    return db.table(tabla).put(converted);
  });
}

/** Bulk put. Responsabilidad: clonar + convertir cada objeto a centavos + persistir en lote. */
export async function guardarBulk(tabla, objs) {
  return conManejoError(`guardarBulk(${tabla})`, async () => {
    const db = getDB();
    const converted = objs.map(o => toCentsObj(tabla, deepClone(o)));
    return db.table(tabla).bulkPut(converted);
  });
}

/** Elimina por id. Responsabilidad: eliminar. */
export async function eliminar(tabla, id) {
  return conManejoError(`eliminar(${tabla})`, async () => {
    const db = getDB();
    return db.table(tabla).delete(id);
  });
}

/** Lista todos los registros. Responsabilidad: leer + convertir de centavos a float. */
export async function listar(tabla) {
  return conManejoError(`listar(${tabla})`, async () => {
    const db = getDB();
    const items = await db.table(tabla).toArray();
    return fromCentsArray(tabla, items);
  });
}

/** Lista registros paginados. Responsabilidad: leer + convertir de centavos a float. */
export async function listarPaginado(tabla, offset = 0, limit = 50) {
  return conManejoError(`listarPaginado(${tabla})`, async () => {
    const db = getDB();
    const items = await db.table(tabla).offset(offset).limit(limit).toArray();
    return fromCentsArray(tabla, items);
  });
}

/** Cuenta registros de una tabla sin cargarlos todos. */
export async function contar(tabla) {
  return conManejoError(`contar(${tabla})`, async () => {
    const db = getDB();
    return db.table(tabla).count();
  });
}

/** Obtiene un registro por id. Responsabilidad: leer + convertir de centavos a float. */
export async function obtener(tabla, id) {
  return conManejoError(`obtener(${tabla})`, async () => {
    const db = getDB();
    const item = await db.table(tabla).get(id);
    return item ? fromCentsObj(tabla, item) : null;
  });
}

/** Limpia tabla. Responsabilidad: vaciar. */
export async function limpiar(tabla) {
  return conManejoError(`limpiar(${tabla})`, async () => {
    const db = getDB();
    return db.table(tabla).clear();
  });
}

/* ================================================================
   AGREGACIONES (para dashboards sin cargar todo en memoria)
   ================================================================ */

/** Suma un campo numerico de una tabla (en centavos, devuelve float). */
export async function sumarCampo(tabla, campo, filtro = null) {
  return conManejoError(`sumarCampo(${tabla})`, async () => {
    const db = getDB();
    let coll = db.table(tabla);
    if (filtro) coll = coll.filter(filtro);
    const items = await coll.toArray();
    return fromCentsArray(tabla, items).reduce((s, it) => s + (n(it[campo]) || 0), 0);
  });
}

/** Obtiene los N ultimos registros ordenados por fecha descendente. */
export async function ultimos(tabla, n = 5) {
  return conManejoError(`ultimos(${tabla})`, async () => {
    const db = getDB();
    const items = await db.table(tabla).orderBy('fecha').reverse().limit(n).toArray();
    return fromCentsArray(tabla, items);
  });
}

/** Obtiene registros de una fecha especifica (comparando solo YYYY-MM-DD). */
export async function porFecha(tabla, fechaIso) {
  return conManejoError(`porFecha(${tabla})`, async () => {
    const db = getDB();
    const fechaStr = fechaIso.slice(0, 10);
    const items = await db.table(tabla).filter(it => it.fecha && it.fecha.slice(0, 10) === fechaStr).toArray();
    return fromCentsArray(tabla, items);
  });
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
  return conManejoError(`leerConfig(${key})`, async () => {
    const db = getDB();
    const c = await db.config.get(key);
    if (!c) return null;
    const converted = fromCentsObj('config', deepClone(c));
    return converted.value;
  });
}

/** Guarda configuración convirtiendo float → centavos en campos monetarios anidados. */
export async function guardarConfig(key, value) {
  return guardar('config', { key, value });
}

/* ================================================================
   SINCRONIZACION — Delta Sync + Soft Deletes + Conflict Resolution
   ================================================================ */

/** Tablas que se sincronizan entre dispositivos (datos de negocio).
   Las tablas de control (config, webhook*, deviceInfo, syncState, syncLog)
   NO se sincronizan. */
export const SYNCABLE_TABLES = [
  "tiendas", "socios", "gastosOp", "contabilidad",
  "productoVariantes", "ventas", "lotes", "compras",
  "productos", "ajustes", "arqueos", "movCaja",
  "capital", "retiros", "cierres",
];

/** Verifica si una tabla es syncable */
export function esTablaSyncable(tabla) {
  return SYNCABLE_TABLES.includes(tabla);
}

/** Instala hooks Dexie en todas las tablas syncables para auto-popular
   los campos de sincronizacion: updatedAt, updatedBy, version, deletedAt.
   Se llama UNA vez en abrirDB(), antes de db.open(). */
function installSyncHooks(dbInstance) {
  const deviceId = getDeviceId();
  const now = () => new Date().toISOString();
  for (const tabla of SYNCABLE_TABLES) {
    const table = dbInstance[tabla];
    if (!table) continue;
    // Hook creating: se ejecuta al insertar un nuevo registro.
    // Si el objeto ya trae campos de sync (ej. al aplicar un delta),
    // los respetamos para no perder la metadata del origen.
    table.hook("creating", function (primKey, obj, trans) {
      if (!obj.updatedAt) obj.updatedAt = now();
      if (!obj.updatedBy) obj.updatedBy = deviceId;
      if (!obj.version) obj.version = 1;
      if (obj.deletedAt === undefined) obj.deletedAt = null;
    });
    // Hook updating: se ejecuta al actualizar un registro existente.
    // modifications contiene solo los campos que cambian.
    // Si ya vienen campos de sync (ej. delta merge), los respetamos.
    table.hook("updating", function (modifications, primKey, obj, trans) {
      if (!modifications.updatedAt) modifications.updatedAt = now();
      if (!modifications.updatedBy) modifications.updatedBy = deviceId;
      if (!modifications.version) modifications.version = (obj.version || 0) + 1;
      return modifications;
    });
  }
}

/* ================================================================
   SOFT DELETE
   ================================================================ */

/** Elimina logicamente un registro (marca deletedAt en vez de borrar fisicamente).
   Esto permite que la eliminacion se propague a otros dispositivos via sync. */
export async function eliminarLogico(tabla, id) {
  return conManejoError(`eliminarLogico(${tabla})`, async () => {
    const db = getDB();
    const existing = await db.table(tabla).get(id);
    if (!existing) return { ok: false, error: "Registro no encontrado" };
    const newVersion = (existing.version || 0) + 1;
    await db.table(tabla).update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: getDeviceId(),
      version: newVersion,
    });
    return { ok: true };
  });
}

/** Restaura un registro eliminado logicamente (quita la marca deletedAt). */
export async function restaurarLogico(tabla, id) {
  return conManejoError(`restaurarLogico(${tabla})`, async () => {
    const db = getDB();
    const existing = await db.table(tabla).get(id);
    if (!existing) return { ok: false, error: "Registro no encontrado" };
    const newVersion = (existing.version || 0) + 1;
    await db.table(tabla).update(id, {
      deletedAt: null,
      updatedAt: new Date().toISOString(),
      updatedBy: getDeviceId(),
      version: newVersion,
    });
    return { ok: true };
  });
}

/* ================================================================
   LISTADO ACTIVO (respeta soft deletes)
   ================================================================ */

/** Lista registros activos (no eliminados logicamente).
   Para tablas no syncables, comportamiento identico a listar(). */
export async function listarActivos(tabla) {
  return conManejoError(`listarActivos(${tabla})`, async () => {
    const db = getDB();
    if (!esTablaSyncable(tabla)) {
      const items = await db.table(tabla).toArray();
      return fromCentsArray(tabla, items);
    }
    const items = await db.table(tabla).filter((it) => !it.deletedAt).toArray();
    return fromCentsArray(tabla, items);
  });
}

/** Obtiene un registro activo por id. Devuelve null si no existe o esta eliminado. */
export async function obtenerActivo(tabla, id) {
  return conManejoError(`obtenerActivo(${tabla})`, async () => {
    const db = getDB();
    const item = await db.table(tabla).get(id);
    if (!item) return null;
    if (esTablaSyncable(tabla) && item.deletedAt) return null;
    return fromCentsObj(tabla, item);
  });
}

/** Cuenta registros activos (no eliminados logicamente). */
export async function contarActivos(tabla) {
  return conManejoError(`contarActivos(${tabla})`, async () => {
    const db = getDB();
    if (!esTablaSyncable(tabla)) return db.table(tabla).count();
    return db.table(tabla).filter((it) => !it.deletedAt).count();
  });
}

/* ================================================================
   DELTA SYNC — Obtener y aplicar cambios
   ================================================================ */

/** Obtiene todos los cambios de una tabla desde un punto de sync dado.
   @param {string} tabla — nombre de la tabla
   @param {string} sinceTimestamp — ISO timestamp del ultimo sync
   @param {number} sinceVersion — version del ultimo sync (tie-breaker)
   @returns {Array} — registros ordenados por updatedAt ASC, version ASC */
export async function getDeltaChanges(tabla, sinceTimestamp, sinceVersion = 0) {
  return conManejoError(`getDeltaChanges(${tabla})`, async () => {
    const db = getDB();
    const items = await db.table(tabla).toArray();
    const filtered = items.filter((it) => {
      if (!it.updatedAt) return false;
      const cmp = it.updatedAt.localeCompare(sinceTimestamp);
      return cmp > 0 || (cmp === 0 && (it.version || 0) > sinceVersion);
    });
    filtered.sort((a, b) => {
      const cmp = a.updatedAt.localeCompare(b.updatedAt);
      return cmp !== 0 ? cmp : (a.version || 0) - (b.version || 0);
    });
    return filtered;
  });
}

/** Aplica un lote de cambios delta a una tabla.
   Estrategia por defecto: Last-Write-Wins (LWW) comparando updatedAt + version.
   @param {string} tabla — nombre de la tabla
   @param {Array} changes — array de registros a aplicar
   @param {string} fromDeviceId — deviceId del remitente
   @returns {Object} — estadisticas: { inserted, updated, skipped, conflicts } */
export async function applyDeltaChanges(tabla, changes, fromDeviceId) {
  return conManejoError(`applyDeltaChanges(${tabla})`, async () => {
    const db = getDB();
    const results = { inserted: 0, updated: 0, skipped: 0, conflicts: 0 };
    if (!changes || changes.length === 0) return results;
    await db.transaction("rw", db[tabla], async (trans) => {
      for (const change of changes) {
        if (!change || !change.id) {
          results.conflicts++;
          continue;
        }
        const existing = await trans.table(tabla).get(change.id);
        if (!existing) {
          // No existe localmente: insertar directamente
          await trans.table(tabla).put(change);
          results.inserted++;
          continue;
        }
        // Existe: comparar timestamps para LWW
        const localTime = existing.updatedAt || "1970-01-01T00:00:00.000Z";
        const localVer = existing.version || 0;
        const remoteTime = change.updatedAt || "1970-01-01T00:00:00.000Z";
        const remoteVer = change.version || 0;
        const timeCmp = remoteTime.localeCompare(localTime);
        const remoteIsNewer = timeCmp > 0 || (timeCmp === 0 && remoteVer > localVer);
        if (remoteIsNewer) {
          await trans.table(tabla).put(change);
          results.updated++;
        } else {
          results.skipped++;
        }
      }
    });
    return results;
  });
}

/* ================================================================
   SYNC STATE — Rastrear el ultimo sync por dispositivo/tabla
   ================================================================ */

/** Obtiene el estado de sync para un par dispositivo+tabla.
   Si no existe, devuelve valores por defecto (epoch). */
export async function getSyncState(deviceId, tabla) {
  return conManejoError(`getSyncState`, async () => {
    const db = getDB();
    const state = await db.syncState.where({ deviceId, tabla }).first();
    return state || { deviceId, tabla, lastSyncAt: "1970-01-01T00:00:00.000Z", lastSyncVersion: 0 };
  });
}

/** Guarda o actualiza el estado de sync para un par dispositivo+tabla. */
export async function setSyncState(deviceId, tabla, lastSyncAt, lastSyncVersion) {
  return conManejoError(`setSyncState`, async () => {
    const db = getDB();
    const existing = await db.syncState.where({ deviceId, tabla }).first();
    if (existing?.id != null) {
      await db.syncState.update(existing.id, { lastSyncAt, lastSyncVersion });
    } else {
      await db.syncState.put({ deviceId, tabla, lastSyncAt, lastSyncVersion });
    }
  });
}

/** Obtiene todos los estados de sync conocidos. */
export async function getAllSyncStates() {
  return conManejoError(`getAllSyncStates`, async () => {
    const db = getDB();
    return db.syncState.toArray();
  });
}

/* ================================================================
   SYNC LOG — Cola de cambios pendientes (durable outbox)
   ================================================================ */

/** Agrega un registro al syncLog como cambio pendiente de enviar.
   Se usa cuando se detecta un cambio local que debe propagarse. */
export async function addToSyncLog(tabla, recordId, operation, recordData) {
  return conManejoError(`addToSyncLog`, async () => {
    const db = getDB();
    await db.syncLog.put({
      tabla,
      recordId,
      operation,
      recordData: deepClone(recordData),
      timestamp: new Date().toISOString(),
      sourceDevice: getDeviceId(),
      status: "pending",
      retryCount: 0,
    });
  });
}

/** Obtiene cambios pendientes del syncLog, ordenados por timestamp. */
export async function getPendingSyncLog(limit = 100) {
  return conManejoError(`getPendingSyncLog`, async () => {
    const db = getDB();
    return db.syncLog
      .where("status")
      .equals("pending")
      .limit(limit)
      .sortBy("timestamp");
  });
}

/** Marca entradas del syncLog como enviadas (sent) o confirmadas (acked). */
export async function markSyncLogStatus(recordIds, status) {
  return conManejoError(`markSyncLogStatus`, async () => {
    const db = getDB();
    await db.transaction("rw", db.syncLog, async (trans) => {
      for (const id of recordIds) {
        await trans.table("syncLog").update(id, { status });
      }
    });
  });
}

/** Limpia entradas acked antiguas del syncLog (mantenimiento). */
export async function cleanSyncLog(maxAgeDays = 7) {
  return conManejoError(`cleanSyncLog`, async () => {
    const db = getDB();
    const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString();
    const old = await db.syncLog
      .where("status")
      .equals("acked")
      .and((it) => it.timestamp < cutoff)
      .toArray();
    await db.syncLog.bulkDelete(old.map((it) => it.id));
    return old.length;
  });
}

/* ================================================================
   SCHEMA VERSION para handshake de sync
   ================================================================ */

/** Devuelve un hash del schema actual para validar compatibilidad entre dispositivos.
   Se usa en el handshake de sync: si los schemas no coinciden, se aborta. */
export async function getSyncSchemaHash() {
  const db = getDB();
  const tablas = {};
  for (const t of db.tables) {
    tablas[t.name] = t.schema.primKey.src;
  }
  const keys = Object.keys(tablas).sort();
  const schemaStr = keys.map((k) => `${k}:${tablas[k]}`).join("|");
  let hash = 0;
  for (let i = 0; i < schemaStr.length; i++) {
    const char = schemaStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/* ================================================================
   ORDEN DE DEPENDENCIAS para sync
   ================================================================ */

/** Orden en el que deben sincronizarse las tablas para respetar dependencias foreign-key.
   Las tablas padre deben syncarse antes que las hijas. */
export const SYNC_DEPENDENCY_ORDER = [
  "tiendas",        // padre: ninguno
  "socios",         // padre: tiendas
  "productos",      // padre: ninguno
  "productoVariantes", // padre: productos
  "capital",        // padre: ninguno
  "compras",        // padre: productos, variantes
  "lotes",          // padre: compras, productos, variantes
  "ajustes",        // padre: productos, variantes, lotes
  "ventas",         // padre: productos, variantes, lotes
  "retiros",        // padre: ninguno
  "arqueos",        // padre: ninguno
  "movCaja",        // padre: ninguno
  "gastosOp",       // padre: tiendas
  "contabilidad",   // padre: tiendas
  "cierres",        // padre: ninguno
  "config",         // NO syncable, pero incluido por completitud
];

/** Devuelve las tablas syncables ordenadas por dependencias. */
export function getSyncableTablesOrdered() {
  return SYNC_DEPENDENCY_ORDER.filter((t) => SYNCABLE_TABLES.includes(t));
}

/* ================================================================
   RECALCULO DE STOCK (para merge semantico de lotes)
   ================================================================ */

/** Recalcula cantidadVendida de todos los lotes basandose en ventas y ajustes.
   Esta funcion se llama despues de aplicar cambios delta para garantizar
   que el stock sea consistente sin importar el orden de llegada de los cambios. */
export async function recalcularStockLotes() {
  return conManejoError(`recalcularStockLotes`, async () => {
    const db = getDB();
    const [ventas, ajustes, lotes] = await Promise.all([
      db.ventas ? db.ventas.toArray() : Promise.resolve([]),
      db.ajustes ? db.ajustes.toArray() : Promise.resolve([]),
      db.lotes ? db.lotes.toArray() : Promise.resolve([]),
    ]);
    // Mapa: loteId -> cantidadVendida acumulada
    const vendidoPorLote = new Map();
    // Sumar ventas (solo no anuladas, no eliminadas)
    for (const v of ventas) {
      if (v.anulada || v.deletedAt) continue;
      for (const item of v.items || []) {
        for (const u of item.lotesUsados || []) {
          const actual = vendidoPorLote.get(u.loteId) || 0;
          vendidoPorLote.set(u.loteId, actual + (u.cantidad || 0));
        }
      }
    }
    // Sumar ajustes negativos (merma)
    for (const a of ajustes) {
      if (a.deletedAt) continue;
      if ((a.cantidad || 0) < 0) {
        for (const u of a.lotesUsados || []) {
          const actual = vendidoPorLote.get(u.loteId) || 0;
          vendidoPorLote.set(u.loteId, actual + Math.abs(u.cantidad || 0));
        }
      }
    }
    // Aplicar a cada lote
    const updates = [];
    for (const lote of lotes) {
      if (lote.deletedAt) continue;
      const nuevoVendido = vendidoPorLote.get(lote.id) || 0;
      if ((lote.cantidadVendida || 0) !== nuevoVendido) {
        updates.push({
          ...lote,
          cantidadVendida: nuevoVendido,
          updatedAt: new Date().toISOString(),
          updatedBy: getDeviceId(),
          version: (lote.version || 0) + 1,
        });
      }
    }
    if (updates.length > 0) {
      await db.lotes.bulkPut(updates);
    }
    return { recalculados: updates.length, totalLotes: lotes.length };
  });
}
