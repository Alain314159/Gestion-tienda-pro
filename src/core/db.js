import Dexie from 'dexie';

export const DB_NAME = 'tienda-pro-v7';

let db = null;

/** Abre la base de datos con las tablas declaradas por los módulos */
export function abrirDB(manifiestos = []) {
  if (db) return db;

  db = new Dexie(DB_NAME);
  const tablas = { config: 'key' };

  for (const m of manifiestos) {
    if (m.tablas) Object.assign(tablas, m.tablas);
  }

  db.version(1).stores(tablas);

  db.open().catch(err => {
    console.error('Error abriendo la base de datos:', err);
    db = null;
    throw err;
  });

  return db;
}

export function getDB() {
  if (!db) throw new Error('Base de datos no inicializada. Llama a abrirDB() primero.');
  return db;
}

export async function cerrarDB() {
  if (db) { await db.close(); db = null; }
}

/** Guarda un objeto en una tabla (deep clone para evitar proxies) */
export async function guardar(tabla, obj) {
  const db = getDB();
  return db.table(tabla).put(JSON.parse(JSON.stringify(obj)));
}

/** Bulk put */
export async function guardarBulk(tabla, objs) {
  const db = getDB();
  return db.table(tabla).bulkPut(objs.map(o => JSON.parse(JSON.stringify(o))));
}

/** Elimina por id */
export async function eliminar(tabla, id) {
  const db = getDB();
  return db.table(tabla).delete(id);
}

/** Obtiene array completo de una tabla */
export async function listar(tabla) {
  const db = getDB();
  return db.table(tabla).toArray();
}

/** Obtiene un elemento por id */
export async function obtener(tabla, id) {
  const db = getDB();
  return db.table(tabla).get(id);
}

/** Limpia tabla */
export async function limpiar(tabla) {
  const db = getDB();
  return db.table(tabla).clear();
}
