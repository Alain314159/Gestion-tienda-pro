import { avisar } from './state.svelte.js';
import { listar, leerConfig } from './db.js';
import { stockProducto } from './util.js';

export async function checkNotificacionesGlobales() {
  try {
    const [productos, lotes, ventas, arqueos, cfg] = await Promise.all([
      listar('productos'), listar('lotes'), listar('ventas'), listar('arqueos'), leerConfig('cfg')
    ]);

    const ahora = new Date();
    const hora = ahora.getHours();

    const bajo = productos.filter(p => {
      if (p.archivado) return false;
      const s = stockProducto(lotes, p.id);
      return s > 0 && s <= (p.stockMinimo || 5);
    });
    if (bajo.length > 0) {
      avisar(`${bajo.length} producto(s) con stock bajo`, 'warn');
    }

    if (hora === 20 && !localStorage.getItem('arqueoHoy')) {
      avisar('Es hora de hacer el arqueo de caja', 'warn');
      localStorage.setItem('arqueoHoy', ahora.toISOString().slice(0, 10));
    }
    if (hora !== 20) localStorage.removeItem('arqueoHoy');

    const inicio = new Date(cfg?.periodoInicio || ahora);
    const dias = (ahora - inicio) / (1000 * 60 * 60 * 24);
    if (dias > 30) {
      avisar(`Periodo abierto hace ${Math.floor(dias)} dias. Considera cerrar.`, 'warn');
    }
  } catch (e) { console.error('checkNotificacionesGlobales', e); }
}
