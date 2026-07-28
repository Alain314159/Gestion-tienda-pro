// ================================================================
// DB.JS - Motor de Base de Datos Local y Matemática Blindada
// ================================================================

// Motor Matemático en Enteros (Centavos) - Cero errores de redondeo
const m = v => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'string') v = parseFloat(v.replace(',', '.'));
  const num = Number(v);
  if (isNaN(num)) return 0;
  return Math.round(num * 100); // Convierte $1.50 a 150
};
const mFmt = cents => (cents / 100); // Devuelve a decimal para mostrar

// Motor para Cantidades de Inventario (3 decimales)
const q = v => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'string') v = parseFloat(v.replace(',', '.'));
  const num = Number(v);
  if (isNaN(num)) return 0;
  return Math.round(num * 1000) / 1000;
};

const db = new Dexie('TiendaProDB_v2');

db.version(1).stores({
  tiendas: 'id',
  perfiles: 'id, tienda_id, username, rol, activo',
  sesiones: 'id, tienda_id, usuario_id',
  productos: 'id, tienda_id, nombre, codigo, archivado, updated_at',
  lotes: 'id, tienda_id, producto_id, compra_id, fecha',
  ventas: 'id, tienda_id, usuario_id, fecha, anulada, sync_flag',
  compras: 'id, tienda_id, producto_id, fecha, anulada, sync_flag',
  ajustes: 'id, tienda_id, producto_id, fecha, sync_flag',
  arqueos: 'id, tienda_id, fecha, sync_flag',
  mov_caja: 'id, tienda_id, fecha, tipo, sync_flag',
  cierres: 'id, tienda_id, fecha_cierre, sync_flag',
  capital: 'id, tienda_id, fecha, sync_flag',
  retiros: 'id, tienda_id, fecha, sync_flag',
  gastos: 'id, tienda_id, fecha, sync_flag',
  bitacora: 'id, tienda_id, usuario_id, fecha'
});

function clean(x) { return JSON.parse(JSON.stringify(x)); }
function P(store, obj) { return store.put(clean(obj)); }