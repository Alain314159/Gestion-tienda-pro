import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { abrirDB, getDB, cerrarDB } from '../../src/core/db.js';
import { enqueueWebhook, processQueue, queueStats, triggerWebhook, clearWebhookDedup } from '../../src/core/api.js';

describe('Webhook Queue - Cola offline persistente', () => {
  beforeAll(async () => {
    await cerrarDB();
    await abrirDB([
      { tablas: { webhookQueue: '++id, estado, fecha' } }
    ]);
  });

  afterAll(async () => {
    await cerrarDB();
  });

  beforeEach(async () => {
    clearWebhookDedup();
    const db = getDB();
    await db.webhookQueue.clear();
  });

  it('encola un webhook correctamente', async () => {
    const res = await enqueueWebhook('https://example.com/hook', 'venta', { total: 100 });
    expect(res.queued).toBe(true);
    expect(res.id).toBeDefined();

    const db = getDB();
    const items = await db.webhookQueue.toArray();
    expect(items.length).toBe(1);
    expect(items[0].estado).toBe('pendiente');
    expect(items[0].intentos).toBe(0);
  });

  it('deduplica eventos duplicados dentro de 5 segundos', async () => {
    await enqueueWebhook('https://example.com/hook', 'venta', { total: 100 });
    const res2 = await enqueueWebhook('https://example.com/hook', 'venta', { total: 100 });
    expect(res2.queued).toBe(false);
    expect(res2.reason).toBe('duplicate');

    const db = getDB();
    const items = await db.webhookQueue.toArray();
    expect(items.length).toBe(1);
  });

  it('permite eventos diferentes a la misma URL', async () => {
    await enqueueWebhook('https://example.com/hook', 'venta', { total: 100 });
    const res2 = await enqueueWebhook('https://example.com/hook', 'compra', { total: 50 });
    expect(res2.queued).toBe(true);

    const db = getDB();
    const items = await db.webhookQueue.toArray();
    expect(items.length).toBe(2);
  });

  it('stats reflejan estado correcto', async () => {
    await enqueueWebhook('https://a.com', 'venta', {});
    await enqueueWebhook('https://b.com', 'compra', {});
    const stats = await queueStats();
    expect(stats.total).toBe(2);
    expect(stats.pendiente).toBe(2);
    expect(stats.enviado).toBe(0);
    expect(stats.fallido).toBe(0);
  });

  it('triggerWebhook directo no encola', async () => {
    // Mock fetch para que falle
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const res = await triggerWebhook('https://example.com', 'test', {});
    expect(res.ok).toBe(false);

    const db = getDB();
    const items = await db.webhookQueue.toArray();
    expect(items.length).toBe(0);
  });
});
