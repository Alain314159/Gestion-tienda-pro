import { abrirDB } from './db.js';

/** Módulos con lazy loading */
const modulosRaw = [
  () => import('../modulos/negocio/inicio.svelte'),
  () => import('../modulos/negocio/ventas.svelte'),
  () => import('../modulos/negocio/compras.svelte'),
  () => import('../modulos/negocio/caja.svelte'),
  () => import('../modulos/negocio/productos.svelte'),
  () => import('../modulos/negocio/inventario.svelte'),
  () => import('../modulos/negocio/patrimonio.svelte'),
  () => import('../modulos/utilidades/reportes.svelte'),
  () => import('../modulos/utilidades/ajustes.svelte'),
];

export let modulos = [];
export let navMods = [];

export async function cargarModulos() {
  const cargados = await Promise.all(modulosRaw.map(fn => fn()));
  modulos = cargados
    .map(mod => ({ ...(mod.manifiesto || {}), Componente: mod.default }))
    .filter(m => m.id)
    .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));

  // Los 4 primeros van a la nav principal, el resto al menú "Más"
  navMods = modulos.slice(0, 4);

  abrirDB(modulos);
  return modulos;
}
