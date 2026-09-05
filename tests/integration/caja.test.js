import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { abrirDB, getDB, cerrarDB, guardar, listar } from '../../src/core/db.js';
import { CajaService } from '../../src/services/CajaService.js';

describe('Integracion - CajaService', () => {
  beforeAll(async () => {
    await cerrarDB();
    await abrirDB([
      { tablas: { config: 'key', capital: '++id', ventas: '++id', compras: '++id', retiros: '++id', movCaja: '++id', arqueos: '++id', cierres: '++id' } }
    ]);
    const db = getDB();
    await guardar('config', { key: 'cfg', value: { capitalInicial: 100, periodoInicio: new Date().toISOString(), moneda: '$' } });
    await guardar('capital', { id: 'c1', fecha: new Date().toISOString(), monto: 50, nota: 'Aporte' });
    await guardar('ventas', { id: 'v1', fecha: new Date().toISOString(), total: 200, ganancia: 50, anulada: false });
    await guardar('compras', { id: 'cp1', fecha: new Date().toISOString(), total: 80, anulada: false, productoNombre: 'Stock' });
    await guardar('retiros', { id: 'r1', fecha: new Date().toISOString(), monto: 30, concepto: 'Gastos' });
  });

  afterAll(async () => {
    await cerrarDB();
  });

  it('calcularSaldo devuelve saldo correcto', async () => {
    const saldo = await CajaService.calcularSaldo();
    expect(saldo).toBe(240); // 100 + 50 + 200 - 80 - 30
  });

  it('registrarArqueo con diferencia crea movimiento', async () => {
    const res = await CajaService.registrarArqueo({ montoFisico: 250, saldoSistema: 240, nota: 'Arqueo test' });
    expect(res.arqueo).toBeDefined();
    expect(res.arqueo.diferencia).toBe(10);

    const movs = await listar('movCaja');
    const movArqueo = movs.find(m => m.concepto.includes('Sobrante de arqueo'));
    expect(movArqueo).toBeDefined();
    expect(movArqueo.monto).toBe(0.1);
    expect(movArqueo.tipo).toBe('ingreso');
  });

  it('registrarArqueo sin diferencia no crea movimiento', async () => {
    const movsAntes = await listar('movCaja');
    const countAntes = movsAntes.length;

    await CajaService.registrarArqueo({ montoFisico: 240, saldoSistema: 240, nota: 'Arqueo exacto' });

    const movsDespues = await listar('movCaja');
    expect(movsDespues.length).toBe(countAntes);
  });

  it('registrarArqueo con faltante crea movimiento de egreso', async () => {
    const res = await CajaService.registrarArqueo({ montoFisico: 230, saldoSistema: 240, nota: 'Arqueo faltante' });
    expect(res.arqueo.diferencia).toBe(-10);

    const movs = await listar('movCaja');
    const movFaltante = movs.find(m => m.concepto.includes('Faltante de arqueo'));
    expect(movFaltante).toBeDefined();
    expect(movFaltante.monto).toBe(0.1);
    expect(movFaltante.tipo).toBe('egreso');
  });

  it('recargar devuelve todas las entidades', async () => {
    const res = await CajaService.recargar();
    expect(res.cfg).toBeDefined();
    expect(res.ventas.length).toBeGreaterThanOrEqual(1);
    expect(res.arqueos.length).toBeGreaterThanOrEqual(1);
  });
});
