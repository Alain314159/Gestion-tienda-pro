import { getDB, guardar, guardarBulk, listar } from '../core/db.js';
import { calcFIFOVariante, stockVariante, nowLocal, m, n, q, genId, lotesDeVariante, lotesDeProducto } from '../core/util.js';
import { toBig, toNumber, add, sub, mul, Big } from '../core/Money.js';
import { verificarPeriodoCerrado } from '../core/periodos.js';

/**
 * Servicio de Ventas
 * Encapsula toda la logica de negocio de ventas:
 * - Procesar venta con FIFO atomico
 * - Anular venta con restauracion de stock
 * - Los modulos Svelte solo llaman funciones de alto nivel
 */

export const VentaService = {
  /** Procesa una venta completa: calcula FIFO, guarda venta, actualiza lotes. Todo en una transaccion. */
  procesar: async function (carrito, lotes) {
    await verificarPeriodoCerrado(nowLocal().iso);
    const db = getDB();

    // 1. Calcular items, totales y lotes usados (fuera de la transaccion, es solo lectura)
    const items = [];
    let totalRaw = new Big('0');
    let gananciaRaw = new Big('0');
    const lotesUsados = []; // { loteId, cantidad }

    for (const it of carrito) {
      const cant = n(it.cant);
      const precio = toBig(it.precio);
      const fifo = calcFIFOVariante(lotes, it.varianteId, cant);
      if (fifo.error) throw new Error(fifo.error + ' en ' + it.nombre);

      const subtotal = precio.times(toBig(cant)); // sin redondear intermedio
      const itemGanancia = subtotal.minus(toBig(fifo.costoTotal));
      items.push({
        productoId: it.productoId,
        varianteId: it.varianteId,
        nombre: it.nombre,
        cantidad: cant,
        unidad: it.unidad || '',
        precio: toNumber(precio),
        costo: fifo.costoTotal,
        ganancia: toNumber(itemGanancia.round(2, 1)),
        lotesUsados: fifo.usados,
      });
      totalRaw = totalRaw.plus(subtotal);
      gananciaRaw = gananciaRaw.plus(itemGanancia);
      lotesUsados.push(...fifo.usados);
    }

    const total = toNumber(totalRaw.round(2, 1));
    const ganancia = toNumber(gananciaRaw.round(2, 1));

    const venta = {
      id: genId('v'),
      fecha: nowLocal().iso,
      fechaLocal: nowLocal().local,
      items,
      total,
      ganancia,
      anulada: false,
    };

    // 2. Transaccion atomica: guardar venta + actualizar lotes
    await db.transaction('rw', db.ventas, db.lotes, async (trans) => {
      await trans.table('ventas').put(venta);

      for (const u of lotesUsados) {
        const lote = lotes.find((l) => l.id === u.loteId);
        if (lote) {
          lote.cantidadVendida = q(n(lote.cantidadVendida) + u.cantidad);
          await trans.table('lotes').put(lote);
        }
      }
    });

    return { venta, total, ganancia };
  },

  /** Restaura stock de una venta antigua sin lotesUsados usando FIFO inverso.
   *  Busca los lotes mas antiguos y reduce cantidadVendida.
   *  Devuelve array de {loteId, cantidad} para referencia futura.
   */
  restaurarStockSinLotesUsados: function (item, lotes) {
    // Fallback: si hay varianteId usar lotesDeVariante, sino lotesDeProducto (legacy)
    const lotesVar = item.varianteId
      ? lotesDeVariante(lotes, item.varianteId)
      : lotesDeProducto(lotes, item.productoId);
    let rest = n(item.cantidad);
    const usados = [];
    for (let i = lotesVar.length - 1; i >= 0 && rest > 0; i--) {
      const l = lotesVar[i];
      const vendido = n(l.cantidadVendida);
      const devolver = Math.min(vendido, rest);
      if (devolver > 0) {
        l.cantidadVendida = q(vendido - devolver);
        usados.push({ loteId: l.id, cantidad: devolver });
        rest -= devolver;
      }
    }
    return usados;
  },

  /** Anula una venta y restaura el stock. Transaccion atomica. */
  anular: async function (venta, lotes) {
    await verificarPeriodoCerrado(venta.fecha);
    const db = getDB();

    await db.transaction('rw', db.ventas, db.lotes, async (trans) => {
      // Marcar venta como anulada
      await trans.table('ventas').put({
        ...venta,
        anulada: true,
        fechaAnulacion: nowLocal().iso,
      });

      // Restaurar stock en lotes
      for (const item of venta.items) {
        if (item.lotesUsados && item.lotesUsados.length > 0) {
          for (const u of item.lotesUsados) {
            const lote = lotes.find((l) => l.id === u.loteId);
            if (lote) {
              lote.cantidadVendida = Math.max(0, q(n(lote.cantidadVendida) - u.cantidad));
              await trans.table('lotes').put(lote);
            }
          }
        } else {
          // Venta antigua sin lotesUsados: restaurar con FIFO inverso
          const usados = VentaService.restaurarStockSinLotesUsados(item, lotes);
          for (const u of usados) {
            const lote = lotes.find((l) => l.id === u.loteId);
            if (lote) {
              await trans.table('lotes').put(lote);
            }
          }
        }
      }
    });
  },

  /** Recarga datos desde DB (ya con conversion de centavos automatica) */
  recargar: async function () {
    const [productos, lotes, ventas, variantes] = await Promise.all([
      listar('productos'), listar('lotes'), listar('ventas'), listar('productoVariantes')
    ]);
    return { productos, lotes, ventas, variantes };
  },
};
