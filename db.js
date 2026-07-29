// ================================================================
// DB.JS - Dexie + Motor Matemático Blindado (Fase 2)
// ================================================================

// --- Motor matemático ---
// Convertir a número robusto (maneja coma como decimal y nulls)
const n = v => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'string') v = parseFloat(v.replace(',', '.'));
  const num = Number(v);
  return isNaN(num) ? 0 : num;
};
// Dinero (2 decimales)
const m = v => Math.round(n(v) * 100) / 100;
// Cantidades (3 decimales, para kg/lb/etc)
const q = v => Math.round(n(v) * 1000) / 1000;
// Convertir de centavos/3-decimales a número normal para mostrar
const mFmt = v => n(v);
const qFmt = v => n(v);

// --- Base de datos IndexedDB ---
const db = new Dexie('TiendaProDB_v2');

// Esquema:
// - Campos primary key primero
// - Índices secundarios después
// - `sync_flag`: 0 = pendiente subir a nube, 1 = sincronizado
// - `tienda_id` en TODAS las tablas para multi-tienda
// - `updated_at` para resolución de conflictos por timestamp
db.version(1).stores({
  tiendas:        'id',
  perfiles:       'id, tienda_id, username, rol, activo, updated_at',
  productos:      'id, tienda_id, nombre, codigo, archivado, updated_at',
  variantes:      'id, tienda_id, producto_id, updated_at',
  lotes:          'id, tienda_id, producto_id, compra_id, fecha, updated_at',
  ventas:         'id, tienda_id, fecha, anulada, sync_flag, updated_at',
  compras:        'id, tienda_id, producto_id, fecha, anulada, sync_flag, updated_at',
  ajustes:        'id, tienda_id, producto_id, fecha, sync_flag, updated_at',
  arqueos:        'id, tienda_id, fecha, sync_flag, updated_at',
  mov_caja:       'id, tienda_id, fecha, tipo, sync_flag, updated_at',
  cierres:        'id, tienda_id, fecha_cierre, sync_flag, updated_at',
  capital:        'id, tienda_id, fecha, sync_flag, updated_at',
  retiros:        'id, tienda_id, fecha, sync_flag, updated_at',
  gastos:         'id, tienda_id, fecha, sync_flag, updated_at',
  bitacora:       'id, tienda_id, usuario_id, fecha',
  config:         'key'
});

// --- Utilidades ---
function genId(p='') {
  try { return p + crypto.randomUUID(); }
  catch(e) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2,10); }
}

function vib(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch(e) {} }

function clean(x) { return JSON.parse(JSON.stringify(x)); }

// Put "limpio" para que Vue no reactive-proxy IndexedDB
function P(store, obj) { return store.put(clean(obj)); }

// Marcar registro como pendiente de sincronizar
function marcarPendiente(record) {
  record.sync_flag = 0;
  record.updated_at = new Date().toISOString();
  return record;
}

// Exponer globalmente
window.db = db;
window.n = n;
window.m = m;
window.q = q;
window.mFmt = mFmt;
window.qFmt = qFmt;
window.genId = genId;
window.vib = vib;
window.clean = clean;
window.P = P;
window.marcarPendiente = marcarPendiente;
