import { getDB, guardar, leerConfig } from './db.js';
import { clean } from './util.js';
import { processQueue, areWebhooksEnabled } from './api.js';

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

// Verificar estado de conexion inmediatamente (corrige valor stale al inicio)
setTimeout(() => { ui.offline = !navigator.onLine; }, 0);

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

/* ================================================================
   SEGURIDAD: SALT + PBKDF2 + RATE LIMITING
   ================================================================ */

const SALT_KEY = 'tp_device_salt';
const ATTEMPTS_KEY = 'tp_pin_attempts';
const LOCKED_KEY = 'tp_pin_locked_until';

/** Genera o recupera el salt unico de este dispositivo */
function getDeviceSalt() {
  let salt = localStorage.getItem(SALT_KEY);
  if (!salt) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    salt = btoa(String.fromCharCode(...arr));
    localStorage.setItem(SALT_KEY, salt);
  }
  return salt;
}

/** Hashea un PIN con PBKDF2-SHA256 (100k iteraciones) + salt por dispositivo */
async function hashPin(pin) {
  const salt = getDeviceSalt();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Delay exponencial para bloqueo: 5s, 15s, 60s, 5min, 30min */
function getLockDelay(attempts) {
  const delays = [5000, 15000, 60000, 300000, 1800000];
  return delays[Math.min(attempts, delays.length) - 1] || delays[delays.length - 1];
}

function getAttempts() {
  return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
}

function setAttempts(n) {
  localStorage.setItem(ATTEMPTS_KEY, String(n));
}

function getLockedUntil() {
  return parseInt(localStorage.getItem(LOCKED_KEY) || '0', 10);
}

function setLockedUntil(ts) {
  localStorage.setItem(LOCKED_KEY, String(ts));
}

function resetAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
  localStorage.removeItem(LOCKED_KEY);
}

/** Pide PIN si esta activo, con rate limiting y bloqueo exponencial */
export async function pedirPIN() {
  try {
    const cfg = await leerConfig('cfg');
    if (!cfg?.pinActivo || !cfg?.pinHash) return true;

    const lockedUntil = getLockedUntil();
    if (Date.now() < lockedUntil) {
      const segRestantes = Math.ceil((lockedUntil - Date.now()) / 1000);
      const mins = Math.floor(segRestantes / 60);
      const segs = segRestantes % 60;
      const msg = mins > 0 ? `${mins}m ${segs}s` : `${segs}s`;
      avisar(`Demasiados intentos fallidos. Espera ${msg}`, 'bad');
      return false;
    }

    const v = await preguntar('Seguridad', 'Ingresa tu PIN');
    if (v === null || v === undefined) return false;

    const hashed = await hashPin(v);
    if (hashed === cfg.pinHash) {
      resetAttempts();
      return true;
    }

    const attempts = getAttempts() + 1;
    setAttempts(attempts);
    const delay = getLockDelay(attempts);
    setLockedUntil(Date.now() + delay);
    const seg = Math.ceil(delay / 1000);
    const mins = Math.floor(seg / 60);
    const segs = seg % 60;
    const tiempo = mins > 0 ? `${mins}m ${segs}s` : `${segs}s`;
    avisar(`PIN incorrecto. Bloqueado por ${tiempo}`, 'bad');
    return false;
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

// Escuchar cambios de conexion: procesar cola de webhooks al volver online (solo si activados)
const onlineHandler = () => {
  ui.offline = false;
  areWebhooksEnabled().then(ok => { if (ok) processQueue().catch(() => {}); });
};
const offlineHandler = () => { ui.offline = true; };
window.addEventListener('online', onlineHandler);
window.addEventListener('offline', offlineHandler);

// Procesar cola periodicamente cada 60s cuando hay conexion (solo si activados)
setInterval(() => {
  if (!ui.offline) {
    areWebhooksEnabled().then(ok => { if (ok) processQueue().catch(() => {}); });
  }
}, 60000);
