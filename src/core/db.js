import Dexie from 'dexie';

export const DB_NAME = 'tienda-pro-v6';

let db = null;

export function abrirDB(manifiestos) {
    if (db) return db;
    db = new Dexie(DB_NAME);
    const tablas = {
        config: '++id'
    };
    for (const m of (manifiestos || [])) {
        if (m.tablas) {
            Object.assign(tablas, m.tablas);
        }
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
    if (!db) {
        throw new Error('Base de datos no inicializada. Llama a abrirDB() primero.');
    }
    return db;
}

export async function cerrarDB() {
    if (db) {
        await db.close();
        db = null;
    }
}
