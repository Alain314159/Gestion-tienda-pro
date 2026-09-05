import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { abrirDB, getDB, cerrarDB, guardar, listar, guardarBulk, limpiar } from '../../src/core/db.js';
import { calcFIFO, stockProducto } from '../../src/core/util.js';

describe('Transacciones - Flujo completo venta con rollback', () => {
  beforeAll(async () => {
    await cerrarDB();
    await abrirDB([
      { tablas: { productos: '++id', lotes: '++id', ventas: '++id', compras: '++id', movCaja: '++id', config: 'key' } }
    ]);
    const db = getDB();
    await db.table('productos').put({ id: 'p1', nombre: 'Producto A', precio: 10, stockMinimo: 5, archivado: false, unidad: '' });
    await db.table('lotes').put({ id: 'l1', productoId: 'p1', productoNombre: 'Producto A', cantidadInicial: 20, cantidadVendida: 0, costo: 5, fecha: new Date().toISOString() });
    await db.table('config').put({ key: 'cfg', value: { capitalInicial: 0, periodoInicio: new Date().toISOString(), moneda: '$' } });
  });

  afterAll(async () => {
    await cerrarDB();
  });

  it('venta exitosa reduce stock correctamente', async () => {
    const db = getDB();
    const lotesAntes = await listar('lotes');
    const res = calcFIFO(lotesAntes, 'p1', 5);
    expect(res.error).toBeUndefined();

    const venta = {
      id: 'v1', fecha: new Date().toISOString(),
      items: [{ productoId: 'p1', nombre: 'Producto A', cantidad: 5, precio: 10, costo: res.costoTotal, ganancia: 50 - res.costoTotal, lotesUsados: res.usados }],
      total: 50, ganancia: 50 - res.costoTotal, anulada: false
    };

    await db.transaction('rw', db.ventas, db.lotes, async () => {
      await db.ventas.put(venta);
      const lote = lotesAntes.find(l => l.id === 'l1');
      lote.cantidadVendida = 5;
      await db.lotes.put(lote);
    });

    const lotesDespues = await listar('lotes');
    expect(stockProducto(lotesDespues, 'p1')).toBe(15);
  });

  it('no permite vender mas del stock disponible', async () => {
    const lotes = await listar('lotes');
    const res = calcFIFO(lotes, 'p1', 100);
    expect(res.error).toBeDefined();
    expect(res.error).toContain('Stock insuficiente');
  });

  it('anulacion de venta restaura stock exacto', async () => {
    const db = getDB();
    const ventas = await listar('ventas');
    const v = ventas.find(x => x.id === 'v1');
    expect(v).toBeDefined();

    const lotesAntes = await listar('lotes');
    const stockAntes = stockProducto(lotesAntes, 'p1');

    // Anular: restaurar cantidadVendida
    await db.transaction('rw', db.ventas, db.lotes, async () => {
      await db.ventas.put({ ...v, anulada: true, fechaAnulacion: new Date().toISOString() });
      for (const it of v.items) {
        if (!it.lotesUsados) continue;
        for (const u of it.lotesUsados) {
          const l = lotesAntes.find(x => x.id === u.loteId);
          if (l) {
            l.cantidadVendida = Math.max(0, l.cantidadVendida - u.cantidad);
            await db.lotes.put(l);
          }
        }
      }
    });

    const lotesDespues = await listar('lotes');
    expect(stockProducto(lotesDespues, 'p1')).toBe(20); // Stock restaurado al inicial
  });

  it('transaccion fallida no deja datos inconsistentes', async () => {
    const db = getDB();
    const lotesAntes = await listar('lotes');
    const stockAntes = stockProducto(lotesAntes, 'p1');

    try {
      await db.transaction('rw', db.ventas, db.lotes, async () => {
        // Simular venta
        await db.ventas.put({ id: 'v2', fecha: new Date().toISOString(), items: [], total: 0, ganancia: 0, anulada: false });
        // Forzar error
        throw new Error('Error simulado');
      });
    } catch (e) {
      // Esperado
    }

    const lotesDespues = await listar('lotes');
    const ventasDespues = await listar('ventas');
    expect(stockProducto(lotesDespues, 'p1')).toBe(stockAntes);
    expect(ventasDespues.find(v => v.id === 'v2')).toBeUndefined();
  });

  it('FIFO con multiples lotes y ventas parciales', async () => {
    // Reset
    await limpiar('lotes');
    await limpiar('ventas');

    await guardarBulk('lotes', [
      { id: 'l1', productoId: 'p1', productoNombre: 'Producto A', cantidadInicial: 10, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
      { id: 'l2', productoId: 'p1', productoNombre: 'Producto A', cantidadInicial: 10, cantidadVendida: 0, costo: 6, fecha: '2024-01-02' },
    ]);

    const lotes1 = await listar('lotes');
    const res1 = calcFIFO(lotes1, 'p1', 8);
    expect(res1.costoTotal).toBe(40); // 8*5 del lote 1

    // Vender 8 (usando guardar para respetar conversion de centavos)
    await guardar('ventas', { id: 'v3', fecha: new Date().toISOString(), items: [{ productoId: 'p1', nombre: 'A', cantidad: 8, precio: 10, costo: 40, ganancia: 40, lotesUsados: res1.usados }], total: 80, ganancia: 40, anulada: false });
    const l1 = lotes1.find(l => l.id === 'l1');
    l1.cantidadVendida = 8;
    await guardar('lotes', l1);

    const lotes2 = await listar('lotes');
    const res2 = calcFIFO(lotes2, 'p1', 5);
    expect(res2.costoTotal).toBe(28); // 2*5 + 3*6 = 10 + 18 = 28
    expect(res2.usados[0].loteId).toBe('l1');
    expect(res2.usados[1].loteId).toBe('l2');
  });
});
