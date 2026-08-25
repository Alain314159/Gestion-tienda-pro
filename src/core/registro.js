import { abrirDB } from './db.js';

import * as Inicio from '../modulos/negocio/inicio.svelte';
import * as Ventas from '../modulos/negocio/ventas.svelte';
import * as Compras from '../modulos/negocio/compras.svelte';
import * as Caja from '../modulos/negocio/caja.svelte';
import * as Productos from '../modulos/negocio/productos.svelte';
import * as Inventario from '../modulos/negocio/inventario.svelte';
import * as Patrimonio from '../modulos/negocio/patrimonio.svelte';
import * as Reportes from '../modulos/utilidades/reportes.svelte';
import * as Ajustes from '../modulos/utilidades/ajustes.svelte';

const mods = [Inicio, Ventas, Compras, Caja, Productos, Inventario, Patrimonio, Reportes, Ajustes];

export const modulos = mods
  .map(mod => ({
    ...(mod.manifiesto || {}),
    Componente: mod.default
  }))
  .filter(m => m.id)
  .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));

export const grupos = [...new Set(modulos.map(m => m.grupo || 'negocio'))];
abrirDB(modulos);
