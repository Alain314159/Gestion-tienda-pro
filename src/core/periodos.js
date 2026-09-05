import { listar } from './db.js';
import { leerConfig } from './db.js';
import { nowLocal, isoToLocal } from './util.js';
export async function obtenerPeriodosCerrados() {
  const cierres = await listar('cierres');
  return cierres
    .map((c) => ({ inicio: c.fechaInicio || c.fechaCierre, fin: c.fechaCierre }))
    .sort((a, b) => new Date(b.fin) - new Date(a.fin));
}
export async function fechaEnPeriodoCerrado(fechaIso) {
  if (!fechaIso) return false;
  const periodos = await obtenerPeriodosCerrados();
  const f = isoToLocal(fechaIso);
  return periodos.some((p) => isoToLocal(p.inicio) <= f && f <= isoToLocal(p.fin));
}
export async function verificarPeriodoCerrado(fechaIso, mensaje = 'No se puede modificar un periodo cerrado') {
  if (await fechaEnPeriodoCerrado(fechaIso)) {
    throw new Error(mensaje);
  }
}
export async function obtenerPeriodoActual() {
  const cfg = (await leerConfig('cfg')) || {};
  const inicio = cfg.periodoInicio || nowLocal().iso;
  return { inicio, fin: nowLocal().iso };
}
export async function esPeriodoActual(fechaIso) {
  const { inicio } = await obtenerPeriodoActual();
  return isoToLocal(fechaIso) >= isoToLocal(inicio);
}
