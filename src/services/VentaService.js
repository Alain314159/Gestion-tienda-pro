import { getDB, guardar, guardarBulk, listar } from '../core/db.js';
import { calcFIFO, stockProducto, nowLocal, m, n, q, genId } from '../core/util.js';

/**
 * Servicio de Ventas
 * Encapsula toda la logica de negocio de ventas:
 * - Procesar venta con FIFO atomico
 * - Anular venta con restauracion de stock
 * - Los modulos Svelte solo llaman funciones de alto nivel
 */

export const VentaService = {

  /** Procesa una venta completa: calcula FIFO, guarda venta, actualiza lotes. Todo en una transaccion. */
  async procesar(carrito, lotes) {
    const db = getDB();

    // 1. Calcular items, totales y lotes usados (fuera de la transaccion, es solo lectura)
    const items = [];
    let total = 0, ganancia = 0;
    const lotesUsados = []; // { loteId, cantidad }

    for (const it of carrito) {
      const cant = n(it.cant), precio = n(it.precio);
      const fifo = calcFIFO(lotes, it.productoId, cant);
      if (fifo.error) throw new Error(fifo.error + ' en ' + it.nombre);

      const subtotal = m(precio * cant);
      items.push({
        productoId: it.productoId,
        nombre: it.nombre,
        cantidad: cant,
        unidad: it.unidad || '',
        precio,
        costo: fifo.costoTotal,
        ganancia: m(subtotal - fifo.costoTotal),
        lotesUsados: fifo.usados
      });
      total = m(total + subtotal);
      ganancia = m(ganancia + (subtotal - fifo.costoTotal));
      lotesUsados.push(...fifo.usados);
    }

    const venta = {
      id: genId('v'),
      fecha: nowLocal().iso,
      fechaLocal: nowLocal().local,
      items,
      total,
      ganancia,
      anulada: false
    };

    // 2. Transaccion atomica: guardar venta + actualizar lotes
    await db.transaction('rw', db.ventas, db.lotes, async (trans) => {
      await trans.table('ventas').put(venta);

      for (const u of lotesUsados) {
        const lote = lotes.find(l => l.id === u.loteId);
        if (lote) {
          lote.cantidadVendida = q(n(lote.cantidadVendida) + u.cantidad);
          await trans.table('lotes').put(lote);
        }
      }
    });

    return { venta, total, ganancia };
  },

  /** Anula una venta y restaura el stock. Transaccion atomica. */
  async anular(venta, lotes) {
    const db = getDB();

    await db.transaction('rw', db.ventas, db.lotes, async (trans) => {
      // Marcar venta como anulada
      await trans.table('ventas').put({
        ...venta,
        anulada: true,
        fechaAnulacion: nowLocal().iso
      });

      // Restaurar stock en lotes
      for (const item of venta.items) {
        if (!item.lotesUsados) continue;
        for (const u of item.lotesUsados) {
          const lote = lotes.find(l => l.id === u.loteId);
          if (lote) {
            lote.cantidadVendida = Math.max(0, q(n(lote.cantidadVendida) - u.cantidad));
            await trans.table('lotes').put(lote);
          }
        }
      }
    });
  },

  /** Recarga datos desde DB (ya con conversion de centavos automatica) */
  async recargar() {
    const [productos, lotes, ventas] = await Promise.all([
      listar('productos'),
      listar('lotes'),
      listar('ventas')
    ]);
    return { productos, lotes, ventas };
  }
};
