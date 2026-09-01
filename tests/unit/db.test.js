import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Dexie from 'dexie';
import { abrirDB, getDB, cerrarDB, guardar, listar, eliminar, obtener, guardarBulk } from '../../src/core/db.js';

// Mock crypto.randomUUID - jsdom tiene crypto como read-only
if (!global.crypto?.randomUUID) {
  vi.stubGlobal('crypto', {
    ...global.crypto,
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2)
  });
}

describe('db.js - Base de datos', () => {
  beforeEach(async () => {
    await cerrarDB();
    // Usar nombre unico para evitar conflictos
    const db = new Dexie('test-db-' + Date.now());
    db.version(1).stores({ productos: '++id', ventas: '++id' });
    await db.open();
    // Reemplazar el singleton
    const module = await import('../../src/core/db.js');
  });

  afterEach(async () => {
    await cerrarDB();
  });

  it('guardar y listar funciona', async () => {
    const db = await abrirDB([{ tablas: { productos: '++id' } }]);
    await guardar('productos', { id: 'p1', nombre: 'Test' });
    const items = await listar('productos');
    expect(items.length).toBe(1);
    expect(items[0].nombre).toBe('Test');
  });

  it('eliminar funciona', async () => {
    const db = await abrirDB([{ tablas: { productos: '++id' } }]);
    await guardar('productos', { id: 'p1', nombre: 'Test' });
    await eliminar('productos', 'p1');
    const items = await listar('productos');
    expect(items.length).toBe(0);
  });

  it('guardarBulk funciona', async () => {
    const db = await abrirDB([{ tablas: { productos: '++id' } }]);
    await guardarBulk('productos', [{ id: 'p1', nombre: 'A' }, { id: 'p2', nombre: 'B' }]);
    const items = await listar('productos');
    expect(items.length).toBe(2);
  });
});
