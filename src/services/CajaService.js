import { getDB, guardar, listar } from '../core/db.js';
import { saldoCaja, nowLocal, m, n, genId } from '../core/util.js';

/**
 * Servicio de Caja
 * Encapsula arqueos, movimientos y calculos de saldo
 */
export const CajaService = {

  /** Registra un arqueo y crea movimiento de ajuste si hay diferencia */
  async registrarArqueo({ montoFisico, saldoSistema, nota }) {
    const db = getDB();
    const diff = m(montoFisico - saldoSistema);
    const nl = nowLocal();

    const arqueo = {
      id: genId('aq'),
      fecha: nl.iso, fechaLocal: nl.local,
      montoFisico, saldoSistema, diferencia: diff, nota
    };

    await db.transaction('rw', db.arqueos, db.movCaja, async (trans) => {
      await trans.table('arqueos').put(arqueo);

      if (Math.abs(diff) > 0.01) {
        const mov = {
          id: genId('mc'),
          fecha: nl.iso, fechaLocal: nl.local,
          tipo: diff > 0 ? 'ingreso' : 'egreso',
          monto: Math.abs(diff),
          concepto: (diff > 0 ? 'Sobrante' : 'Faltante') + ' de arqueo',
          nota
        };
        await trans.table('movCaja').put(mov);
      }
    });

    return { arqueo, diff };
  },

  /** Calcula saldo actual de caja */
  async calcularSaldo() {
    const [cfg, capital, ventas, compras, retiros, movCaja] = await Promise.all([
      listar('config').then(c => c.find(x => x.key === 'cfg')?.value || {}),
      listar('capital'), listar('ventas'), listar('compras'),
      listar('retiros'), listar('movCaja')
    ]);
    return saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja });
  },

  async recargar() {
    const [cfg, capital, ventas, compras, retiros, movCaja, arqueos] = await Promise.all([
      listar('config').then(c => c.find(x => x.key === 'cfg')?.value || {}),
      listar('capital'), listar('ventas'), listar('compras'),
      listar('retiros'), listar('movCaja'), listar('arqueos')
    ]);
    return { cfg, capital, ventas, compras, retiros, movCaja, arqueos };
  }
};
