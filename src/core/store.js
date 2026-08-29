import { getDB } from './db.js';
import { writable, get } from 'svelte/store';

export const ui = writable({
    tema: localStorage.getItem('tp-tema') ||
          (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    toast: null,
    confirm: null,
    prompt: null,
    offline: !navigator.onLine,
    activo: null,
    masAbierto: false
});

export function aplicarTema() {
    const tema = get(ui).tema;
    document.documentElement.classList.toggle('dark', tema === 'dark');
}

export function alternarTema() {
    ui.update(u => {
        const newTema = u.tema === 'dark' ? 'light' : 'dark';
        localStorage.setItem('tp-tema', newTema);
        setTimeout(() => aplicarTema(), 0);
        return { ...u, tema: newTema };
    });
}

let toastTimeout;

export function avisar(msg, tipo = 'info') {
    clearTimeout(toastTimeout);
    ui.update(u => ({ ...u, toast: { msg, tipo } }));
    toastTimeout = setTimeout(() => {
        ui.update(u => ({ ...u, toast: null }));
    }, 2600);
}

export function confirmar(titulo, msg) {
    return new Promise(res => {
        ui.update(u => ({ ...u, confirm: { titulo, msg, res } }));
    });
}

export function cerrarConfirm(ok) {
    const current = get(ui);
    if (current.confirm?.res) {
        current.confirm.res(!!ok);
    }
    ui.update(u => ({ ...u, confirm: null }));
}

export function preguntar(titulo, msg, inicial = '') {
    return new Promise(res => {
        ui.update(u => ({ ...u, prompt: { titulo, msg, valor: inicial, res } }));
    });
}

export function cerrarPrompt(ok) {
    const current = get(ui);
    if (current.prompt?.res) {
        current.prompt.res(ok ? current.prompt.valor : null);
    }
    ui.update(u => ({ ...u, prompt: null }));
}

export async function pedirPIN() {
    try {
        const db = getDB();
        const c = await db.config.get(1);
        if (!c?.pin) return true;
        const v = await preguntar('Seguridad', 'Ingresa tu PIN');
        return v === c.pin;
    } catch (err) {
        console.error('Error al verificar PIN:', err);
        avisar('Error al verificar PIN', 'error');
        return false;
    }
}

export function setActivo(id) {
    ui.update(u => ({ ...u, activo: id }));
}

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        ui.update(u => ({ ...u, offline: false }));
        avisar('Conexión restaurada', 'ok');
    });
    window.addEventListener('offline', () => {
        ui.update(u => ({ ...u, offline: true }));
        avisar('Sin conexión a internet', 'error');
    });
}
