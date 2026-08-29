import { getDB } from './db.js';

export const CFG_DEF = {
    id: 1,
    nombre: 'Tienda Pro',
    moneda: '€',
    pin: '',
    periodoInicio: Date.now(),
    capitalInicial: 0
};

export async function cargarCfg() {
    try {
        const db = getDB();
        let c = await db.config.get(1);
        if (!c) {
            c = { ...CFG_DEF };
            await db.config.put(c);
        }
        return c;
    } catch (err) {
        console.error('Error al cargar configuración:', err);
        return { ...CFG_DEF };
    }
}

export async function guardarCfg(c) {
    try {
        const db = getDB();
        await db.config.put(c);
    } catch (err) {
        console.error('Error al guardar configuración:', err);
        throw err;
    }
}
