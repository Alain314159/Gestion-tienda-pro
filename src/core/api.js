// API abierta y webhooks con cola offline persistente (IndexedDB) + reintentos exponenciales

import { getDB, guardar, eliminar, listar, leerConfig } from './db.js';
import { validateWebhookUrl, safeLocalStorage, genId } from './util.js';

const WEBHOOKS_KEY = 'webhooks_cfg';
const MAX_RETRIES = 5;
const RETRY_DELAYS = [5000, 15000, 45000, 120000, 300000]; // 5s, 15s, 45s, 2m, 5m

/** Deduplicacion en memoria: evita encolar el mismo evento+URL dentro de 5s */
const recent = new Map();
function dedupKey(url, evento) { return url + '|' + evento; }
function isDuplicate(url, evento) {
  const k = dedupKey(url, evento);
  const last = recent.get(k);
  if (last && Date.now() - last < 5000) return true;
  recent.set(k, Date.now());
  return false;
}

/** Limpia cache de deduplicacion (para tests) */
export function clearWebhookDedup() {
  recent.clear();
}

export function getWebhooks() {
  return safeLocalStorage.getJSON(WEBHOOKS_KEY, []);
}

export function setWebhooks(list) {
  safeLocalStorage.setJSON(WEBHOOKS_KEY, list);
}

/** Verifica si los webhooks globales estan activados en config (por defecto: desactivados) */
export async function areWebhooksEnabled() {
  try {
    const cfg = await leerConfig('cfg');
    return !!cfg?.webhooksActivos;
  } catch { return false; }
}

/** Encola un webhook en IndexedDB para envio garantizado */
export async function enqueueWebhook(url, evento, payload) {
  if (!(await areWebhooksEnabled())) return { queued: false, reason: 'webhooks desactivados' };
  const validation = validateWebhookUrl(url);
  if (!validation.ok) return { queued: false, reason: validation.error };
  if (isDuplicate(url, evento)) return { queued: false, reason: 'duplicate' };
  const db = getDB();
  const item = {
    id: genId('wh'),
    url,
    evento,
    payload,
    timestamp: new Date().toISOString(),
    intentos: 0,
    ultimoIntento: null,
    estado: 'pendiente'
  };
  await db.webhookQueue.put(item);
  processQueue(); // intenta enviar inmediatamente en background
  return { queued: true, id: item.id };
}

/** Envia un webhook directo (para uso manual/testing). No encola. */
export async function triggerWebhook(url, evento, payload) {
  const validation = validateWebhookUrl(url);
  if (!validation.ok) return { ok: false, error: validation.error };
  const body = JSON.stringify({ evento, payload, timestamp: new Date().toISOString() });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10000)
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Encola webhooks para TODAS las URLs activas configuradas */
export async function triggerAll(evento, payload) {
  if (!(await areWebhooksEnabled())) return [{ ok: false, error: 'webhooks desactivados' }];
  const hooks = getWebhooks();
  const results = [];
  for (const h of hooks) {
    if (h.activo) {
      const r = await enqueueWebhook(h.url, evento, payload);
      results.push({ url: h.url, ...r });
    }
  }
  return results;
}

/** Procesa la cola de webhooks pendientes (llamar al volver online o periodicamente) */
export async function processQueue() {
  try {
    if (!(await areWebhooksEnabled())) return;
    const db = getDB();
    const pendientes = await db.webhookQueue
      .where('estado')
      .equals('pendiente')
      .filter(item => {
        if (item.intentos >= MAX_RETRIES) return false;
        if (!item.ultimoIntento) return true;
        const delay = RETRY_DELAYS[Math.min(item.intentos, RETRY_DELAYS.length - 1)];
        return Date.now() - new Date(item.ultimoIntento).getTime() >= delay;
      })
      .toArray();

    for (const item of pendientes) {
      try {
        const res = await triggerWebhook(item.url, item.evento, item.payload);
        if (res.ok) {
          await db.webhookQueue.update(item.id, { estado: 'enviado', ultimoIntento: new Date().toISOString() });
          // Limpiar enviados antiguos (>7 dias) en background
          setTimeout(() => cleanupOld(), 0);
        } else {
          await db.webhookQueue.update(item.id, {
            intentos: item.intentos + 1,
            ultimoIntento: new Date().toISOString(),
            ultimoError: res.error || `HTTP ${res.status}`
          });
        }
      } catch (e) {
        await db.webhookQueue.update(item.id, {
          intentos: item.intentos + 1,
          ultimoIntento: new Date().toISOString(),
          ultimoError: e.message
        });
      }
    }
  } catch (e) {
    console.error('Error procesando cola de webhooks:', e);
  }
}

/** Limpia webhooks enviados con mas de 7 dias */
export async function cleanupOld() {
  try {
    const db = getDB();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const old = await db.webhookQueue
      .where('estado')
      .equals('enviado')
      .filter(item => item.timestamp < cutoff)
      .primaryKeys();
    if (old.length > 0) await db.webhookQueue.bulkDelete(old);
  } catch (e) { console.error('cleanupOld webhooks:', e); }
}

/** Obtiene estadisticas de la cola */
export async function queueStats() {
  try {
    const db = getDB();
    const all = await db.webhookQueue.toArray();
    return {
      total: all.length,
      pendiente: all.filter(x => x.estado === 'pendiente').length,
      enviado: all.filter(x => x.estado === 'enviado').length,
      fallido: all.filter(x => x.intentos >= MAX_RETRIES).length
    };
  } catch { return { total: 0, pendiente: 0, enviado: 0, fallido: 0 }; }
}

// REST API local (exportable)
export function exportData(db) {
  const tables = ['productos', 'productoVariantes', 'ventas', 'compras', 'lotes', 'ajustes', 'cierres', 'capital', 'retiros', 'socios', 'gastosOp'];
  const data = {};
  return Promise.all(tables.map(async t => {
    data[t] = await db[t].toArray();
  })).then(() => data);
}
