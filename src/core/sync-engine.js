/* ================================================================
   SYNC ENGINE — Motor de sincronizacion P2P con resolucion de conflictos
   ================================================================
   Este archivo implementa el protocolo de sincronizacion delta entre
   dispositivos usando WebRTC DataChannel. No maneja la conexion WebRTC
   en si (eso esta en sync-webrtc.js), solo la logica de datos.
   Arquitectura:
   1. Estrategias de merge por tipo de tabla (append-only, LWW, lotes)
   2. Sync bidireccional tabla por tabla
   3. Batching, compresion y acks
   4. Recalculo de stock post-sync
   ================================================================ */

import pako from 'pako';
import {
  getDB,
  getDeviceId,
  getDeviceName,
  getDeltaChanges,
  applyDeltaChanges,
  getSyncState,
  setSyncState,
  getSyncSchemaHash,
  getSyncableTablesOrdered,
  recalcularStockLotes,
  esTablaSyncable,
  SYNCABLE_TABLES,
} from './db.js';

/* ================================================================
   CONSTANTES
   ================================================================ */

// Tamanio maximo de un batch de cambios (en numero de registros)
const DEFAULT_BATCH_SIZE = 100;

// Tamanio maximo de payload comprimido por mensaje WebRTC (bytes)
const MAX_MESSAGE_SIZE = 65536;

/* ================================================================
   ESTRATEGIAS DE MERGE POR TIPO DE TABLA
   ================================================================ */

/** Tipos de estrategia de resolucion de conflictos */
export const MergeStrategy = {
  APPEND_ONLY: 'append-only',
  LAST_WRITE_WINS: 'lww',
  LOTES_RECALC: 'lotes-recalc',
  NO_SYNC: 'no-sync',
};

/** Mapeo de tabla -> estrategia de merge */
export const TABLE_MERGE_STRATEGY = {
  // APPEND-ONLY: registros inmutables, nunca se editan
  ventas: MergeStrategy.APPEND_ONLY,
  compras: MergeStrategy.APPEND_ONLY,
  ajustes: MergeStrategy.APPEND_ONLY,
  capital: MergeStrategy.APPEND_ONLY,
  retiros: MergeStrategy.APPEND_ONLY,
  arqueos: MergeStrategy.APPEND_ONLY,
  movCaja: MergeStrategy.APPEND_ONLY,
  contabilidad: MergeStrategy.APPEND_ONLY,
  gastosOp: MergeStrategy.APPEND_ONLY,
  cierres: MergeStrategy.APPEND_ONLY,
  // LAST-WRITE-WINS: estado que puede cambiar
  productos: MergeStrategy.LAST_WRITE_WINS,
  productoVariantes: MergeStrategy.LAST_WRITE_WINS,
  tiendas: MergeStrategy.LAST_WRITE_WINS,
  socios: MergeStrategy.LAST_WRITE_WINS,
  config: MergeStrategy.NO_SYNC,
  // LOTES: requieren recalculo de stock post-merge
  lotes: MergeStrategy.LOTES_RECALC,
};

/** Obtiene la estrategia de merge para una tabla */
export function getMergeStrategy(tabla) {
  return TABLE_MERGE_STRATEGY[tabla] || MergeStrategy.LAST_WRITE_WINS;
}

/* ================================================================
   COMPRESION / DESCOMPRESION
   ================================================================ */

/** Comprime un objeto JSON usando deflate (pako).
   Devuelve un Uint8Array. */
export function compressData(data) {
  const jsonStr = JSON.stringify(data);
  return pako.deflate(jsonStr);
}

/** Descomprime un Uint8Array y parsea JSON. */
export function decompressData(compressed) {
  const jsonStr = pako.inflate(compressed, { to: 'string' });
  return JSON.parse(jsonStr);
}

/* ================================================================
   PROTOCOLO DE MENSAJES
   ================================================================ */

/** Tipos de mensajes del protocolo de sync */
export const MsgType = {
  HANDSHAKE: 'handshake',
  HANDSHAKE_ACK: 'handshake-ack',
  REQUEST_DELTA: 'requestDelta',
  DELTA_RESPONSE: 'deltaResponse',
  DELTA_ACK: 'deltaAck',
  SYNC_COMPLETE: 'syncComplete',
  SYNC_ERROR: 'syncError',
  SYNC_ABORT: 'syncAbort',
};

/** Crea un mensaje del protocolo */
export function createMessage(type, payload = {}) {
  return { type, timestamp: new Date().toISOString(), deviceId: getDeviceId(), ...payload };
}

