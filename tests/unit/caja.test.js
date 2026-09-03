import { describe, it, expect } from 'vitest';
import { saldoCaja, gananciaDisponible, movimientosCaja } from '../../src/core/util.js';

describe('Caja - Calculos financieros', () => {
  describe('saldoCaja()', () => {
    it('calcula saldo basico correctamente', () => {
      const data = {
        cfg: { capitalInicial: 100 },
        capital: [{ monto: 50 }],
        ventas: [{ total: 200, anulada: false }],
        compras: [{ total: 80, anulada: false }],
        retiros: [{ monto: 30 }],
        movCaja: []
      };
      expect(saldoCaja(data)).toBe(240); // 100 + 50 + 200 - 80 - 30
    });

    it('ignora ventas anuladas', () => {
      const data = {
        cfg: { capitalInicial: 0 },
        capital: [],
        ventas: [
          { total: 100, anulada: false },
          { total: 50, anulada: true }
        ],
        compras: [],
        retiros: [],
        movCaja: []
      };
      expect(saldoCaja(data)).toBe(100);
    });

    it('ignora compras anuladas', () => {
      const data = {
        cfg: { capitalInicial: 0 },
        capital: [],
        ventas: [],
        compras: [
          { total: 100, anulada: false },
          { total: 50, anulada: true }
        ],
        retiros: [],
        movCaja: []
      };
      expect(saldoCaja(data)).toBe(-100);
    });

    it('maneja arqueos como ajustes de saldo', () => {
      const data = {
        cfg: { capitalInicial: 100 },
        capital: [],
        ventas: [],
        compras: [],
        retiros: [],
        movCaja: [
          { tipo: 'ingreso', monto: 10, concepto: 'Arqueo sobrante' },
          { tipo: 'egreso', monto: 5, concepto: 'Arqueo faltante' }
        ]
      };
      expect(saldoCaja(data)).toBe(105); // 100 + 10 - 5
    });

    it('no afecta arqueos si el concepto no contiene "arqueo"', () => {
      const data = {
        cfg: { capitalInicial: 100 },
        capital: [],
        ventas: [],
        compras: [],
        retiros: [],
        movCaja: [
          { tipo: 'ingreso', monto: 10, concepto: 'Otro ingreso' }
        ]
      };
      expect(saldoCaja(data)).toBe(100);
    });

    it('maneja valores nulos y undefined', () => {
      const data = {
        cfg: { capitalInicial: null },
        capital: [{ monto: undefined }],
        ventas: [{ total: '', anulada: false }],
        compras: [],
        retiros: [],
        movCaja: []
      };
      expect(saldoCaja(data)).toBe(0);
    });
  });

  describe('gananciaDisponible()', () => {
    it('calcula ganancia neta basica', () => {
      const data = {
        cfg: { capitalInicial: 100 },
        capital: [],
        ventas: [{ total: 200, ganancia: 50, anulada: false, fecha: new Date().toISOString() }],
        compras: [],
        retiros: [],
        movCaja: [],
        ajustes: [],
        cierres: [],
        lotes: [],
        periodoInicio: new Date(Date.now() - 86400000).toISOString()
      };
      expect(gananciaDisponible(data)).toBeGreaterThan(0);
    });

    it('no permite ganancia negativa', () => {
      const data = {
        cfg: { capitalInicial: 100 },
        capital: [],
        ventas: [],
        compras: [],
        retiros: [{ monto: 50 }],
        movCaja: [],
        ajustes: [],
        cierres: [],
        lotes: [],
        periodoInicio: new Date(Date.now() - 86400000).toISOString()
      };
      expect(gananciaDisponible(data)).toBe(0);
    });

    it('respeta el periodo de inicio', () => {
      const fechaVieja = new Date('2020-01-01').toISOString();
      const fechaReciente = new Date().toISOString();
      const data = {
        cfg: { capitalInicial: 0 },
        capital: [],
        ventas: [
          { total: 100, ganancia: 30, anulada: false, fecha: fechaVieja },
          { total: 200, ganancia: 50, anulada: false, fecha: fechaReciente }
        ],
        compras: [],
        retiros: [],
        movCaja: [],
        ajustes: [],
        cierres: [],
        lotes: [],
        periodoInicio: new Date(Date.now() - 86400000).toISOString()
      };
      const ganancia = gananciaDisponible(data);
      // Solo deberia contar la venta reciente
      expect(ganancia).toBeLessThanOrEqual(50);
    });
  });

  describe('movimientosCaja()', () => {
    it('genera movimientos desnormalizados ordenados', () => {
      const data = {
        cfg: { capitalInicial: 100, periodoInicio: '2024-01-01' },
        capital: [{ id: 'c1', fecha: '2024-01-02', monto: 50, nota: 'Inicial' }],
        ventas: [{ id: 'v1', fecha: '2024-01-03', total: 200, anulada: false }],
        compras: [{ id: 'cp1', fecha: '2024-01-04', total: 80, anulada: false, productoNombre: 'Prod' }],
        retiros: [{ id: 'r1', fecha: '2024-01-05', monto: 30, concepto: 'Gasto' }],
        movCaja: [{ id: 'm1', fecha: '2024-01-06', tipo: 'ingreso', monto: 10, concepto: 'Extra' }]
      };
      const movs = movimientosCaja(data);
      expect(movs.length).toBe(6);
      expect(movs[0].fecha).toBe('2024-01-06'); // Orden descendente
      expect(movs[5].fecha).toBe('2024-01-01');
    });

    it('ignora ventas anuladas', () => {
      const data = {
        cfg: { capitalInicial: 0, periodoInicio: '2024-01-01' },
        capital: [],
        ventas: [{ id: 'v1', fecha: '2024-01-02', total: 100, anulada: true }],
        compras: [],
        retiros: [],
        movCaja: []
      };
      const movs = movimientosCaja(data);
      expect(movs.length).toBe(0);
    });

    it('ignora compras anuladas', () => {
      const data = {
        cfg: { capitalInicial: 0, periodoInicio: '2024-01-01' },
        capital: [],
        ventas: [],
        compras: [{ id: 'c1', fecha: '2024-01-02', total: 100, anulada: true, productoNombre: 'X' }],
        retiros: [],
        movCaja: []
      };
      const movs = movimientosCaja(data);
      expect(movs.length).toBe(0);
    });

    it('formatea conceptos correctamente', () => {
      const data = {
        cfg: { capitalInicial: 0, periodoInicio: '2024-01-01' },
        capital: [{ id: 'c1', fecha: '2024-01-02', monto: 50, nota: 'Aporte socio' }],
        ventas: [],
        compras: [],
        retiros: [{ id: 'r1', fecha: '2024-01-03', monto: 30, concepto: 'Luz' }],
        movCaja: []
      };
      const movs = movimientosCaja(data);
      expect(movs.find(m => m.id === 'c1').concepto).toBe('Aporte · Aporte socio');
      expect(movs.find(m => m.id === 'r1').concepto).toBe('Retiro · Luz');
    });
  });
});
