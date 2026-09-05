import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Dexie from "dexie";
import {
  abrirDB, getDB, cerrarDB, guardar, listar, listarActivos, obtenerActivo,
  contarActivos, eliminarLogico, restaurarLogico, getDeltaChanges,
  applyDeltaChanges, getSyncState, setSyncState, getAllSyncStates,
  addToSyncLog, getPendingSyncLog, markSyncLogStatus, cleanSyncLog,
  getSyncSchemaHash, getSyncableTablesOrdered,
  esTablaSyncable, SYNCABLE_TABLES, SYNC_DEPENDENCY_ORDER, getDeviceId,
  DB_NAME,
} from "../../src/core/db.js";
import {
  MergeStrategy, getMergeStrategy, createMessage, MsgType,
} from "../../src/core/sync-engine.js";

const localStorageMock = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  removeItem(key) { delete this.store[key]; },
};
vi.stubGlobal("localStorage", localStorageMock);

describe("db.js — Sincronizacion y Delta Sync", () => {
  beforeEach(async () => {
    await cerrarDB();
    try { await Dexie.delete(DB_NAME); } catch {}
    localStorageMock.store = {};
  });
  afterEach(async () => {
    await cerrarDB();
    localStorageMock.store = {};
  });

  describe("getDeviceId", () => {
    it("genera un ID unico persistente", () => {
      const id1 = getDeviceId();
      const id2 = getDeviceId();
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^dev-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
    });
    it("recupera de localStorage si ya existe", () => {
      localStorageMock.setItem("tienda-pro-device-id", "dev-test-123");
      expect(getDeviceId()).toBe("dev-test-123");
    });
  });

  describe("Sync hooks", () => {
    it("al crear, agrega updatedAt, updatedBy, version=1, deletedAt=null", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await guardar("productos", { id: "p1", nombre: "Producto A" });
      const item = await db.productos.get("p1");
      expect(item.updatedAt).toBeDefined();
      expect(item.updatedBy).toBe(getDeviceId());
      expect(item.version).toBe(1);
      expect(item.deletedAt).toBeNull();
    });
    it("al actualizar, incrementa version y actualiza updatedAt", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await guardar("productos", { id: "p1", nombre: "A" });
      const before = await db.productos.get("p1");
      await new Promise((r) => setTimeout(r, 10));
      await db.productos.update("p1", { nombre: "B" });
      const after = await db.productos.get("p1");
      expect(after.version).toBe(2);
      expect(after.updatedAt).not.toBe(before.updatedAt);
    });
  });

  describe("Soft Delete", () => {
    it("eliminarLogico marca deletedAt sin borrar fisicamente", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await guardar("productos", { id: "p1", nombre: "A" });
      const result = await eliminarLogico("productos", "p1");
      expect(result.ok).toBe(true);
      const item = await db.productos.get("p1");
      expect(item.deletedAt).not.toBeNull();
    });
    it("listarActivos oculta registros eliminados", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await guardar("productos", { id: "p1", nombre: "A" });
      await guardar("productos", { id: "p2", nombre: "B" });
      await eliminarLogico("productos", "p1");
      const activos = await listarActivos("productos");
      expect(activos.length).toBe(1);
      expect(activos[0].nombre).toBe("B");
    });
    it("obtenerActivo devuelve null para eliminados", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await guardar("productos", { id: "p1", nombre: "A" });
      await eliminarLogico("productos", "p1");
      expect(await obtenerActivo("productos", "p1")).toBeNull();
    });
    it("contarActivos cuenta solo no eliminados", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await guardar("productos", { id: "p1", nombre: "A" });
      await guardar("productos", { id: "p2", nombre: "B" });
      await guardar("productos", { id: "p3", nombre: "C" });
      await eliminarLogico("productos", "p2");
      expect(await contarActivos("productos")).toBe(2);
    });
    it("restaurarLogico quita deletedAt", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await guardar("productos", { id: "p1", nombre: "A" });
      await eliminarLogico("productos", "p1");
      const result = await restaurarLogico("productos", "p1");
      expect(result.ok).toBe(true);
      expect((await db.productos.get("p1")).deletedAt).toBeNull();
    });
    it("eliminarLogico devuelve error si no existe", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      const result = await eliminarLogico("productos", "no-existe");
      expect(result.ok).toBe(false);
    });
  });

  describe("getDeltaChanges", () => {
    it("devuelve solo registros con updatedAt posterior al since", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      const t1 = new Date(Date.now() - 2000).toISOString();
      const t2 = new Date(Date.now() - 1000).toISOString();
      const t3 = new Date().toISOString();
      await db.productos.put({ id: "p1", nombre: "A", updatedAt: t1, updatedBy: "dev-a", version: 1, deletedAt: null });
      await db.productos.put({ id: "p2", nombre: "B", updatedAt: t2, updatedBy: "dev-a", version: 1, deletedAt: null });
      await db.productos.put({ id: "p3", nombre: "C", updatedAt: t3, updatedBy: "dev-a", version: 1, deletedAt: null });
      const changes = await getDeltaChanges("productos", t2, 0);
      expect(changes.length).toBe(1);
      expect(changes[0].id).toBe("p3");
    });
    it("usa version como tie-breaker", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      const t = new Date().toISOString();
      await db.productos.put({ id: "p1", nombre: "A", updatedAt: t, updatedBy: "dev-a", version: 1, deletedAt: null });
      await db.productos.put({ id: "p2", nombre: "B", updatedAt: t, updatedBy: "dev-a", version: 3, deletedAt: null });
      const changes = await getDeltaChanges("productos", t, 1);
      expect(changes.length).toBe(1);
      expect(changes[0].id).toBe("p2");
    });
    it("ordena por updatedAt ASC, version ASC", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await db.productos.put({ id: "p1", nombre: "A", updatedAt: "2026-09-05T10:00:00.000Z", updatedBy: "dev-a", version: 2, deletedAt: null });
      await db.productos.put({ id: "p2", nombre: "B", updatedAt: "2026-09-05T09:00:00.000Z", updatedBy: "dev-a", version: 5, deletedAt: null });
      await db.productos.put({ id: "p3", nombre: "C", updatedAt: "2026-09-05T10:00:00.000Z", updatedBy: "dev-a", version: 1, deletedAt: null });
      const changes = await getDeltaChanges("productos", "1970-01-01T00:00:00.000Z", 0);
      expect(changes[0].id).toBe("p2");
      expect(changes[1].id).toBe("p3");
      expect(changes[2].id).toBe("p1");
    });
  });

  describe("applyDeltaChanges — LWW", () => {
    it("inserta registros nuevos", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      const changes = [{ id: "p1", nombre: "Remoto", updatedAt: "2026-09-05T12:00:00.000Z", updatedBy: "dev-r", version: 1, deletedAt: null }];
      const result = await applyDeltaChanges("productos", changes, "dev-r");
      expect(result.inserted).toBe(1);
      expect((await db.productos.get("p1")).nombre).toBe("Remoto");
    });
    it("actualiza cuando remoto es mas nuevo", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await db.productos.put({ id: "p1", nombre: "Local", updatedAt: "2026-09-05T10:00:00.000Z", updatedBy: "dev-l", version: 1, deletedAt: null });
      const changes = [{ id: "p1", nombre: "Remoto", updatedAt: "2026-09-05T12:00:00.000Z", updatedBy: "dev-r", version: 1, deletedAt: null }];
      const result = await applyDeltaChanges("productos", changes, "dev-r");
      expect(result.updated).toBe(1);
      expect((await db.productos.get("p1")).nombre).toBe("Remoto");
    });
    it("skipea cuando local es mas nuevo", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await db.productos.put({ id: "p1", nombre: "Local", updatedAt: "2026-09-05T12:00:00.000Z", updatedBy: "dev-l", version: 1, deletedAt: null });
      const changes = [{ id: "p1", nombre: "Remoto", updatedAt: "2026-09-05T10:00:00.000Z", updatedBy: "dev-r", version: 1, deletedAt: null }];
      const result = await applyDeltaChanges("productos", changes, "dev-r");
      expect(result.skipped).toBe(1);
      expect((await db.productos.get("p1")).nombre).toBe("Local");
    });
    it("usa version como tie-breaker", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await db.productos.put({ id: "p1", nombre: "Local", updatedAt: "2026-09-05T12:00:00.000Z", updatedBy: "dev-l", version: 1, deletedAt: null });
      const changes = [{ id: "p1", nombre: "Remoto", updatedAt: "2026-09-05T12:00:00.000Z", updatedBy: "dev-r", version: 2, deletedAt: null }];
      const result = await applyDeltaChanges("productos", changes, "dev-r");
      expect(result.updated).toBe(1);
    });
    it("cuenta como conflicto registros sin id", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      const result = await applyDeltaChanges("productos", [{ nombre: "Sin ID" }], "dev-r");
      expect(result.conflicts).toBe(1);
    });
    it("maneja batch en transaccion", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await db.productos.put({ id: "p1", nombre: "Local", updatedAt: "2026-09-05T10:00:00.000Z", updatedBy: "dev-l", version: 1, deletedAt: null });
      const changes = [
        { id: "p1", nombre: "R1", updatedAt: "2026-09-05T12:00:00.000Z", updatedBy: "dev-r", version: 1, deletedAt: null },
        { id: "p2", nombre: "R2", updatedAt: "2026-09-05T12:00:00.000Z", updatedBy: "dev-r", version: 1, deletedAt: null },
        { id: "p3", nombre: "R3", updatedAt: "2026-09-05T12:00:00.000Z", updatedBy: "dev-r", version: 1, deletedAt: null },
      ];
      const result = await applyDeltaChanges("productos", changes, "dev-r");
      expect(result.updated).toBe(1);
      expect(result.inserted).toBe(2);
    });
  });

  describe("Sync State", () => {
    it("getSyncState devuelve defaults", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      const state = await getSyncState("dev-r", "productos");
      expect(state.lastSyncAt).toBe("1970-01-01T00:00:00.000Z");
      expect(state.lastSyncVersion).toBe(0);
    });
    it("setSyncState guarda y actualiza", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await setSyncState("dev-r", "productos", "2026-09-05T12:00:00.000Z", 5);
      const state = await getSyncState("dev-r", "productos");
      expect(state.lastSyncAt).toBe("2026-09-05T12:00:00.000Z");
      expect(state.lastSyncVersion).toBe(5);
      await setSyncState("dev-r", "productos", "2026-09-06T10:00:00.000Z", 10);
      expect((await getSyncState("dev-r", "productos")).lastSyncVersion).toBe(10);
    });
    it("getAllSyncStates devuelve todos", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre", ventas: "++id" } }]);
      await setSyncState("dev-a", "productos", "2026-09-05T10:00:00.000Z", 1);
      await setSyncState("dev-b", "ventas", "2026-09-05T11:00:00.000Z", 2);
      const all = await getAllSyncStates();
      expect(all.length).toBe(2);
    });
  });

  describe("Sync Log", () => {
    it("addToSyncLog agrega entrada pendiente", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await addToSyncLog("productos", "p1", "CREATE", { id: "p1", nombre: "Test" });
      const pending = await getPendingSyncLog();
      expect(pending.length).toBe(1);
      expect(pending[0].status).toBe("pending");
    });
    it("markSyncLogStatus cambia estado", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await addToSyncLog("productos", "p1", "CREATE", {});
      const pending = await getPendingSyncLog();
      await markSyncLogStatus([pending[0].id], "acked");
      expect((await getPendingSyncLog()).length).toBe(0);
    });
    it("cleanSyncLog elimina acked antiguas", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      await db.syncLog.put({
        tabla: "productos", recordId: "p1", operation: "CREATE", recordData: {},
        timestamp: "2020-01-01T00:00:00.000Z", sourceDevice: getDeviceId(),
        status: "acked", retryCount: 0,
      });
      const cleaned = await cleanSyncLog(1);
      expect(cleaned).toBe(1);
      expect((await db.syncLog.toArray()).length).toBe(0);
    });
  });

  describe("Schema Hash", () => {
    it("es determinístico", async () => {
      const db = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      const h1 = await getSyncSchemaHash();
      const h2 = await getSyncSchemaHash();
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[0-9a-f]{8}$/);
    });
    it("cambia con el schema", async () => {
      const db1 = await abrirDB([{ tablas: { productos: "++id, nombre" } }]);
      const h1 = await getSyncSchemaHash();
      await cerrarDB();
      const db2 = await abrirDB([{ tablas: { productos: "++id, nombre, codigo", ventas: "++id" } }]);
      const h2 = await getSyncSchemaHash();
      expect(h1).not.toBe(h2);
    });
  });

  describe("Dependency Order", () => {
    it("respeta orden de dependencias", () => {
      const ordered = getSyncableTablesOrdered();
      expect(ordered[0]).toBe("tiendas");
      const idxProductos = ordered.indexOf("productos");
      const idxLotes = ordered.indexOf("lotes");
      const idxVentas = ordered.indexOf("ventas");
      expect(idxVentas).toBeGreaterThan(idxProductos);
      expect(idxVentas).toBeGreaterThan(idxLotes);
    });
    it("SYNCABLE_TABLES no incluye tablas de control", () => {
      expect(SYNCABLE_TABLES).not.toContain("config");
      expect(SYNCABLE_TABLES).not.toContain("deviceInfo");
      expect(SYNCABLE_TABLES).not.toContain("syncState");
      expect(SYNCABLE_TABLES).not.toContain("syncLog");
    });
  });
});

