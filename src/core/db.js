import Dexie from 'dexie';

export const DB_NAME = 'tienda-pro-v6';
let db = null;

export function abrirDB(manifiestos) {
  if (db) return db;
  db = new Dexie(DB_NAME);
  const tablas = { config: '++id' };
  for (const m of manifiestos) Object.assign(tablas, m.tablas || {});
  db.version(1).stores(tablas);
  return db;
}
export function getDB() { return db; }
