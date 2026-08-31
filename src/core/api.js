// API abierta y webhooks
const WEBHOOKS_KEY = 'webhooks_cfg';

export function getWebhooks() {
  try { return JSON.parse(localStorage.getItem(WEBHOOKS_KEY) || '[]'); } catch { return []; }
}

export function setWebhooks(list) {
  localStorage.setItem(WEBHOOKS_KEY, JSON.stringify(list));
}

export async function triggerWebhook(url, evento, payload) {
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

export async function triggerAll(evento, payload) {
  const hooks = getWebhooks();
  const results = [];
  for (const h of hooks) {
    if (h.activo) {
      const r = await triggerWebhook(h.url, evento, payload);
      results.push({ url: h.url, ...r });
    }
  }
  return results;
}

// REST API local (exportable)
export function exportData(db) {
  const tables = ['productos', 'ventas', 'compras', 'lotes', 'ajustes', 'cierres', 'capital', 'retiros', 'socios', 'gastosOp'];
  const data = {};
  return Promise.all(tables.map(async t => {
    data[t] = await db[t].toArray();
  })).then(() => data);
}
