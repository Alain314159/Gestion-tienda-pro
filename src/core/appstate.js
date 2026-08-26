import { cargarCfg, guardarCfg } from './cfg.js';
import { bus } from './bus.js';
import { fmt } from './util.js';
import { writable, get } from 'svelte/store';

export const app = writable({ cfg: null });

export async function iniciarCfg() {
  const cfg = await cargarCfg();
  app.set({ cfg });
}

export async function actualizarCfg(c) {
  const current = get(app);
  Object.assign(current.cfg, c);
  await guardarCfg(current.cfg);
  bus.emitir('cfg', current.cfg);
  app.set(current);
}

export function dinero(v) {
  return (get(app).cfg?.moneda || '') + fmt(v);
}

export function getCfg() {
  return get(app).cfg;
}
