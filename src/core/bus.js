const canales = new Map();

export const bus = {
    on(ev, fn) {
        if (!canales.has(ev)) {
            canales.set(ev, new Set());
        }
        canales.get(ev).add(fn);
        return () => {
            const canal = canales.get(ev);
            if (canal) {
                canal.delete(fn);
                if (canal.size === 0) {
                    canales.delete(ev);
                }
            }
        };
    },
    emitir(ev, dato) {
        const canal = canales.get(ev);
        if (canal) {
            canal.forEach(fn => {
                try {
                    fn(dato);
                } catch (err) {
                    console.error(`Error en evento ${ev}:`, err);
                }
            });
        }
    },
    limpiar() {
        canales.clear();
    }
};
