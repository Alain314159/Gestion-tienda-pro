import { onMount } from 'svelte';
import { bus } from './bus.js';

/** Hook reutilizable para manejar el patron recargar() en modulos Svelte.
 *  Uso: const { recargar, datos } = useRecargar(async () => { ... });
 */
export function useRecargar(fn, options = {}) {
  const { autoMount = true, listenBus = true, busEvent = 'recargar' } = options;
  let cargando = $state(false);
  let error = $state(null);

  async function recargar() {
    cargando = true;
    error = null;
    try {
      await fn();
    } catch (err) {
      console.error('Error en recargar:', err);
      error = err.message || 'Error al cargar datos';
    } finally {
      cargando = false;
    }
  }

  if (autoMount) {
    onMount(() => {
      recargar();
      let off = null;
      if (listenBus) {
        off = bus.on(busEvent, recargar);
      }
      return () => { if (off) off(); };
    });
  }

  return { recargar, cargando, error };
}