/* ================================================================
   HANDSHAKE
   ================================================================ */

/** Realiza el handshake inicial con el otro dispositivo.
   Verifica compatibilidad de schema y establece parametros de sync.
   @param {RTCDataChannel} channel — canal de datos abierto
   @returns {Promise<Object>} — metadatos del dispositivo remoto */
export async function performHandshake(channel) {
  const localSchemaHash = await getSyncSchemaHash();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Handshake timeout: el otro dispositivo no respondio en 10s'));
    }, 10000);

    const onMessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === MsgType.HANDSHAKE) {
        const ack = createMessage(MsgType.HANDSHAKE_ACK, {
          deviceName: getDeviceName(),
          schemaHash: localSchemaHash,
          tables: SYNCABLE_TABLES,
        });
        channel.send(JSON.stringify(ack));
        clearTimeout(timeout);
        cleanup();
        resolve(msg);
      } else if (msg.type === MsgType.HANDSHAKE_ACK) {
        clearTimeout(timeout);
        cleanup();
        resolve(msg);
      }
    };

    const cleanup = () => {
      channel.removeEventListener('message', onMessage);
    };

    channel.addEventListener('message', onMessage);

    const handshake = createMessage(MsgType.HANDSHAKE, {
      deviceName: getDeviceName(),
      schemaHash: localSchemaHash,
      tables: SYNCABLE_TABLES,
    });
    channel.send(JSON.stringify(handshake));
  });
}

/** Valida que los schemas sean compatibles.
   @returns {Object} — { ok: boolean, error?: string } */
export function validateHandshake(local, remote) {
  if (local.schemaHash !== remote.schemaHash) {
    return {
      ok: false,
      error: `Incompatibilidad de schema. Tu app: ${local.schemaHash}, Otro: ${remote.schemaHash}. Actualiza ambos dispositivos a la misma version.`,
    };
  }
  return { ok: true };
}

/* ================================================================
   SYNC DE UNA TABLA (unidireccional: enviar o recibir)
   ================================================================ */

/** Envia cambios delta de una tabla al otro dispositivo.
   @param {RTCDataChannel} channel
   @param {string} tabla
   @param {string} remoteDeviceId
   @returns {Promise<Object>} — estadisticas */
export async function sendDeltaToRemote(channel, tabla, remoteDeviceId) {
  const state = await getSyncState(remoteDeviceId, tabla);
  const changes = await getDeltaChanges(tabla, state.lastSyncAt, state.lastSyncVersion);

  if (changes.length === 0) {
    const msg = createMessage(MsgType.SYNC_COMPLETE, { tabla, sent: 0, received: 0 });
    channel.send(JSON.stringify(msg));
    return { sent: 0, batches: 0 };
  }

  const batchSize = DEFAULT_BATCH_SIZE;
  let sent = 0;
  let batchIndex = 0;

  for (let i = 0; i < changes.length; i += batchSize) {
    const batch = changes.slice(i, i + batchSize);
    const payload = createMessage(MsgType.DELTA_RESPONSE, {
      tabla,
      changes: batch,
      batchIndex,
      hasMore: i + batchSize < changes.length,
    });

    const jsonStr = JSON.stringify(payload);
    if (jsonStr.length > MAX_MESSAGE_SIZE) {
      const compressed = compressData(payload);
      channel.send(compressed.buffer);
    } else {
      channel.send(jsonStr);
    }

    sent += batch.length;
    batchIndex++;
    await waitForAck(channel, tabla, batchIndex - 1, 5000);
  }

  return { sent, batches: batchIndex };
}

/** Recibe y aplica cambios delta de una tabla desde el otro dispositivo.
   @param {RTCDataChannel} channel
   @param {string} tabla
   @param {string} remoteDeviceId
   @returns {Promise<Object>} — estadisticas de aplicacion */
