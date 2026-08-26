import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CFG_DEF } from '../../src/core/cfg.js';

describe('Configuración por defecto', () => {
  it('tiene id = 1', () => {
    expect(CFG_DEF.id).toBe(1);
  });
  it('tiene nombre por defecto', () => {
    expect(CFG_DEF.nombre).toBe('Tienda Pro');
  });
  it('tiene periodoInicio como timestamp', () => {
    expect(typeof CFG_DEF.periodoInicio).toBe('number');
    expect(CFG_DEF.periodoInicio).toBeGreaterThan(0);
  });
  it('tiene capitalInicial = 0', () => {
    expect(CFG_DEF.capitalInicial).toBe(0);
  });
  it('tiene pin vacío por defecto', () => {
    expect(CFG_DEF.pin).toBe('');
  });
});
