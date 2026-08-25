import { getDB } from './db.js';

export const CFG_DEF = {
  id: 1, nombre: 'Tienda Pro', moneda: '', pin: '',
  periodoInicio: Date.now(), capitalInicial: 0
};

export async function cargarCfg() {
  const db = getDB();
  let c = await db.config.get(1);
  if (!c) { c = { ...CFG_DEF }; await db.config.put(c); }
  return c;
}
export async function guardarCfg(c) { await getDB().config.put(c); }
