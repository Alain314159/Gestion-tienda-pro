import { getDB } from './db.js';
import { writable, get } from 'svelte/store';

export const ui = writable({
  tema: localStorage.getItem('tp-tema') ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  toast: null, confirm: null, prompt: null,
  offline: !navigator.onLine, actualizar: false,
  activo: null, masAbierto: false, _updateSW: null
});

export function aplicarTema() {
  document.documentElement.classList.toggle('dark', get(ui).tema === 'dark');
}

export function alternarTema() {
  ui.update(u => {
    const newTema = u.tema === 'dark' ? 'light' : 'dark';
    localStorage.setItem('tp-tema', newTema);
    aplicarTema();
    return { ...u, tema: newTema };
  });
}

let _t;
export function avisar(msg, tipo = 'info') {
  clearTimeout(_t);
  ui.update(u => ({ ...u, toast: { msg, tipo } }));
  _t = setTimeout(() => ui.update(u => ({ ...u, toast: null })), 2600);
}

export function confirmar(titulo, msg) {
  return new Promise(res => {
    ui.update(u => ({ ...u, confirm: { titulo, msg, res } }));
  });
}

export function cerrarConfirm(ok) {
  const current = get(ui);
  current.confirm?.res(!!ok);
  ui.update(u => ({ ...u, confirm: null }));
}

export function preguntar(titulo, msg, inicial = '') {
  return new Promise(res => {
    ui.update(u => ({ ...u, prompt: { titulo, msg, valor: inicial, res } }));
  });
}

export function cerrarPrompt(ok) {
  const current = get(ui);
  current.prompt?.res(ok ? current.prompt.valor : null);
  ui.update(u => ({ ...u, prompt: null }));
}

export async function pedirPIN() {
  const db = getDB();
  const c = await db.config.get(1);
  if (!c?.pin) return true;
  const v = await preguntar('Seguridad', 'Ingresa tu PIN');
  return v === c.pin;
}

export function setActivo(id) {
  ui.update(u => ({ ...u, activo: id }));
}

addEventListener('online', () => ui.update(u => ({ ...u, offline: false })));
addEventListener('offline', () => ui.update(u => ({ ...u, offline: true })));