describe("sync-engine.js — Estrategias y protocolo", () => {
  describe("Merge Strategies", () => {
    it("ventas es APPEND_ONLY", () => {
      expect(getMergeStrategy("ventas")).toBe(MergeStrategy.APPEND_ONLY);
    });
    it("productos es LAST_WRITE_WINS", () => {
      expect(getMergeStrategy("productos")).toBe(MergeStrategy.LAST_WRITE_WINS);
    });
    it("lotes es LOTES_RECALC", () => {
      expect(getMergeStrategy("lotes")).toBe(MergeStrategy.LOTES_RECALC);
    });
    it("config es NO_SYNC", () => {
      expect(getMergeStrategy("config")).toBe(MergeStrategy.NO_SYNC);
    });
    it("tabla desconocida defaultea a LWW", () => {
      expect(getMergeStrategy("random")).toBe(MergeStrategy.LAST_WRITE_WINS);
    });
  });

  describe("Message Protocol", () => {
    it("createMessage incluye todos los campos", () => {
      const msg = createMessage(MsgType.HANDSHAKE, { schemaHash: "abc123" });
      expect(msg.type).toBe("handshake");
      expect(msg.schemaHash).toBe("abc123");
      expect(msg.deviceId).toBe(getDeviceId());
      expect(msg.timestamp).toBeDefined();
    });
    it("MsgType contiene todos los tipos", () => {
      expect(MsgType.HANDSHAKE).toBe("handshake");
      expect(MsgType.HANDSHAKE_ACK).toBe("handshake-ack");
      expect(MsgType.REQUEST_DELTA).toBe("requestDelta");
      expect(MsgType.DELTA_RESPONSE).toBe("deltaResponse");
      expect(MsgType.DELTA_ACK).toBe("deltaAck");
      expect(MsgType.SYNC_COMPLETE).toBe("syncComplete");
      expect(MsgType.SYNC_ERROR).toBe("syncError");
      expect(MsgType.SYNC_ABORT).toBe("syncAbort");
    });
  });
});