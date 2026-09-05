import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { abrirDB, getDB, cerrarDB, guardar, listar } from '../../src/core/db.js';
import { InventarioService } from '../../src/services/InventarioService.js';

describe('Integracion - InventarioService', () => {
  beforeAll(async () => {
    await cerrarDB();
    await abrirDB([
      { tablas: { productos: '++id', productoVariantes: '++id', lotes: '++id', ajustes: '++id', cierres: '++id', config: 'key' } }
    ]);
    const db = getDB();
    await guardar('config', { key: 'cfg', value: { capitalInicial: 0, periodoInicio: new Date().toISOString(), moneda: '$' } });
    await guardar('productos', { id: 'p1', nombre: 'Producto A', codigo: 'PA-001', archivado: false });
    await guardar('productoVariantes', { id: 'v1', productoId: 'p1', nombre: 'Producto A', precioBase: 10, stockMinimo: 5, archivado: false, unidad: 'u' });
    await guardar('lotes', { id: 'l1', productoId: 'p1', varianteId: 'v1', productoNombre: 'Producto A', cantidadInicial: 20, cantidadVendida: 0, costo: 5, fecha: new Date().toISOString() });
  });

  afterAll(async () => {
    await cerrarDB();
  });

  it('ajustarNegativo reduce stock usando FIFO', async () => {
    const lotes = await listar('lotes');
    const res = await InventarioService.ajustarNegativo({
      productoId: 'p1', varianteId: 'v1', productoNombre: 'Producto A',
      cantidad: 5, motivo: 'Merma test', lotes
    });
    expect(res.ajuste).toBeDefined();
    expect(res.ajuste.cantidad).toBe(-5);
    expect(res.costoPerdida).toBe(25); // 5 * 5

    const lotesDespues = await listar('lotes');
    const lote = lotesDespues.find(l => l.id === 'l1');
    expect(lote.cantidadVendida).toBe(5);
  });

  it('ajustarNegativo rechaza stock insuficiente', async () => {
    const lotes = await listar('lotes');
    await expect(InventarioService.ajustarNegativo({
      productoId: 'p1', varianteId: 'v1', productoNombre: 'Producto A',
      cantidad: 100, motivo: 'Merma grande', lotes
    })).rejects.toThrow('Stock insuficiente');
  });

  it('ajustarPositivo crea lote nuevo', async () => {
    const res = await InventarioService.ajustarPositivo({
      productoId: 'p1', varianteId: 'v1', productoNombre: 'Producto A',
      productoUnidad: 'u', cantidad: 10, motivo: 'Sobrante', costo: 4
    });
    expect(res.ajuste).toBeDefined();
    expect(res.lote).toBeDefined();
    expect(res.ajuste.cantidad).toBe(10);
    expect(res.lote.cantidadInicial).toBe(10);
    expect(res.lote.compraId.startsWith('aj-')).toBe(true);
  });

  it('ajustarPositivo rechaza costo cero', async () => {
    await expect(InventarioService.ajustarPositivo({
      productoId: 'p1', varianteId: 'v1', productoNombre: 'Producto A',
      productoUnidad: 'u', cantidad: 5, motivo: 'Sobrante', costo: 0
    })).rejects.toThrow('costo debe ser mayor a cero');
  });

  it('ajustarPositivo rechaza cantidad cero', async () => {
    await expect(InventarioService.ajustarPositivo({
      productoId: 'p1', varianteId: 'v1', productoNombre: 'Producto A',
      productoUnidad: 'u', cantidad: 0, motivo: 'Sobrante', costo: 5
    })).rejects.toThrow('cantidad debe ser mayor a cero');
  });

  it('recargar devuelve todas las entidades', async () => {
    const res = await InventarioService.recargar();
    expect(res.productos.length).toBeGreaterThanOrEqual(1);
    expect(res.lotes.length).toBeGreaterThanOrEqual(2); // original + sobrante
    expect(res.ajustes.length).toBeGreaterThanOrEqual(2); // merma + sobrante
  });
});
