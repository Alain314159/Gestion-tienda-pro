import { getDB, guardar, listar } from '../core/db.js';
import { calcFIFO, nowLocal, m, n, q, genId } from '../core/util.js';

/**
 * Servicio de Inventario
 * Encapsula ajustes de stock y calculos FIFO
 */
export const InventarioService = {

  /** Ajuste negativo (merma): reduce stock usando FIFO */
  async ajustarNegativo({ productoId, productoNombre, cantidad, motivo, lotes }) {
    const db = getDB();
    const res = calcFIFO(lotes, productoId, cantidad);
    if (res.error) throw new Error(res.error);

    const ajuste = {
      id: genId('a'),
      fecha: nowLocal().iso, fechaLocal: nowLocal().local,
      productoId, productoNombre,
      cantidad: -cantidad,
      motivo,
      costoPerdida: res.costoTotal,
      lotesUsados: res.usados
    };

    await db.transaction('rw', db.ajustes, db.lotes, async (trans) => {
      await trans.table('ajustes').put(ajuste);
      for (const u of res.usados) {
        const lote = lotes.find(l => l.id === u.loteId);
        if (lote) {
          lote.cantidadVendida = q(n(lote.cantidadVendida) + u.cantidad);
          await trans.table('lotes').put(lote);
        }
      }
    });

    return { ajuste, costoPerdida: res.costoTotal };
  },

  /** Ajuste positivo (sobrante): crea ajuste + lote nuevo */
  async ajustarPositivo({ productoId, productoNombre, productoUnidad, cantidad, motivo, costo }) {
    const db = getDB();
    const ajuste = {
      id: genId('a'),
      fecha: nowLocal().iso, fechaLocal: nowLocal().local,
      productoId, productoNombre,
      cantidad,
      motivo,
      costoPerdida: 0,
      lotesUsados: []
    };
    const lote = {
      id: genId('l'),
      compraId: 'aj-' + ajuste.id,
      productoId, productoNombre, productoUnidad: productoUnidad || '',
      cantidadInicial: cantidad, cantidadVendida: 0,
      costo: n(costo),
      fecha: ajuste.fecha
    };

    await db.transaction('rw', db.ajustes, db.lotes, async (trans) => {
      await trans.table('ajustes').put(ajuste);
      await trans.table('lotes').put(lote);
    });

    return { ajuste, lote };
  },

  async recargar() {
    const [productos, lotes, ajustes] = await Promise.all([
      listar('productos'), listar('lotes'), listar('ajustes')
    ]);
    return { productos, lotes, ajustes };
  }
};
