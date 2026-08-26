import { describe, it, expect } from 'vitest';
import * as Inicio from '../../src/modulos/negocio/inicio.svelte';
import * as Ventas from '../../src/modulos/negocio/ventas.svelte';
import * as Compras from '../../src/modulos/negocio/compras.svelte';
import * as Caja from '../../src/modulos/negocio/caja.svelte';
import * as Productos from '../../src/modulos/negocio/productos.svelte';
import * as Inventario from '../../src/modulos/negocio/inventario.svelte';
import * as Patrimonio from '../../src/modulos/negocio/patrimonio.svelte';
import * as Reportes from '../../src/modulos/utilidades/reportes.svelte';
import * as Ajustes from '../../src/modulos/utilidades/ajustes.svelte';

const todosModulos = [
  { nombre: 'Inicio', mod: Inicio },
  { nombre: 'Ventas', mod: Ventas },
  { nombre: 'Compras', mod: Compras },
  { nombre: 'Caja', mod: Caja },
  { nombre: 'Productos', mod: Productos },
  { nombre: 'Inventario', mod: Inventario },
  { nombre: 'Patrimonio', mod: Patrimonio },
  { nombre: 'Reportes', mod: Reportes },
  { nombre: 'Ajustes', mod: Ajustes },
];

describe('Manifiesto de cada módulo', () => {
  todosModulos.forEach(({ nombre, mod }) => {
    describe(nombre, () => {
      it('tiene export default (componente)', () => {
        expect(mod.default).toBeDefined();
      });
      it('tiene manifiesto exportado', () => {
        expect(mod.manifiesto).toBeDefined();
      });
      it('manifiesto tiene id', () => {
        expect(mod.manifiesto.id).toBeDefined();
      });
      it('manifiesto tiene nombre', () => {
        expect(mod.manifiesto.nombre).toBeDefined();
      });
      it('manifiesto tiene icono', () => {
        expect(mod.manifiesto.icono).toBeDefined();
      });
      it('manifiesto tiene grupo', () => {
        expect(mod.manifiesto.grupo).toBeDefined();
      });
      it('manifiesto tiene orden numérico', () => {
        expect(typeof mod.manifiesto.orden).toBe('number');
      });
    });
  });
});
