import { ui } from './ui.svelte.js';
import { processQueue, areWebhooksEnabled } from './api.js';

// Escuchar cambios de conexion: procesar cola de webhooks al volver online (solo si activados)
const onlineHandler = () => {
  ui.offline = false;
  areWebhooksEnabled().then(ok => { if (ok) processQueue().catch(() => {}); });
};
const offlineHandler = () => { ui.offline = true; };
window.addEventListener('online', onlineHandler);
window.addEventListener('offline', offlineHandler);

// Procesar cola periodicamente cada 60s cuando hay conexion (solo si activados)
setInterval(() => {
  if (!ui.offline) {
    areWebhooksEnabled().then(ok => { if (ok) processQueue().catch(() => {}); });
  }
}, 60000);
