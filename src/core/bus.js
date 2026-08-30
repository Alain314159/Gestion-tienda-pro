/** Event bus simple para comunicación entre módulos */
const listeners = new Map();

export const bus = {
  on(event, cb) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(cb);
    return () => listeners.get(event)?.delete(cb);
  },
  emit(event, data) {
    listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error('Bus error:', e); }
    });
  },
  off(event, cb) {
    listeners.get(event)?.delete(cb);
  }
};
