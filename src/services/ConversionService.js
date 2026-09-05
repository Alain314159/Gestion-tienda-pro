import { n, m, q } from '../core/util.js';
import { toBig, toNumber, mul, div, add, sub, round } from '../core/Money.js';

/**
 * Servicio de Conversion entre presentaciones
 * Maneja la logica de cajas ↔ unidades sueltas
 */
export const ConversionService = {
  /**
   * Descompone stock total en cajas completas y unidades sueltas
   */
  descomponerStock: function (stockTotal, unidadesPorCaja) {
    const total = n(stockTotal);
    const porCaja = n(unidadesPorCaja);
    if (porCaja <= 0) return { cajas: 0, unidades: total };
    const cajas = Math.floor(total / porCaja);
    const unidades = toNumber(round(sub(total, mul(cajas, porCaja)), 3));
    return { cajas, unidades };
  },

  /**
   * Convierte unidades a cajas (puede ser decimal)
   */
  unidadesACajas: function (unidades, unidadesPorCaja) {
    const u = n(unidades);
    const c = n(unidadesPorCaja);
    if (c <= 0) return 0;
    return toNumber(round(div(u, c), 3));
  },

  /**
   * Convierte cajas a unidades totales
   */
  cajasAUnidades: function (cajas, unidadesPorCaja) {
    return toNumber(round(mul(n(cajas), n(unidadesPorCaja)), 2));
  },

  /**
   * Verifica si se puede vender una cantidad dada
   */
  puedeVender: function (cantidadSolicitada, stockVariante, stockUnidadSuelta, unidadesPorCaja, esCaja) {
    const req = n(cantidadSolicitada);
    if (esCaja) {
      return req <= n(stockVariante);
    }
    const stockUni = n(stockUnidadSuelta);
    const stockCajas = n(stockVariante);
    const totalDisponible = toNumber(add(stockUni, mul(stockCajas, n(unidadesPorCaja))));
    return req <= totalDisponible;
  },

  /**
   * Calcula costo promedio ponderado de una variante
   */
  costoPromedioVariante: function (lotes, varianteId) {
    const lotesVar = lotes.filter(l => l.varianteId === varianteId && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0);
    let totalCosto = new Big('0');
    let totalCant = new Big('0');
    for (const l of lotesVar) {
      const disp = n(l.cantidadInicial) - n(l.cantidadVendida);
      totalCosto = totalCosto.plus(toBig(disp).times(toBig(l.costo)));
      totalCant = totalCant.plus(toBig(disp));
    }
    return totalCant.gt('0') ? toNumber(totalCosto.div(totalCant).round(2, 1)) : 0;
  },
};
