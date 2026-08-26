import { describe, it, expect, vi } from 'vitest';
import { abrirDB, getDB } from '../../src/core/db.js';

describe('Base de datos', () => {
  it('abrirDB crea instancia', () => {
    const manifiestos = [{ tablas: { productos: '++id, nombre' } }];
    const db = abrirDB(manifiestos);
    expect(db).toBeDefined();
  });

  it('getDB devuelve la misma instancia', () => {
    const manifiestos = [{ tablas: { productos: '++id, nombre' } }];
    abrirDB(manifiestos);
    const db = getDB();
    expect(db).toBeDefined();
  });

  it('abrirDB es singleton', () => {
    const manifiestos = [{ tablas: {} }];
    const db1 = abrirDB(manifiestos);
    const db2 = abrirDB(manifiestos);
    expect(db1).toBe(db2);
  });
});
