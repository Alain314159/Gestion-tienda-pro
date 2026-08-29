import { cargarCfg, guardarCfg } from './cfg.js';
import { bus } from './bus.js';
import { fmt } from './util.js';
import { writable, get } from 'svelte/store';

export const app = writable({ cfg: null });

export async function iniciarCfg() {
    try {
        const cfg = await cargarCfg();
        app.set({ cfg });
    } catch (err) {
        console.error('Error al cargar configuración:', err);
        app.set({ cfg: null });
        throw err;
    }
}

export async function actualizarCfg(c) {
    try {
        const current = get(app);
        if (!current.cfg) {
            throw new Error('Configuración no inicializada');
        }
        const newCfg = { ...current.cfg, ...c };
        await guardarCfg(newCfg);
        bus.emitir('cfg', newCfg);
        app.set({ cfg: newCfg });
    } catch (err) {
        console.error('Error al actualizar configuración:', err);
        throw err;
    }
}

export function dinero(v) {
    const cfg = get(app).cfg;
    const moneda = cfg?.moneda || '';
    return moneda + fmt(v);
}

export function getCfg() {
    return get(app).cfg;
}
