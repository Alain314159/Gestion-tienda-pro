import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { abrirDB, getDB, cerrarDB, guardar, listar } from '../../src/core/db.js';
import { calcFIFO, stockProducto, saldoCaja } from '../../src/core/util.js';

describe('Integracion - Flujo de venta completo', () => {
  beforeAll(async () => {
    await cerrarDB();
    abrirDB([
      { tablas: { productos: '++id', lotes: '++id', ventas: '++id', compras: '++id', movCaja: '++id', config: 'key' } }
    ]);
    const db = getDB();
    // Seed datos
    await db.table('productos').put({ id: 'p1', nombre: 'Producto A', precio: 10, stockMinimo: 5, archivado: false, unidad: '' });
    await db.table('lotes').put({ id: 'l1', productoId: 'p1', productoNombre: 'Producto A', cantidadInicial: 20, cantidadVendida: 0, costo: 5, fecha: new Date().toISOString() });
    await db.table('config').put({ key: 'cfg', value: { capitalInicial: 0, periodoInicio: new Date().toISOString(), moneda: '$' } });
  });

  afterAll(async () => {
    await cerrarDB();
  });

  it('stock inicial es correcto', async () => {
    const lotes = await listar('lotes');
    expect(stockProducto(lotes, 'p1')).toBe(20);
  });

  it('FIFO calcula costo correcto', async () => {
    const lotes = await listar('lotes');
    const res = calcFIFO(lotes, 'p1', 5);
    expect(res.error).toBeUndefined();
    expect(res.costoTotal).toBe(25); // 5 * 5
    expect(res.usados[0].loteId).toBe('l1');
  });

  it('venta reduce stock y actualiza lotes', async () => {
    const db = getDB();
    const lotesAntes = await listar('lotes');
    const res = calcFIFO(lotesAntes, 'p1', 3);

    // Simular venta
    const venta = {
      id: 'v1', fecha: new Date().toISOString(),
      items: [{ productoId: 'p1', nombre: 'Producto A', cantidad: 3, precio: 10, costo: res.costoTotal, ganancia: 30 - res.costoTotal, lotesUsados: res.usados }],
      total: 30, ganancia: 30 - res.costoTotal, anulada: false
    };

    await db.transaction('rw', db.ventas, db.lotes, async () => {
      await db.ventas.put(venta);
      const lote = lotesAntes.find(l => l.id === 'l1');
      lote.cantidadVendida = 3;
      await db.lotes.put(lote);
    });

    const lotesDespues = await listar('lotes');
    expect(stockProducto(lotesDespues, 'p1')).toBe(17);
  });

  it('saldo de caja refleja la venta', async () => {
    const ventas = await listar('ventas');
    const saldo = saldoCaja({ cfg: { capitalInicial: 0 }, capital: [], ventas, compras: [], retiros: [], movCaja: [] });
    expect(saldo).toBe(30);
  });
});
