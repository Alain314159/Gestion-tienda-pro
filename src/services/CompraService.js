import { getDB, guardar, guardarBulk, listar, eliminar } from '../core/db.js';
import { nowLocal, m, n, genId } from '../core/util.js';

/**
 * Servicio de Compras
 * Encapsula logica de compras y lotes
 */
export const CompraService = {

  /** Registra una compra existente (producto ya creado) + lote */
  async registrarExistente({ productoId, nombre, unidad, cantidad, costo, total }) {
    const db = getDB();
    const compra = {
      id: genId('c'),
      fecha: nowLocal().iso, fechaLocal: nowLocal().local,
      productoId, productoNombre: nombre, productoUnidad: unidad,
      cantidad, costo, total, anulada: false, unidad
    };
    const lote = {
      id: genId('l'),
      fecha: nowLocal().iso, fechaLocal: nowLocal().local,
      productoId, productoNombre: nombre, productoUnidad: unidad,
      cantidadInicial: cantidad, cantidadVendida: 0, costo, compraId: compra.id
    };

    await db.transaction('rw', db.compras, db.lotes, async (trans) => {
      await trans.table('compras').put(compra);
      await trans.table('lotes').put(lote);
    });

    return { compra, lote };
  },

  /** Registra compra de producto nuevo: crea producto + compra + lote */
  async registrarNuevo({ nombre, codigo, unidad, cantidad, costo, total, precio, stockMin }) {
    const db = getDB();
    const producto = {
      id: genId('p'),
      nombre: nombre.trim(), codigo: (codigo || '').trim(),
      precio, stockMinimo: n(stockMin) || 5,
      archivado: false, unidad: unidad || ''
    };
    const compra = {
      id: genId('c'),
      fecha: nowLocal().iso, fechaLocal: nowLocal().local,
      productoId: producto.id, productoNombre: producto.nombre,
      productoUnidad: unidad, cantidad, costo, total,
      anulada: false, unidad
    };
    const lote = {
      id: genId('l'),
      fecha: nowLocal().iso, fechaLocal: nowLocal().local,
      productoId: producto.id, productoNombre: producto.nombre,
      productoUnidad: unidad, cantidadInicial: cantidad,
      cantidadVendida: 0, costo, compraId: compra.id
    };

    await db.transaction('rw', db.productos, db.compras, db.lotes, async (trans) => {
      await trans.table('productos').put(producto);
      await trans.table('compras').put(compra);
      await trans.table('lotes').put(lote);
    });

    return { producto, compra, lote };
  },

  /** Edita una compra y su lote asociado */
  async editar(compra, lote, nuevosDatos) {
    const db = getDB();
    const compActualizada = { ...compra, ...nuevosDatos.compra };
    const loteActualizado = { ...lote, ...nuevosDatos.lote };

    await db.transaction('rw', db.compras, db.lotes, async (trans) => {
      await trans.table('compras').put(compActualizada);
      await trans.table('lotes').put(loteActualizado);
    });

    return { compra: compActualizada, lote: loteActualizado };
  },

  /** Elimina compra y su lote (solo si no tiene ventas) */
  async eliminar(compraId, loteId) {
    await eliminar('compras', compraId);
    await eliminar('lotes', loteId);
  },

  async recargar() {
    const [productos, lotes, compras] = await Promise.all([
      listar('productos'), listar('lotes'), listar('compras')
    ]);
    return { productos, lotes, compras };
  }
};
