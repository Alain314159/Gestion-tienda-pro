import { getDB, txPut, listar, eliminar } from '../core/db.js';
import { nowLocal, m, n, genId } from '../core/util.js';
import { verificarPeriodoCerrado } from '../core/periodos.js';

/**
 * Servicio de Compras
 * Encapsula logica de compras y lotes
 */

export const CompraService = {
  /** Registra una compra existente (producto ya creado) + lote */
  registrarExistente: async function ({ productoId, varianteId, nombre, unidad, cantidad, costo, total }) {
    await verificarPeriodoCerrado(nowLocal().iso);
    const db = getDB();
    const compra = {
      id: genId('c'),
      fecha: nowLocal().iso,
      fechaLocal: nowLocal().local,
      productoId,
      varianteId,
      productoNombre: nombre,
      productoUnidad: unidad,
      cantidad,
      costo,
      total,
      anulada: false,
      unidad,
    };
    const lote = {
      id: genId('l'),
      fecha: nowLocal().iso,
      fechaLocal: nowLocal().local,
      productoId,
      varianteId,
      productoNombre: nombre,
      productoUnidad: unidad,
      cantidadInicial: cantidad,
      cantidadVendida: 0,
      costo,
      compraId: compra.id,
    };

    await db.transaction('rw', db.compras, db.lotes, async (trans) => {
      await txPut('compras', compra, trans);
      await txPut('lotes', lote, trans);
    });

    return { compra, lote };
  },

  /** Registra compra de producto nuevo: crea producto + variante + compra + lote */
  registrarNuevo: async function ({ nombre, codigo, unidad, cantidad, costo, total, precio, stockMin }) {
    await verificarPeriodoCerrado(nowLocal().iso);
    const db = getDB();
    const nombreLimpio = nombre.trim().toLowerCase();
    const existente = await db.productos.where('nombre').equals(nombreLimpio).first();
    if (existente) throw new Error('Ya existe un producto con ese nombre');

    const producto = {
      id: genId('p'),
      nombre: nombre.trim(),
      codigo: (codigo || '').trim(),
      archivado: false,
    };
    const variante = {
      id: genId('pv'),
      productoId: producto.id,
      nombre: producto.nombre,
      codigo: producto.codigo,
      unidad: unidad || '',
      precioBase: n(precio),
      stockMinimo: n(stockMin) || 5,
      archivado: false,
      esCaja: false,
      unidadesPorCaja: 0,
      varianteUnidadId: '',
      preciosEscalonados: [],
    };
    const compra = {
      id: genId('c'),
      fecha: nowLocal().iso,
      fechaLocal: nowLocal().local,
      productoId: producto.id,
      varianteId: variante.id,
      productoNombre: producto.nombre,
      productoUnidad: unidad,
      cantidad,
      costo,
      total,
      anulada: false,
      unidad,
    };
    const lote = {
      id: genId('l'),
      fecha: nowLocal().iso,
      fechaLocal: nowLocal().local,
      productoId: producto.id,
      varianteId: variante.id,
      productoNombre: producto.nombre,
      productoUnidad: unidad,
      cantidadInicial: cantidad,
      cantidadVendida: 0,
      costo,
      compraId: compra.id,
    };

    await db.transaction('rw', db.productos, db.productoVariantes, db.compras, db.lotes, async (trans) => {
      await txPut('productos', producto, trans);
      await txPut('productoVariantes', variante, trans);
      await txPut('compras', compra, trans);
      await txPut('lotes', lote, trans);
    });

    return { producto, variante, compra, lote };
  },

  /** Edita una compra y su lote asociado */
  editar: async function (compra, lote, nuevosDatos) {
    await verificarPeriodoCerrado(compra.fecha);
    const db = getDB();
    const compActualizada = { ...compra, ...nuevosDatos.compra };
    const loteActualizado = { ...lote, ...nuevosDatos.lote };

    await db.transaction('rw', db.compras, db.lotes, async (trans) => {
      await txPut('compras', compActualizada, trans);
      await txPut('lotes', loteActualizado, trans);
    });

    return { compra: compActualizada, lote: loteActualizado };
  },

  /** Elimina compra y su lote (solo si no tiene ventas) */
  eliminar: async function (compraId, loteId) {
    const db = getDB();
    const compra = await db.compras.get(compraId);
    if (compra) await verificarPeriodoCerrado(compra.fecha);
    await eliminar('compras', compraId);
    await eliminar('lotes', loteId);
  },

  recargar: async function () {
    const [productos, lotes, compras, variantes] = await Promise.all([
      listar('productos'), listar('lotes'), listar('compras'), listar('productoVariantes')
    ]);
    return { productos, lotes, compras, variantes };
  },
};
