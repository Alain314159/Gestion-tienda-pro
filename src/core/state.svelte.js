import { getDB, guardar, leerConfig } from './db.js';
import { clean } from './util.js';
import { processQueue } from './api.js';

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

/** Confirmacion modal */
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

/** Hashea un PIN con SHA-256 + salt */
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'tienda-pro-salt-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Pide PIN si esta activo */
export async function pedirPIN() {
  try {
    const cfg = await leerConfig('cfg');
    if (!cfg?.pinActivo || !cfg?.pinHash) return true;
    const v = await preguntar('Seguridad', 'Ingresa tu PIN');
    if (v === null || v === undefined) return false;
    const hashed = await hashPin(v);
    return hashed === cfg.pinHash;
  } catch (err) {
    console.error('Error al verificar PIN:', err);
    avisar('Error al verificar PIN', 'error');
    return false;
  }
}

/** Guarda configuracion en DB */
export async function guardarCfg(cfg) {
  try {
    const toSave = { ...cfg };
    if (toSave.pin) {
      toSave.pinHash = await hashPin(toSave.pin);
      delete toSave.pin;
    }
    await guardar('config', { key: 'cfg', value: clean(toSave) });
  } catch (e) { console.error('guardarCfg', e); }
}

/** Carga configuracion desde DB */
export async function cargarCfg() {
  try {
    return await leerConfig('cfg') || {};
  } catch (e) { return {}; }
}

// Escuchar cambios de conexion: procesar cola de webhooks al volver online
const onlineHandler = () => {
  ui.offline = false;
  processQueue().catch(() => {});
};
const offlineHandler = () => { ui.offline = true; };
window.addEventListener('online', onlineHandler);
window.addEventListener('offline', offlineHandler);

// Procesar cola periodicamente cada 60s cuando hay conexion
setInterval(() => {
  if (!ui.offline) processQueue().catch(() => {});
}, 60000);
