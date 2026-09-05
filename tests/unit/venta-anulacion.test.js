import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VentaService } from '../../src/services/VentaService.js';
import { abrirDB, getDB, cerrarDB, guardar, listar } from '../../src/core/db.js';
import { nowLocal } from '../../src/core/util.js';

describe('VentaService - Anulacion y FIFO inverso', () => {
  beforeEach(async () => {
    await cerrarDB();
    await abrirDB([
      {
        tablas: {
          ventas: '++id, fecha',
          lotes: '++id, productoId',
          productos: '++id',
          compras: '++id',
          movCaja: '++id',
          config: 'key',
          capital: '++id',
          cierres: '++id',
        },
      },
    ]);
    const db = getDB();
    for (const t of ['ventas', 'lotes', 'productos', 'compras', 'movCaja', 'config', 'capital', 'cierres']) {
      await db.table(t).clear();
    }
  });
  afterEach(async () => {
    await cerrarDB();
  });

  describe('restaurarStockSinLotesUsados()', () => {
    it('restaura stock de un solo lote', async () => {
      const lotes = [
        {
          id: 'l1',
          productoId: 'p1',
          cantidadInicial: 10,
          cantidadVendida: 5,
          costo: 100,
          fecha: '2024-01-01T00:00:00.000Z',
        },
      ];
      const item = { productoId: 'p1', cantidad: 3 };
      const usados = VentaService.restaurarStockSinLotesUsados(item, lotes);
      expect(usados.length).toBe(1);
      expect(usados[0].loteId).toBe('l1');
      expect(usados[0].cantidad).toBe(3);
      expect(lotes[0].cantidadVendida).toBe(2);
    });

    it('restaura stock de multiples lotes cuando el mas reciente no cubre todo', async () => {
      const lotes = [
        {
          id: 'l1',
          productoId: 'p1',
          cantidadInicial: 10,
          cantidadVendida: 2,
          costo: 100,
          fecha: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'l2',
          productoId: 'p1',
          cantidadInicial: 10,
          cantidadVendida: 3,
          costo: 100,
          fecha: '2024-01-02T00:00:00.000Z',
        },
      ];
      const item = { productoId: 'p1', cantidad: 5 };
      const usados = VentaService.restaurarStockSinLotesUsados(item, lotes);
      expect(usados.length).toBe(2);
      expect(usados[0].loteId).toBe('l2');
      expect(usados[0].cantidad).toBe(3);
      expect(usados[1].loteId).toBe('l1');
      expect(usados[1].cantidad).toBe(2);
      expect(lotes[0].cantidadVendida).toBe(0);
      expect(lotes[1].cantidadVendida).toBe(0);
    });

    it('no restaura mas de lo vendido', async () => {
      const lotes = [
        {
          id: 'l1',
          productoId: 'p1',
          cantidadInicial: 10,
          cantidadVendida: 2,
          costo: 100,
          fecha: '2024-01-01T00:00:00.000Z',
        },
      ];
      const item = { productoId: 'p1', cantidad: 5 };
      const usados = VentaService.restaurarStockSinLotesUsados(item, lotes);
      expect(usados.length).toBe(1);
      expect(usados[0].cantidad).toBe(2);
      expect(lotes[0].cantidadVendida).toBe(0);
    });

    it('devuelve array vacio si no hay lotes del producto', async () => {
      const lotes = [
        {
          id: 'l1',
          productoId: 'p2',
          cantidadInicial: 10,
          cantidadVendida: 5,
          costo: 100,
          fecha: '2024-01-01T00:00:00.000Z',
        },
      ];
      const item = { productoId: 'p1', cantidad: 3 };
      const usados = VentaService.restaurarStockSinLotesUsados(item, lotes);
      expect(usados).toEqual([]);
    });

    it('devuelve array vacio si cantidad es cero', async () => {
      const lotes = [
        {
          id: 'l1',
          productoId: 'p1',
          cantidadInicial: 10,
          cantidadVendida: 5,
          costo: 100,
          fecha: '2024-01-01T00:00:00.000Z',
        },
      ];
      const item = { productoId: 'p1', cantidad: 0 };
      const usados = VentaService.restaurarStockSinLotesUsados(item, lotes);
      expect(usados).toEqual([]);
    });
  });

  describe('anular() - con lotesUsados', () => {
    it('restaura stock de lotesUsados', async () => {
      await guardar('lotes', {
        id: 'l1',
        productoId: 'p1',
        cantidadInicial: 10,
        cantidadVendida: 5,
        costo: 100,
        fecha: '2024-01-01T00:00:00.000Z',
      });
      const venta = {
        id: 'v1',
        fecha: nowLocal().iso,
        fechaLocal: nowLocal().local,
        items: [
          {
            productoId: 'p1',
            nombre: 'Prod1',
            cantidad: 3,
            precio: 200,
            costo: 100,
            ganancia: 100,
            lotesUsados: [{ loteId: 'l1', cantidad: 3 }],
          },
        ],
        total: 600,
        ganancia: 300,
        anulada: false,
      };
      await guardar('ventas', venta);
      const lotes = await listar('lotes');
      await VentaService.anular(venta, lotes);
      const ventas = await listar('ventas');
      expect(ventas[0].anulada).toBe(true);
      const lotesAfter = await listar('lotes');
      expect(lotesAfter[0].cantidadVendida).toBe(2);
    });
  });

  describe('anular() - sin lotesUsados (FIFO inverso)', () => {
    it('restaura stock usando FIFO inverso', async () => {
      await guardar('lotes', {
        id: 'l1',
        productoId: 'p1',
        cantidadInicial: 10,
        cantidadVendida: 5,
        costo: 100,
        fecha: '2024-01-01T00:00:00.000Z',
      });
      const venta = {
        id: 'v1',
        fecha: nowLocal().iso,
        fechaLocal: nowLocal().local,
        items: [{ productoId: 'p1', nombre: 'Prod1', cantidad: 3, precio: 200, costo: 100, ganancia: 100 }],
        total: 600,
        ganancia: 300,
        anulada: false,
      };
      await guardar('ventas', venta);
      const lotes = await listar('lotes');
      await VentaService.anular(venta, lotes);
      const ventas = await listar('ventas');
      expect(ventas[0].anulada).toBe(true);
      const lotesAfter = await listar('lotes');
      expect(lotesAfter[0].cantidadVendida).toBe(2);
    });
  });

  describe('procesar() - bloqueo por periodo cerrado', () => {
    it('lanza error si la fecha esta en periodo cerrado', async () => {
      await guardar('cierres', {
        id: 'cr1',
        fechaCierre: '2024-06-01T00:00:00.000Z',
        fechaInicio: '2024-01-01T00:00:00.000Z',
      });
      const { verificarPeriodoCerrado } = await import('../../src/core/periodos.js');
      await expect(verificarPeriodoCerrado('2024-03-15T12:00:00.000Z')).rejects.toThrow(
        'No se puede modificar un periodo cerrado'
      );
    });
  });
});
