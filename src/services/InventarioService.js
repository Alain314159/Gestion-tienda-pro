import { getDB, guardar, listar } from '../core/db.js';
import { calcFIFOVariante, nowLocal, m, n, q, genId } from '../core/util.js';
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

  /** Ajuste positivo (sobrante): crea ajuste + lote nuevo */
  ajustarPositivo: async function ({ productoId, varianteId, productoNombre, productoUnidad, cantidad, motivo, costo }) {
    await verificarPeriodoCerrado(nowLocal().iso);
    if (n(costo) <= 0) throw new Error('El costo debe ser mayor a cero');
    if (n(cantidad) <= 0) throw new Error('La cantidad debe ser mayor a cero');
    const db = getDB();
    const ajuste = {
      id: genId('a'),
      fecha: nowLocal().iso,
      fechaLocal: nowLocal().local,
      productoId,
      varianteId,
      productoNombre,
      cantidad,
      motivo,
      costoPerdida: 0,
      lotesUsados: [],
    };
    const lote = {
      id: genId('l'),
      compraId: 'aj-' + ajuste.id,
      productoId,
      varianteId,
      productoNombre,
      productoUnidad: productoUnidad || '',
      cantidadInicial: cantidad,
      cantidadVendida: 0,
      costo: n(costo),
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
