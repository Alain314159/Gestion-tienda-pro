import { describe, it, expect } from 'vitest';
import { modulos, grupos } from '../../src/core/registro.js';

describe('Registro de módulos', () => {
  it('carga al menos 9 módulos', () => {
    expect(modulos.length).toBeGreaterThanOrEqual(9);
  });

  it('todos los módulos tienen id', () => {
    modulos.forEach(m => {
      expect(m.id).toBeDefined();
      expect(typeof m.id).toBe('string');
    });
  });

  it('todos los módulos tienen Componente', () => {
    modulos.forEach(m => {
      expect(m.Componente).toBeDefined();
    });
  });

  it('todos los módulos tienen nombre', () => {
    modulos.forEach(m => {
      expect(m.nombre).toBeDefined();
    });
  });

  it('los módulos están ordenados por "orden"', () => {
    for (let i = 1; i < modulos.length; i++) {
      expect(modulos[i].orden ?? 99).toBeGreaterThanOrEqual(modulos[i-1].orden ?? 99);
    });
  });

  it('existe el módulo inicio', () => {
    expect(modulos.find(m => m.id === 'inicio')).toBeDefined();
  });

  it('existe el módulo ventas', () => {
    expect(modulos.find(m => m.id === 'ventas')).toBeDefined();
  });

  it('existe el módulo compras', () => {
    expect(modulos.find(m => m.id === 'compras')).toBeDefined();
  });

  it('existe el módulo caja', () => {
    expect(modulos.find(m => m.id === 'caja')).toBeDefined();
  });

  it('existe el módulo ajustes', () => {
    expect(modulos.find(m => m.id === 'ajustes')).toBeDefined();
  });

  it('grupos incluye negocio y utilidades', () => {
    expect(grupos).toContain('negocio');
    expect(grupos).toContain('utilidades');
  });
});