export async function receiveDeltaFromRemote(channel, tabla, remoteDeviceId) {
  return new Promise((resolve, reject) => {
    const allChanges = [];
    let completed = false;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout recibiendo delta de ${tabla}`));
    }, 60000);

    const onMessage = async (event) => {
      let msg;
      try {
        if (event.data instanceof ArrayBuffer) {
          const compressed = new Uint8Array(event.data);
          msg = decompressData(compressed);
        } else {
          msg = JSON.parse(event.data);
        }
      } catch (err) {
        console.warn('[SyncEngine] Mensaje no parseable:', err);
        return;
      }

      if (msg.type === MsgType.DELTA_RESPONSE && msg.tabla === tabla) {
        if (msg.changes && msg.changes.length > 0) {
          allChanges.push(...msg.changes);
        }

        const ack = createMessage(MsgType.DELTA_ACK, {
          tabla,
          batchIndex: msg.batchIndex,
          lastTimestamp: msg.changes?.length ? msg.changes[msg.changes.length - 1].updatedAt : null,
          lastVersion: msg.changes?.length ? msg.changes[msg.changes.length - 1].version : null,
        });
        channel.send(JSON.stringify(ack));

        if (!msg.hasMore) {
          completed = true;
          clearTimeout(timeout);
          cleanup();

          const strategy = getMergeStrategy(tabla);
          let results;
          if (strategy === MergeStrategy.APPEND_ONLY) {
            results = await applyAppendOnly(tabla, allChanges, remoteDeviceId);
          } else {
            results = await applyDeltaChanges(tabla, allChanges, remoteDeviceId);
          }
          resolve({ ...results, totalChanges: allChanges.length });
        }
      } else if (msg.type === MsgType.SYNC_COMPLETE && msg.tabla === tabla) {
        completed = true;
        clearTimeout(timeout);
        cleanup();
        resolve({ inserted: 0, updated: 0, skipped: 0, conflicts: 0, totalChanges: 0 });
      } else if (msg.type === MsgType.SYNC_ERROR) {
        clearTimeout(timeout);
        cleanup();
        reject(new Error(msg.error || 'Error desconocido del remoto'));
      }
    };

    const cleanup = () => {
      channel.removeEventListener('message', onMessage);
    };

    channel.addEventListener('message', onMessage);

    const request = createMessage(MsgType.REQUEST_DELTA, {
      tabla,
      sinceTimestamp: state.lastSyncAt,
      sinceVersion: state.lastSyncVersion,
      batchSize: DEFAULT_BATCH_SIZE,
    });
    channel.send(JSON.stringify(request));
  });
}

/* ================================================================
   APLICACION DE MERGE POR ESTRATEGIA
   ================================================================ */

/** Aplica cambios con estrategia APPEND-ONLY: solo inserta registros que no existen.
   Nunca sobrescribe registros existentes. */
export async function applyAppendOnly(tabla, changes, fromDeviceId) {
  const db = getDB();
  const results = { inserted: 0, updated: 0, skipped: 0, conflicts: 0 };
  if (!changes || changes.length === 0) return results;

  await db.transaction('rw', db[tabla], async (trans) => {
    for (const change of changes) {
      if (!change || !change.id) {
        results.conflicts++;
        continue;
      }
      const existing = await trans.table(tabla).get(change.id);
      if (!existing) {
        await trans.table(tabla).put(change);
        results.inserted++;
      } else {
        results.skipped++;
      }
    }
  });
  return results;
}

/* ================================================================
   SYNC COMPLETO BIDIRECCIONAL
   ================================================================ */

/** Realiza un sync completo bidireccional con el otro dispositivo.
   Flujo por tabla:
   1. Pedimos cambios del remoto -> aplicamos
   2. Enviamos nuestros cambios al remoto
   3. Actualizamos syncState
   @param {RTCDataChannel} channel
   @param {string} remoteDeviceId
   @param {Function} onProgress — callback(tabla, phase, stats)
   @returns {Promise<Object>} — estadisticas globales */
export async function performFullSync(channel, remoteDeviceId, onProgress = () => {}) {
  const tablas = getSyncableTablesOrdered();
  const globalStats = {
    tablasSyncadas: 0,
    registrosEnviados: 0,
    registrosRecibidos: 0,
    conflictos: 0,
    errores: [],
  };

  for (const tabla of tablas) {
    try {
      onProgress(tabla, 'receiving', null);
      const receiveStats = await receiveDeltaFromRemote(channel, tabla, remoteDeviceId);
      globalStats.registrosRecibidos += receiveStats.inserted + receiveStats.updated;
      globalStats.conflictos += receiveStats.conflicts || 0;

      onProgress(tabla, 'sending', null);
      const sendStats = await sendDeltaToRemote(channel, tabla, remoteDeviceId);
      globalStats.registrosEnviados += sendStats.sent;
      globalStats.tablasSyncadas++;

      onProgress(tabla, 'done', { receive: receiveStats, send: sendStats });
    } catch (err) {
      console.error(`[SyncEngine] Error syncando ${tabla}:`, err);
      globalStats.errores.push({ tabla, error: err.message });
      onProgress(tabla, 'error', { error: err.message });
    }
  }

  try {
    const recalc = await recalcularStockLotes();
    console.log('[SyncEngine] Stock recalculado:', recalc);
  } catch (err) {
    console.error('[SyncEngine] Error recalculando stock:', err);
    globalStats.errores.push({ tabla: 'lotes', error: `Recalc stock: ${err.message}` });
  }

  return globalStats;
}

/* ================================================================
   UTILIDADES INTERNAS
   ================================================================ */

/** Espera un mensaje DELTA_ACK especifico de una tabla/batch.
   @param {RTCDataChannel} channel
   @param {string} tabla
   @param {number} batchIndex
   @param {number} timeoutMs
   @returns {Promise<void>} */
function waitForAck(channel, tabla, batchIndex, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout esperando ack de ${tabla} batch ${batchIndex}`));
    }, timeoutMs);

    const onMessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === MsgType.DELTA_ACK && msg.tabla === tabla && msg.batchIndex === batchIndex) {
        clearTimeout(timer);
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      channel.removeEventListener('message', onMessage);
    };

    channel.addEventListener('message', onMessage);
  });
}

