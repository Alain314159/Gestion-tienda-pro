import { getDB } from './db.js';

export const ui = $state({
  tema: localStorage.getItem('tp-tema') ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  toast: null, confirm: null, prompt: null,
  offline: !navigator.onLine, actualizar: false,
  activo: null, masAbierto: false, _updateSW: null
});

export function aplicarTema() {
  document.documentElement.classList.toggle('dark', ui.tema === 'dark');
}
export function alternarTema() {
  ui.tema = ui.tema === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tp-tema', ui.tema);
  aplicarTema();
}

let _t;
export function avisar(msg, tipo = 'info') {
  clearTimeout(_t);
  ui.toast = { msg, tipo };
  _t = setTimeout(() => (ui.toast = null), 2600);
}

export function confirmar(titulo, msg) {
  return new Promise(res => { ui.confirm = { titulo, msg, res }; });
}
export function cerrarConfirm(ok) { ui.confirm?.res(!!ok); ui.confirm = null; }

export function preguntar(titulo, msg, inicial = '') {
  return new Promise(res => { ui.prompt = { titulo, msg, valor: inicial, res }; });
}
export function cerrarPrompt(ok) {
  ui.prompt?.res(ok ? ui.prompt.valor : null);
  ui.prompt = null;
}

export async function pedirPIN() {
  const c = await getDB().config.get(1);
  if (!c?.pin) return true;
  const v = await preguntar('Seguridad', 'Ingresa tu PIN');
  return v === c.pin;
}

addEventListener('online', () => (ui.offline = false));
addEventListener('offline', () => (ui.offline = true));
