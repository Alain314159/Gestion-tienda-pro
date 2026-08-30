import { describe, it, expect } from 'vitest';
import {
  n, m, q, fmt, fmtCant, genId, calcFIFO, stockProducto,
  valorInventario, lotesDeProducto, valorLotesProducto,
  badgeStock, inventarioGrupos, movimientosCaja, saldoCaja,
  gananciaDisponible, topRentables, datosChart6Meses, generarReporte
} from '../../src/core/util.js';

describe('util.js - Motor matematico', () => {
  describe('n() - parser de numeros', () => {
    it('convierte strings a numero', () => {
      expect(n('10.5')).toBe(10.5);
      expect(n('10,5')).toBe(10.5);
    });
    it('maneja null/undefined/empty como 0', () => {
      expect(n(null)).toBe(0);
      expect(n(undefined)).toBe(0);
      expect(n('')).toBe(0);
    });
    it('maneja NaN como 0', () => {
      expect(n('abc')).toBe(0);
    });
  });

  describe('m() - redondeo a 2 decimales', () => {
    it('redondea correctamente', () => {
      expect(m(10.555)).toBe(10.56);
      expect(m(10.554)).toBe(10.55);
    });
  });

  describe('q() - redondeo a 3 decimales', () => {
    it('redondea correctamente', () => {
      expect(q(1.5555)).toBe(1.556);
      expect(q(1.5554)).toBe(1.555);
    });
  });

  describe('fmt() - formato de dinero', () => {
    it('formatea con simbolo', () => {
      expect(fmt(1234.56)).toBe('$1,234.56');
      expect(fmt(0)).toBe('$0.00');
    });
  });

  describe('fmtCant() - formato de cantidad', () => {
    it('enteros sin decimales', () => {
      expect(fmtCant(5)).toBe('5');
    });
    it('decimales limpios', () => {
      expect(fmtCant(5.500)).toBe('5.5');
      expect(fmtCant(5.000)).toBe('5');
    });
  });

  describe('calcFIFO() - costo de ventas', () => {
    const lotes = [
      { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
      { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0, costo: 6, fecha: '2024-01-02' },
    ];

    it('calcula FIFO correctamente', () => {
      const res = calcFIFO(lotes, 'p1', 12);
      expect(res.error).toBeUndefined();
      expect(res.costoTotal).toBe(62); // 10*5 + 2*6
      expect(res.usados.length).toBe(2);
    });

    it('detecta stock insuficiente', () => {
      const res = calcFIFO(lotes, 'p1', 20);
      expect(res.error).toBeDefined();
    });
  });

  describe('stockProducto()', () => {
    it('suma stock disponible', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 3 },
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0 },
      ];
      expect(stockProducto(lotes, 'p1')).toBe(12);
    });
  });

  describe('valorInventario()', () => {
    it('calcula valor total', () => {
      const lotes = [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 3, costo: 5 },
        { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0, costo: 6 },
      ];
      expect(valorInventario(lotes)).toBe(65); // 7*5 + 5*6
    });
  });

  describe('badgeStock()', () => {
    it('detecta agotado', () => {
      expect(badgeStock({ id: 'p1', archivado: false, stockMinimo: 5 }, []).clase).toBe('out');
    });
    it('detecta bajo stock', () => {
      expect(badgeStock({ id: 'p1', archivado: false, stockMinimo: 5 }, [
        { id: 'l1', productoId: 'p1', cantidadInicial: 3, cantidadVendida: 0 }
      ]).clase).toBe('low');
    });
    it('detecta ok', () => {
      expect(badgeStock({ id: 'p1', archivado: false, stockMinimo: 5 }, [
        { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 0 }
      ]).clase).toBe('ok');
    });
    it('detecta archivado', () => {
      expect(badgeStock({ id: 'p1', archivado: true }, []).clase).toBe('arch');
    });
  });

  describe('saldoCaja()', () => {
    it('calcula saldo correcto', () => {
      const data = {
        cfg: { capitalInicial: 100 },
        capital: [{ monto: 50 }],
        ventas: [{ total: 200, anulada: false }, { total: 50, anulada: true }],
        compras: [{ total: 80, anulada: false }],
        retiros: [{ monto: 30 }],
        movCaja: []
      };
      expect(saldoCaja(data)).toBe(240); // 100 + 50 + 200 - 80 - 30
    });
  });

  describe('generarReporte()', () => {
    it('genera reporte correcto', () => {
      // Usar fecha fija para evitar race condition
      const fechaVenta = '2026-01-15T10:00:00.000Z';
      const ventas = [{
        fecha: fechaVenta,
        anulada: false,
        total: 100,
        ganancia: 30,
        items: [{ nombre: 'Test', cantidad: 1, precio: 100, costo: 70, ganancia: 30 }]
      }];
      const rep = generarReporte({ ventas, ajustes: [] }, '2026-01-01', '2026-01-31');
      expect(rep.error).toBeUndefined();
      expect(rep.ingresos).toBe(100);
      expect(rep.bruta).toBe(30);
      expect(rep.numVentas).toBe(1);
    });

    it('detecta fecha invalida', () => {
      const rep = generarReporte({ ventas: [], ajustes: [] }, '2025-12-31', '2025-01-01');
      expect(rep.error).toBeDefined();
    });
  });
});
