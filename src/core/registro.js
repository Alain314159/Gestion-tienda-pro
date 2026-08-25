import { abrirDB } from './db.js';

// Imports explícitos de todos los módulos
import Inicio from '../modulos/negocio/inicio.svelte';
import Ventas from '../modulos/negocio/ventas.svelte';
import Compras from '../modulos/negocio/compras.svelte';
import Caja from '../modulos/negocio/caja.svelte';
import Productos from '../modulos/negocio/productos.svelte';
import Inventario from '../modulos/negocio/inventario.svelte';
import Patrimonio from '../modulos/negocio/patrimonio.svelte';
import Reportes from '../modulos/utilidades/reportes.svelte';
import Ajustes from '../modulos/utilidades/ajustes.svelte';

// Registro manual de módulos
const componentes = [Inicio, Ventas, Compras, Caja, Productos, Inventario, Patrimonio, Reportes, Ajustes];

export const modulos = componentes
  .map(comp => {
    const mani = comp.manifiesto || {};
    return { ...mani, Componente: comp };
  })
  .filter(m => m.id)
  .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));

export const grupos = [...new Set(modulos.map(m => m.grupo || 'negocio'))];

abrirDB(modulos);
