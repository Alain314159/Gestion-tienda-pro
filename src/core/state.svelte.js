import { getDB, guardar } from './db.js';

/** Estado global de la UI usando Svelte 5 Runes */
export const ui = $state({
  tema: localStorage.getItem('tp-tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  toast: null,
  confirm: null,
  prompt: null,
  offline: !navigator.onLine,
  activo: null,
  masAbierto: false
});

/** Aplica tema al documento */
export function aplicarTema() {
  document.documentElement.classList.toggle('dark', ui.tema === 'dark');
  document.documentElement.setAttribute('data-theme', ui.tema);
}

/** Alterna tema claro/oscuro */
export function alternarTema() {
  ui.tema = ui.tema === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tp-tema', ui.tema);
  aplicarTema();
}

let toastTimeout;

/** Muestra toast */
export function avisar(msg, tipo = 'info') {
  clearTimeout(toastTimeout);
  ui.toast = { msg, tipo };
  toastTimeout = setTimeout(() => { ui.toast = null; }, 2600);
}

/** Confirmación modal */
export function confirmar(titulo, msg) {
  return new Promise(res => {
    ui.confirm = { titulo, msg, res };
  });
}

export function cerrarConfirm(ok) {
  if (ui.confirm?.res) ui.confirm.res(!!ok);
  ui.confirm = null;
}

/** Prompt modal */
export function preguntar(titulo, msg, inicial = '') {
  return new Promise(res => {
    ui.prompt = { titulo, msg, valor: inicial, res };
  });
}

export function cerrarPrompt(ok) {
  if (ui.prompt?.res) ui.prompt.res(ok ? ui.prompt.valor : null);
  ui.prompt = null;
}

/** Pide PIN si está activo */
export async function pedirPIN() {
  try {
    const db = getDB();
    const c = await db.config.get('cfg');
    if (!c?.value?.pinActivo || !c?.value?.pin) return true;
    const v = await preguntar('Seguridad', 'Ingresa tu PIN');
    return v === c.value.pin;
  } catch (err) {
    console.error('Error al verificar PIN:', err);
    avisar('Error al verificar PIN', 'error');
    return false;
  }
}

/** Guarda configuración en DB */
export async function guardarCfg(cfg) {
  try {
    await guardar('config', { key: 'cfg', value: JSON.parse(JSON.stringify(cfg)) });
  } catch (e) { console.error('guardarCfg', e); }
}

/** Carga configuración desde DB */
export async function cargarCfg() {
  try {
    const db = getDB();
    const c = await db.config.get('cfg');
    return c?.value || {};
  } catch (e) { return {}; }
}

// Escuchar cambios de conexión
window.addEventListener('online', () => { ui.offline = false; });
window.addEventListener('offline', () => { ui.offline = true; });
