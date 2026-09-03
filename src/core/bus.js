/** Event bus tipado con constantes de eventos conocidos para evitar errores de typo.
 *  Uso:
 *    import { bus, EVENTOS } from './bus.js';
 *    bus.on(EVENTOS.RECARGAR, () => { ... });
 *    bus.emit(EVENTOS.RECARGAR);
 */

/** Eventos conocidos de la aplicación. Usar estas constantes en vez de strings raw. */
export const EVENTOS = Object.freeze({
  RECARGAR: 'recargar',
  VENTA_REALIZADA: 'venta:realizada',
  COMPRA_REALIZADA: 'compra:realizada',
  PRODUCTO_GUARDADO: 'producto:guardado',
  AJUSTE_REALIZADO: 'ajuste:realizado',
  CAJA_ACTUALIZADA: 'caja:actualizada',
  CONFIG_GUARDADA: 'config:guardada',
  NOTIFICACION: 'notificacion',
  SYNC_BLUETOOTH: 'sync:bluetooth',
});

const listeners = new Map();

function validarEvento(event) {
  if (typeof event !== 'string' || event.length === 0) {
    throw new TypeError(`Evento invalido: "${event}". Debe ser un string no vacio.`);
  }
}

export const bus = {
  /** Suscribe un callback a un evento. Devuelve funcion para desuscribir. */
  on(event, cb) {
    validarEvento(event);
    if (typeof cb !== 'function') {
      throw new TypeError('El callback debe ser una funcion');
    }
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(cb);
    return () => listeners.get(event)?.delete(cb);
  },

  /** Emite un evento a todos los suscriptores. */
  emit(event, data) {
    validarEvento(event);
    const cbs = listeners.get(event);
    if (!cbs) return;
    cbs.forEach(cb => {
      try { cb(data); } catch (e) { console.error(`Bus error en "${event}":`, e); }
    });
  },

  /** Desuscribe un callback especifico de un evento. */
  off(event, cb) {
    validarEvento(event);
    listeners.get(event)?.delete(cb);
  },

  /** Suscribe un callback que solo se ejecuta una vez. */
  once(event, cb) {
    validarEvento(event);
    const wrapper = (data) => {
      bus.off(event, wrapper);
      cb(data);
    };
    return bus.on(event, wrapper);
  },

  /** Devuelve true si hay suscriptores para un evento. Util para debugging. */
  hasListeners(event) {
    validarEvento(event);
    return listeners.has(event) && listeners.get(event).size > 0;
  },

  /** Limpia todos los listeners (util en tests). */
  clear() {
    listeners.clear();
  }
};
