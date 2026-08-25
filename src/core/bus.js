const canales = new Map();
export const bus = {
  on(ev, fn) {
    if (!canales.has(ev)) canales.set(ev, new Set());
    canales.get(ev).add(fn);
    return () => canales.get(ev).delete(fn);
  },
  emitir(ev, dato) { (canales.get(ev) || []).forEach(fn => fn(dato)); }
};