/* ================================================================
   EXPORT / IMPORT JSON (fallback sin WebRTC)
   ================================================================ */

/** Exporta todos los cambios delta desde el ultimo sync como JSON comprimido.
   Util para compartir via WhatsApp, email, Bluetooth, etc.
   @param {string} targetDeviceId — dispositivo con el que se va a syncar
   @returns {Promise<Object>} — { blob, filename, stats } */
export async function exportSyncPackage(targetDeviceId) {
  const db = getDB();
  const tablas = getSyncableTablesOrdered();
  const packageData = {
    meta: {
      version: 1,
      createdAt: new Date().toISOString(),
      sourceDevice: getDeviceId(),
      sourceName: await getDeviceName(),
      targetDevice: targetDeviceId,
      schemaHash: await getSyncSchemaHash(),
    },
    data: {},
  };

  for (const tabla of tablas) {
    const state = await getSyncState(targetDeviceId, tabla);
    const changes = await getDeltaChanges(tabla, state.lastSyncAt, state.lastSyncVersion);
    if (changes.length > 0) {
      packageData.data[tabla] = changes;
    }
  }

  const jsonStr = JSON.stringify(packageData);
  const compressed = pako.deflate(jsonStr);
  const blob = new Blob([compressed], { type: 'application/octet-stream' });
  return { blob, filename: `sync-${getDeviceId()}-${Date.now()}.tiendasync`, stats: packageData.data };
}

/** Importa un paquete de sync recibido de otro dispositivo.
   @param {ArrayBuffer|Uint8Array} fileData — datos del archivo .tiendasync
   @returns {Promise<Object>} — estadisticas de importacion */
export async function importSyncPackage(fileData) {
  let compressed;
  if (fileData instanceof ArrayBuffer) {
    compressed = new Uint8Array(fileData);
  } else if (fileData instanceof Uint8Array) {
    compressed = fileData;
  } else if (typeof fileData === 'string') {
    compressed = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
  } else {
    throw new Error('Formato de archivo no soportado');
  }

  const jsonStr = pako.inflate(compressed, { to: 'string' });
  const packageData = JSON.parse(jsonStr);

  const localHash = await getSyncSchemaHash();
  if (packageData.meta.schemaHash !== localHash) {
    throw new Error(`Incompatibilidad de schema: local=${localHash}, remoto=${packageData.meta.schemaHash}`);
  }

  const stats = { tablas: {}, totalInserted: 0, totalUpdated: 0, totalSkipped: 0, totalConflicts: 0 };
  const db = getDB();

  for (const tabla of getSyncableTablesOrdered()) {
    const changes = packageData.data[tabla];
    if (!changes || changes.length === 0) continue;

    const strategy = getMergeStrategy(tabla);
    let result;
    if (strategy === MergeStrategy.APPEND_ONLY) {
      result = await applyAppendOnly(tabla, changes, packageData.meta.sourceDevice);
    } else {
      result = await applyDeltaChanges(tabla, changes, packageData.meta.sourceDevice);
    }

    stats.tablas[tabla] = result;
    stats.totalInserted += result.inserted;
    stats.totalUpdated += result.updated;
    stats.totalSkipped += result.skipped;
    stats.totalConflicts += result.conflicts;

    const lastChange = changes[changes.length - 1];
    await setSyncState(packageData.meta.sourceDevice, tabla, lastChange.updatedAt, lastChange.version || 0);
  }

  await recalcularStockLotes();
  return stats;
}