import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  obtenerPeriodosCerrados,
  fechaEnPeriodoCerrado,
  verificarPeriodoCerrado,
  obtenerPeriodoActual,
  esPeriodoActual,
} from '../../src/core/periodos.js';
import { abrirDB, getDB, cerrarDB, guardar } from '../../src/core/db.js';
describe('periodos.js - Sistema de periodos cerrados', () => {
  beforeEach(async () => {
    await cerrarDB();
    await abrirDB([{ tablas: { cierres: '++id, fechaCierre', config: 'key' } }]);
    const db = getDB();
    await db.table('cierres').clear();
    await db.table('config').clear();
  });
  afterEach(async () => {
    await cerrarDB();
  });
  describe('obtenerPeriodosCerrados()', () => {
    it('devuelve array vacio sin cierres', async () => {
      const res = await obtenerPeriodosCerrados();
      expect(res).toEqual([]);
    });
    it('devuelve periodos ordenados por fecha descendente', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-03-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      await guardar('cierres', {
        id: 'cr2',
        fechaCierre: '2024-06-01T00:00:00.000Z',
        fechaInicio: '2024-04-01T00:00:00.000Z',
      });
      const res = await obtenerPeriodosCerrados();
      expect(res.length).toBe(2);
      expect(res[0].fin).toBe('2024-06-01T00:00:00.000Z');
      expect(res[1].fin).toBe('2024-03-01T00:00:00.000Z');
    });
    it('usa fechaCierre como fallback si no hay fechaInicio', async () => {
      await guardar('cierres', { id: 'cr1', fechaCierre: '2024-03-01T00:00:00.000Z' });
      const res = await obtenerPeriodosCerrados();
      expect(res.length).toBe(1);
      expect(res[0].inicio).toBe('2024-03-01T00:00:00.000Z');
      expect(res[0].fin).toBe('2024-03-01T00:00:00.000Z');
    });
  });
  describe('fechaEnPeriodoCerrado()', () => {
    it('devuelve false sin periodos', async () => {
      const res = await fechaEnPeriodoCerrado('2024-02-15T00:00:00.000Z');
      expect(res).toBe(false);
    });
    it('detecta fecha dentro del periodo', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-03-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      expect(await fechaEnPeriodoCerrado('2024-02-15T00:00:00.000Z')).toBe(true);
    });
    it('detecta fecha en el limite inferior', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-03-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      expect(await fechaEnPeriodoCerrado('2024-01-01T00:00:00.000Z')).toBe(true);
    });
    it('detecta fecha en el limite superior', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-03-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      expect(await fechaEnPeriodoCerrado('2024-03-01T00:00:00.000Z')).toBe(true);
    });
    it('devuelve false para fecha antes del periodo', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-03-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      expect(await fechaEnPeriodoCerrado('2023-12-01T00:00:00.000Z')).toBe(false);
    });
    it('devuelve false para fecha despues del periodo', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-03-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      expect(await fechaEnPeriodoCerrado('2024-04-01T00:00:00.000Z')).toBe(false);
    });
    it('maneja fecha nula o vacia', async () => {
      expect(await fechaEnPeriodoCerrado(null)).toBe(false);
      expect(await fechaEnPeriodoCerrado('')).toBe(false);
      expect(await fechaEnPeriodoCerrado(undefined)).toBe(false);
    });
    it('evalua multiples periodos', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-03-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      await guardar('cierres', {
        id: 'cr2',
        fechaCierre: '2024-09-01T00:00:00.000Z',
        fechaInicio: '2024-06-01T00:00:00.000Z',
      });
      expect(await fechaEnPeriodoCerrado('2024-02-01T00:00:00.000Z')).toBe(true);
      expect(await fechaEnPeriodoCerrado('2024-07-01T00:00:00.000Z')).toBe(true);
      expect(await fechaEnPeriodoCerrado('2024-05-01T00:00:00.000Z')).toBe(false);
    });
  });
  describe('verificarPeriodoCerrado()', () => {
    it('no lanza error si la fecha no esta en periodo cerrado', async () => {
      await expect(verificarPeriodoCerrado('2024-05-01T00:00:00.000Z')).resolves.toBeUndefined();
    });
    it('lanza error si la fecha esta en periodo cerrado', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-03-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      await expect(verificarPeriodoCerrado('2024-02-15T00:00:00.000Z')).rejects.toThrow(
        'No se puede modificar un periodo cerrado'
      );
    });
    it('permite mensaje personalizado', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-03-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      await expect(verificarPeriodoCerrado('2024-02-15T00:00:00.000Z', 'Operacion bloqueada')).rejects.toThrow(
        'Operacion bloqueada'
      );
    });
  });
  describe('obtenerPeriodoActual()', () => {
    it('usa periodoInicio de config', async () => {
      await guardar('config', { key: 'cfg', value: { periodoInicio: '2024-06-01T00:00:00.000Z' } });
      const res = await obtenerPeriodoActual();
      expect(res.inicio).toBe('2024-06-01T00:00:00.000Z');
      expect(new Date(res.fin)).toBeInstanceOf(Date);
    });
    it('usa fecha actual si no hay config', async () => {
      const res = await obtenerPeriodoActual();
      expect(new Date(res.inicio)).toBeInstanceOf(Date);
      expect(new Date(res.fin)).toBeInstanceOf(Date);
    });
  });
  describe('esPeriodoActual()', () => {
    it('devuelve true para fecha dentro del periodo actual', async () => {
      const ahora = new Date().toISOString();
      await guardar('config', { key: 'cfg', value: { periodoInicio: ahora } });
      expect(await esPeriodoActual(ahora)).toBe(true);
    });
    it('devuelve false para fecha anterior al periodo', async () => {
      await guardar('config', { key: 'cfg', value: { periodoInicio: '2024-06-01T00:00:00.000Z' } });
      expect(await esPeriodoActual('2024-01-01T00:00:00.000Z')).toBe(false);
    });
  });
});
