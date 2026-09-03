import { describe, it, expect } from 'vitest';
import { calcFIFO, stockProducto, valorInventario, lotesDeProducto, valorLotesProducto } from '../../src/core/util.js';

describe('FIFO - Calculo de costo de ventas', () => {
  describe('FIFO basico', () => {
    it('usa un solo lote cuando hay suficiente stock', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
      ];
      const res = calcFIFO(lotes, 'p1', 5);
      expect(res.error).toBeUndefined();
      expect(res.costoTotal).toBe(25);
      expect(res.usados).toEqual([{ loteId: 'l1', cantidad: 5, costo: 5 }]);
    });

    it('usa multiples lotes en orden cronologico', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0, costo: 6, fecha: '2024-01-02' },
      ];
      const res = calcFIFO(lotes, 'p1', 12);
      expect(res.error).toBeUndefined();
      expect(res.costoTotal).toBe(62); // 10*5 + 2*6
      expect(res.usados.length).toBe(2);
      expect(res.usados[0]).toEqual({ loteId: 'l1', cantidad: 10, costo: 5 });
      expect(res.usados[1]).toEqual({ loteId: 'l2', cantidad: 2, costo: 6 });
    });

    it('respeta lotes parcialmente vendidos', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 7, costo: 5, fecha: '2024-01-01' },
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0, costo: 6, fecha: '2024-01-02' },
      ];
      const res = calcFIFO(lotes, 'p1', 5);
      expect(res.error).toBeUndefined();
      expect(res.costoTotal).toBe(27); // 3*5 + 2*6 = 15 + 12 = 27
      expect(res.usados[0].cantidad).toBe(3);
      expect(res.usados[1].cantidad).toBe(2);
    });

    it('detecta stock insuficiente exacto', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
      ];
      const res = calcFIFO(lotes, 'p1', 11);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('Stock insuficiente');
    });

    it('detecta stock insuficiente con lotes parciales', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 5, costo: 5, fecha: '2024-01-01' },
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 2, costo: 6, fecha: '2024-01-02' },
      ];
      const res = calcFIFO(lotes, 'p1', 10);
      expect(res.error).toBeDefined();
    });

    it('maneja cantidades decimales correctamente', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10.5, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
      ];
      const res = calcFIFO(lotes, 'p1', 3.25);
      expect(res.error).toBeUndefined();
      expect(res.costoTotal).toBe(16.25); // 3.25 * 5
    });

    it('ordena por fecha y luego por ID cuando fechas son iguales', () => {
      const lotes = [
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0, costo: 6, fecha: '2024-01-01' },
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
      ];
      const res = calcFIFO(lotes, 'p1', 12);
      expect(res.error).toBeUndefined();
      expect(res.usados[0].loteId).toBe('l1'); // l1 < l2 alfabeticamente
    });
  });

  describe('stockProducto()', () => {
    it('calcula stock total correctamente', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 3 },
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0 },
        { id: 'l3', productoId: 'p1', cantidadInicial: 2, cantidadVendida: 2 },
      ];
      expect(stockProducto(lotes, 'p1')).toBe(12);
    });

    it('devuelve 0 si no hay lotes', () => {
      expect(stockProducto([], 'p1')).toBe(0);
    });

    it('no devuelve negativo si cantidadVendida > inicial', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 10 },
      ];
      expect(stockProducto(lotes, 'p1')).toBe(0);
    });
  });

  describe('valorInventario()', () => {
    it('calcula valor total del inventario', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 3, costo: 5 },
        { id: 'l2', productoId: 'p2', cantidadInicial: 5, cantidadVendida: 0, costo: 6 },
      ];
      expect(valorInventario(lotes)).toBe(65); // 7*5 + 5*6
    });

    it('ignora lotes agotados', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 10, costo: 5 },
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0, costo: 6 },
      ];
      expect(valorInventario(lotes)).toBe(30);
    });
  });

  describe('lotesDeProducto()', () => {
    it('devuelve solo lotes con stock disponible ordenados', () => {
      const lotes = [
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0, costo: 6, fecha: '2024-01-02' },
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
        { id: 'l3', productoId: 'p1', cantidadInicial: 2, cantidadVendida: 2, costo: 4, fecha: '2024-01-03' },
      ];
      const res = lotesDeProducto(lotes, 'p1');
      expect(res.length).toBe(2);
      expect(res[0].id).toBe('l1');
      expect(res[1].id).toBe('l2');
    });
  });

  describe('valorLotesProducto()', () => {
    it('calcula valor de lotes activos de un producto', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 3, costo: 5, fecha: '2024-01-01' },
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0, costo: 6, fecha: '2024-01-02' },
      ];
      expect(valorLotesProducto(lotes, 'p1')).toBe(65); // 7*5 + 5*6
    });
  });
});
