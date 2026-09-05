import { getDB, guardar, listar } from '../core/db.js';
import { calcFIFOVariante, nowLocal, m, n, q, genId } from '../core/util.js';
import { toBig, toNumber, mul, round } from '../core/Money.js';
import { verificarPeriodoCerrado } from '../core/periodos.js';

/**
 * Servicio de Inventario
 * Encapsula ajustes de stock y calculos FIFO
 */

export const InventarioService = {
  /** Ajuste negativo (merma): reduce stock usando FIFO */
  ajustarNegativo: async function ({ productoId, varianteId, productoNombre, cantidad, motivo, lotes }) {
    await verificarPeriodoCerrado(nowLocal().iso);
    const db = getDB();
    const res = calcFIFOVariante(lotes, varianteId, cantidad);
    if (res.error) throw new Error(res.error);

    const ajuste = {
      id: genId('a'),
      fecha: nowLocal().iso,
      fechaLocal: nowLocal().local,
      productoId,
      varianteId,
      productoNombre,
      cantidad: -cantidad,
      motivo,
      costoPerdida: res.costoTotal,
      lotesUsados: res.usados,
    };

    await db.transaction('rw', db.ajustes, db.lotes, async (trans) => {
      await trans.table('ajustes').put(ajuste);
      for (const u of res.usados) {
        const lote = lotes.find((l) => l.id === u.loteId);
        if (lote) {
          lote.cantidadVendida = q(n(lote.cantidadVendida) + u.cantidad);
          await trans.table('lotes').put(lote);
        }
      }
    });

    return { ajuste, costoPerdida: res.costoTotal };
  },

  /** Ajuste positivo (sobrante): crea ajuste + lote nuevo
   *  El costoPerdida guarda el valor del sobrante para reflejarlo
   *  contablemente como reduccion de COGS o ingreso extraordinario.
   */
  ajustarPositivo: async function ({ productoId, varianteId, productoNombre, productoUnidad, cantidad, motivo, costo }) {
    await verificarPeriodoCerrado(nowLocal().iso);
    const cant = n(cantidad);
    const cst = toBig(costo);
    if (toNumber(cst) <= 0) throw new Error('El costo debe ser mayor a cero');
    if (cant <= 0) throw new Error('La cantidad debe ser mayor a cero');
    const db = getDB();
    const valorSobrante = toNumber(round(mul(cant, cst), 2));
    const ajuste = {
      id: genId('a'),
      fecha: nowLocal().iso,
      fechaLocal: nowLocal().local,
      productoId,
      varianteId,
      productoNombre,
      cantidad: cant,
      motivo,
      costoPerdida: valorSobrante,
      lotesUsados: [],
    };
    const lote = {
      id: genId('l'),
      compraId: 'aj-' + ajuste.id,
      productoId,
      varianteId,
      productoNombre,
      productoUnidad: productoUnidad || '',
      cantidadInicial: cant,
      cantidadVendida: 0,
      costo: toNumber(cst),
      fecha: ajuste.fecha,
    };

    await db.transaction('rw', db.ajustes, db.lotes, async (trans) => {
      await trans.table('ajustes').put(ajuste);
      await trans.table('lotes').put(lote);
    });

    return { ajuste, lote };
  },

  recargar: async function () {
    const [productos, lotes, ajustes, variantes] = await Promise.all([
      listar('productos'), listar('lotes'), listar('ajustes'), listar('productoVariantes')
    ]);
    return { productos, lotes, ajustes, variantes };
  },
};
