import { abrirDB } from './db.js';

/** Módulos con lazy loading — manifiestos inline para robustez en producción.
 *  Vite en modo producción no siempre preserva exportaciones named de .svelte
 *  en chunks dinámicos. Definimos los metadatos aquí y solo cargamos el componente.
 */
const modulosRaw = [
  {
    manifiesto: { id: 'inicio', nombre: 'Inicio', icono: 'home', grupo: 'negocio', orden: 0, tablas: {} },
    loader: () => import('../modulos/negocio/inicio.svelte')
  },
  {
    manifiesto: { id: 'ventas', nombre: 'Ventas', icono: 'cart', grupo: 'negocio', orden: 1, tablas: { ventas: '++id, fecha, anulada', lotes: '++id, productoId, fecha, costo, compraId' } },
    loader: () => import('../modulos/negocio/ventas.svelte')
  },
  {
    manifiesto: { id: 'compras', nombre: 'Compras', icono: 'bag', grupo: 'negocio', orden: 2, tablas: { compras: '++id, fecha, productoId, anulada', lotes: '++id, productoId, fecha, costo, compraId' } },
    loader: () => import('../modulos/negocio/compras.svelte')
  },
  {
    manifiesto: { id: 'productos', nombre: 'Productos', icono: 'tag', grupo: 'negocio', orden: 3, tablas: { productos: '++id, nombre, codigo, archivado' } },
    loader: () => import('../modulos/negocio/productos.svelte')
  },
  {
    manifiesto: { id: 'inventario', nombre: 'Inventario', icono: 'package', grupo: 'negocio', orden: 4, tablas: { ajustes: '++id, fecha, productoId' } },
    loader: () => import('../modulos/negocio/inventario.svelte')
  },
  {
    manifiesto: { id: 'caja', nombre: 'Caja', icono: 'wallet', grupo: 'negocio', orden: 5, tablas: { arqueos: '++id, fecha', movCaja: '++id, fecha, tipo' } },
    loader: () => import('../modulos/negocio/caja.svelte')
  },
  {
    manifiesto: { id: 'patrimonio', nombre: 'Patrimonio', icono: 'diamond', grupo: 'negocio', orden: 6, tablas: { capital: '++id, fecha', retiros: '++id, fecha' } },
    loader: () => import('../modulos/negocio/patrimonio.svelte')
  },
  {
    manifiesto: { id: 'reportes', nombre: 'Reportes', icono: 'chart', grupo: 'utilidades', orden: 7, tablas: { cierres: '++id, fechaCierre' } },
    loader: () => import('../modulos/utilidades/reportes.svelte')
  },
  {
    manifiesto: { id: 'ajustes', nombre: 'Ajustes', icono: 'settings', grupo: 'utilidades', orden: 8, tablas: {} },
    loader: () => import('../modulos/utilidades/ajustes.svelte')
  },
];

export let modulos = [];
export let navMods = [];

export async function cargarModulos() {
  const cargados = await Promise.all(modulosRaw.map(async cfg => {
    const mod = await cfg.loader();
    return { ...cfg.manifiesto, Componente: mod.default };
  }));

  modulos = cargados
    .filter(m => m.id)
    .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));

  // Los 4 primeros van a la nav principal, el resto al menú "Más"
  navMods = modulos.slice(0, 4);

  abrirDB(modulos);
  return modulos;
}
