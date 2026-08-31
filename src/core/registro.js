import { abrirDB } from './db.js';

const modulosRaw = [
  { manifiesto: { id: 'tiendas', nombre: 'Tiendas', icono: 'store', grupo: 'negocio', orden: -1, tablas: { tiendas: '++id, nombre' } }, loader: () => import('../modulos/negocio/tiendas.svelte') },
  { manifiesto: { id: 'inicio', nombre: 'Inicio', icono: 'home', grupo: 'negocio', orden: 0, tablas: {} }, loader: () => import('../modulos/negocio/inicio.svelte') },
  { manifiesto: { id: 'ventas', nombre: 'Ventas', icono: 'cart', grupo: 'negocio', orden: 1, tablas: { ventas: '++id, fecha, anulada', lotes: '++id, productoId, fecha, costo, compraId' } }, loader: () => import('../modulos/negocio/ventas.svelte') },
  { manifiesto: { id: 'compras', nombre: 'Compras', icono: 'bag', grupo: 'negocio', orden: 2, tablas: { compras: '++id, fecha, productoId, anulada', lotes: '++id, productoId, fecha, costo, compraId' } }, loader: () => import('../modulos/negocio/compras.svelte') },
  { manifiesto: { id: 'productos', nombre: 'Productos', icono: 'tag', grupo: 'negocio', orden: 3, tablas: { productos: '++id, nombre, codigo, archivado' } }, loader: () => import('../modulos/negocio/productos.svelte') },
  { manifiesto: { id: 'inventario', nombre: 'Inventario', icono: 'package', grupo: 'negocio', orden: 4, tablas: { ajustes: '++id, fecha, productoId' } }, loader: () => import('../modulos/negocio/inventario.svelte') },
  { manifiesto: { id: 'cuadre', nombre: 'Cuadre', icono: 'calculator', grupo: 'negocio', orden: 5, tablas: { socios: '++id', gastosOp: '++id, fecha' } }, loader: () => import('../modulos/negocio/cuadre.svelte') },
  { manifiesto: { id: 'caja', nombre: 'Caja', icono: 'wallet', grupo: 'negocio', orden: 6, tablas: { arqueos: '++id, fecha', movCaja: '++id, fecha, tipo' } }, loader: () => import('../modulos/negocio/caja.svelte') },
  { manifiesto: { id: 'patrimonio', nombre: 'Patrimonio', icono: 'diamond', grupo: 'negocio', orden: 7, tablas: { capital: '++id, fecha', retiros: '++id, fecha' } }, loader: () => import('../modulos/negocio/patrimonio.svelte') },
  { manifiesto: { id: 'calendario', nombre: 'Calendario', icono: 'calendar', grupo: 'negocio', orden: 8, tablas: {} }, loader: () => import('../modulos/negocio/calendario.svelte') },
  { manifiesto: { id: 'reportes', nombre: 'Reportes', icono: 'chart', grupo: 'utilidades', orden: 9, tablas: { cierres: '++id, fechaCierre' } }, loader: () => import('../modulos/utilidades/reportes.svelte') },
  { manifiesto: { id: 'analisis', nombre: 'Analisis', icono: 'layers', grupo: 'utilidades', orden: 10, tablas: {} }, loader: () => import('../modulos/negocio/analisis.svelte') },
  { manifiesto: { id: 'contabilidad', nombre: 'Contabilidad', icono: 'book', grupo: 'utilidades', orden: 11, tablas: {} }, loader: () => import('../modulos/negocio/contabilidad.svelte') },
  { manifiesto: { id: 'qrmenu', nombre: 'Menu QR', icono: 'scan', grupo: 'utilidades', orden: 12, tablas: {} }, loader: () => import('../modulos/negocio/qrmenu.svelte') },
  { manifiesto: { id: 'ajustes', nombre: 'Ajustes', icono: 'settings', grupo: 'utilidades', orden: 13, tablas: {} }, loader: () => import('../modulos/utilidades/ajustes.svelte') },
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

  navMods = modulos.slice(0, 4);

  abrirDB(modulos);
  return modulos;
}
