import { cargarCfg, guardarCfg } from './cfg.js';
import { bus } from './bus.js';
import { fmt } from './util.js';

export const app = $state({ cfg: null });

export async function iniciarCfg() {
  app.cfg = await cargarCfg();
}
export async function actualizarCfg(c) {
  Object.assign(app.cfg, c);
  await guardarCfg(app.cfg);
  bus.emitir('cfg', app.cfg);
}
export function dinero(v) {
  return (app.cfg?.moneda || '') + fmt(v);
}
