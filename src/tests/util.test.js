import { describe, it, expect } from 'vitest';
import { n, m, calcFIFO, stockProducto, valorInventario } from '../core/util.js';
import { analisisABC, detectarAnomalias } from '../core/analisis.js';
import { estadoPyG, libroDiario, balanceGeneral } from '../core/contabilidad.js';

describe('Motor matematico', () => {
  it('n() convierte strings y null', () => {
    expect(n('10.5')).toBe(10.5);
    expect(n('')).toBe(0);
    expect(n(null)).toBe(0);
    expect(n('abc')).toBe(0);
  });

  it('m() redondea a 2 decimales', () => {
    expect(m(10.555)).toBe(10.56);
    expect(m(10)).toBe(10);
  });
});

describe('FIFO', () => {
  const lotes = [
    { id: 'l1', productoId: 'p1', cantidadInicial: 10, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
    { id: 'l2', productoId: 'p1', cantidadInicial: 5, cantidadVendida: 0, costo: 6, fecha: '2024-01-02' }
  ];

  it('calcula costo FIFO correcto', () => {
    const r = calcFIFO(lotes, 'p1', 12);
    expect(r.error).toBeUndefined();
    expect(r.costoTotal).toBe(62);
    expect(r.usados.length).toBe(2);
  });

  it('detecta stock insuficiente', () => {
    const r = calcFIFO(lotes, 'p1', 20);
    expect(r.error).toContain('Stock insuficiente');
  });
});

describe('Analisis ABC', () => {
  const productos = [{ id: 'p1', nombre: 'A' }, { id: 'p2', nombre: 'B' }];
  const ventas = [
    { anulada: false, fecha: new Date().toISOString(), items: [
      { productoId: 'p1', nombre: 'A', cantidad: 10, precio: 10, ganancia: 50 }
    ]},
    { anulada: false, fecha: new Date().toISOString(), items: [
      { productoId: 'p2', nombre: 'B', cantidad: 2, precio: 10, ganancia: 5 }
    ]}
  ];

  it('clasifica A correctamente', () => {
    const r = analisisABC(productos, ventas, []);
    expect(r[0].catGanancia).toBe('A');
    expect(r[0].nombre).toBe('A');
  });
});

describe('Deteccion de anomalias', () => {
  it('detecta venta con perdida', () => {
    const ventas = [{ anulada: false, fecha: new Date().toISOString(), total: 5, items: [
      { nombre: 'X', precio: 5, cantidad: 1, costo: 10, ganancia: -5 }
    ]}];
    const a = detectarAnomalias(ventas, [], []);
    expect(a.some(x => x.tipo === 'perdida')).toBe(true);
  });
});

describe('Estado PyG', () => {
  it('calcula ganancia neta con gastos', () => {
    const r = estadoPyG({
      ventas: [{ anulada: false, fecha: '2024-01-15', total: 100, items: [{ costo: 40 }] }],
      compras: [], ajustes: [], gastosOp: [{ fecha: '2024-01-15', monto: 10 }]
    }, '2024-01-01', '2024-01-31');
    expect(r.gananciaNeta).toBe(50);
  });
});

describe('Libro diario', () => {
  it('registra movimientos', () => {
    const r = libroDiario({
      ventas: [{ anulada: false, fecha: '2024-01-15', total: 100, id: 'v1' }],
      compras: [], retiros: [], capital: [], gastosOp: [], ajustes: []
    }, '2024-01-01', '2024-01-31');
    expect(r.length).toBe(1);
    expect(r[0].cuenta).toBe('Ventas');
  });
});

describe('Balance general', () => {
  it('calcula activos y patrimonio', () => {
    const r = balanceGeneral({
      cfg: { capitalInicial: 1000 },
      capital: [{ monto: 500 }],
      retiros: [],
      ventas: [],
      compras: [],
      lotes: [{ cantidadInicial: 10, cantidadVendida: 0, costo: 5 }],
      cierres: [{ ganancia: 200 }]
    });
    expect(r.activos.inventario).toBe(50);
    expect(r.patrimonio.capital).toBe(1500);
  });
});
