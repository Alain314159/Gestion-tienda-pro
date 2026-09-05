import { safeLocalStorage } from './util.js';

/** Estado global de la UI usando Svelte 5 Runes */
export const ui = $state({
  tema: safeLocalStorage.get('tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  toast: null,
  confirm: null,
  prompt: null,
  offline: !navigator.onLine,
  activo: null,
  masAbierto: false,
});

// Verificar estado de conexion inmediatamente (corrige valor stale al inicio)
setTimeout(() => {
  ui.offline = !navigator.onLine;
}, 0);

/** Aplica tema al documento */
export function aplicarTema() {
  document.documentElement.classList.toggle('dark', ui.tema === 'dark');
  document.documentElement.setAttribute('data-theme', ui.tema);
}

/** Alterna tema claro/oscuro */
export function alternarTema() {
  ui.tema = ui.tema === 'dark' ? 'light' : 'dark';
  safeLocalStorage.set('tema', ui.tema);
  aplicarTema();
}

let toastTimeout;

/** Muestra toast. Errores y warnings duran 5s, info/success 3s */
export function avisar(msg, tipo = 'info') {
  clearTimeout(toastTimeout);
  ui.toast = { msg, tipo };
  const duracion = tipo === 'bad' || tipo === 'warn' ? 5000 : 3000;
  toastTimeout = setTimeout(() => {
    ui.toast = null;
  }, duracion);
}

/** Confirmacion modal */
export function confirmar(titulo, msg) {
  return new Promise((res) => {
    ui.confirm = { titulo, msg, res };
  });
}

export function cerrarConfirm(ok) {
  if (ui.confirm?.res) ui.confirm.res(!!ok);
  ui.confirm = null;
}

/** Prompt modal */
export function preguntar(titulo, msg, inicial = '') {
  return new Promise((res) => {
    ui.prompt = { titulo, msg, valor: inicial, res };
  });
}

export function cerrarPrompt(ok) {
  if (ui.prompt?.res) ui.prompt.res(ok ? ui.prompt.valor : null);
  ui.prompt = null;
}

/** Estado para detectar cambios sin guardar */
const _cambiosSinGuardar = $state({ valor: false });

export function marcarCambiosSinGuardar() {
  _cambiosSinGuardar.valor = true;
}

export function limpiarCambiosSinGuardar() {
  _cambiosSinGuardar.valor = false;
}

export function hayCambiosSinGuardar() {
  return _cambiosSinGuardar.valor;
}
