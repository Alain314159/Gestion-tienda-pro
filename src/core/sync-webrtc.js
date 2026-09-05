/* ================================================================
   SYNC WEBRTC — Wrapper de QWBP + Integracion con Sync Engine
   ================================================================
   Este archivo es el puente entre el protocolo QWBP (QR-WebRTC)
   y el sync-engine.js. Responsabilidades:
   1. Gestionar el ciclo de vida de la conexion QWBP
   2. Generar/escanear QR codes para signaling
   3. Integrar handshake + full sync del sync-engine
   4. Manejar desconexion, reintentos y cleanup
   5. Exponer estado via Svelte store
   6. Persistir dispositivos emparejados en DB
   ================================================================ */

import { writable } from 'svelte/store';
import { QWBPConnection } from 'qwbp';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import {
  performHandshake,
  performFullSync,
  validateHandshake,
  MsgType,
  createMessage,
  exportSyncPackage,
  importSyncPackage,
} from './sync-engine.js';
import {
  getDeviceId,
  getDeviceName,
  getDB,
  getPendingSyncLog,
  cleanSyncLog,
  getSyncSchemaHash,
  getSyncableTablesOrdered,
} from './db.js';

/* ================================================================
   ESTADOS DE CONEXION
   ================================================================ */

export const SyncConnectionState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  DISPLAYING_QR: 'displaying-qr',
  AWAITING_SCAN: 'awaiting-scan',
  SCANNED_ONE: 'scanned-one',
  CONNECTING: 'connecting',
  HANDSHAKING: 'handshaking',
  SYNCING: 'syncing',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

/* ================================================================
   STORE REACTIVO (Svelte 5 compatible con runas)
   ================================================================ */

function createSyncStore() {
  const { subscribe, set, update } = writable({
    state: SyncConnectionState.IDLE,
    error: null,
    qrDataUrl: null,
    sasCode: null,
    remoteDevice: null,
    progress: { tabla: null, phase: null, stats: null, percent: 0 },
    pairedDevices: [],
    pendingChanges: 0,
    lastSyncAt: null,
  });

  return {
    subscribe,
    set,
    update,
    setState: (state) => update((s) => ({ ...s, state, error: null })),
    setError: (error) =>
      update((s) => ({ ...s, state: SyncConnectionState.ERROR, error })),
    setQR: (qrDataUrl) => update((s) => ({ ...s, qrDataUrl })),
    setSAS: (sasCode) => update((s) => ({ ...s, sasCode })),
    setRemoteDevice: (remoteDevice) => update((s) => ({ ...s, remoteDevice })),
    setProgress: (progress) => update((s) => ({ ...s, progress })),
    setPairedDevices: (pairedDevices) => update((s) => ({ ...s, pairedDevices })),
    setPendingChanges: (pendingChanges) => update((s) => ({ ...s, pendingChanges })),
    setLastSyncAt: (lastSyncAt) => update((s) => ({ ...s, lastSyncAt })),
    reset: () =>
      set({
        state: SyncConnectionState.IDLE,
        error: null,
        qrDataUrl: null,
        sasCode: null,
        remoteDevice: null,
        progress: { tabla: null, phase: null, stats: null, percent: 0 },
        pairedDevices: [],
        pendingChanges: 0,
        lastSyncAt: null,
      }),
  };
}

export const syncStore = createSyncStore();

/* ================================================================
   UTILS: Uint8Array <-> base64 (para QR codes)
   ================================================================ */

function uint8ToBase64(bytes) {
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binString);
}

function base64ToUint8(base64) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.charCodeAt(0));
}

/* ================================================================
   DISPOSITIVOS EMPAREJADOS (persistidos en config DB)
   ================================================================ */

const PAIRED_DEVICES_KEY = 'sync-paired-devices';

async function getPairedDevicesFromDB() {
  try {
    const db = getDB();
    const record = await db.config.get(PAIRED_DEVICES_KEY);
    return Array.isArray(record?.value) ? record.value : [];
  } catch {
    return [];
  }
}

async function savePairedDevicesToDB(devices) {
  try {
    const db = getDB();
    await db.config.put({ key: PAIRED_DEVICES_KEY, value: devices });
  } catch (err) {
    console.error('[SyncWebRTC] Error guardando dispositivos emparejados:', err);
  }
}

/** Carga dispositivos emparejados desde DB al store */
export async function loadPairedDevices() {
  const devices = await getPairedDevicesFromDB();
  syncStore.setPairedDevices(devices);
  return devices;
}

/** Agrega o actualiza un dispositivo emparejado */
export async function addPairedDevice(deviceId, name, lastSyncAt = null) {
  const devices = await getPairedDevicesFromDB();
  const idx = devices.findIndex((d) => d.deviceId === deviceId);
  const entry = {
    deviceId,
    name: name || 'Dispositivo desconocido',
    pairedAt: new Date().toISOString(),
    lastSyncAt: lastSyncAt || new Date().toISOString(),
  };
  if (idx >= 0) {
    devices[idx] = { ...devices[idx], ...entry };
  } else {
    devices.push(entry);
  }
  await savePairedDevicesToDB(devices);
  syncStore.setPairedDevices(devices);
}

/** Elimina un dispositivo emparejado */
export async function removePairedDevice(deviceId) {
  const devices = (await getPairedDevicesFromDB()).filter((d) => d.deviceId !== deviceId);
  await savePairedDevicesToDB(devices);
  syncStore.setPairedDevices(devices);
}

/* ================================================================
   CAMBIOS PENDIENTES
   ================================================================ */

/** Actualiza el conteo de cambios locales pendientes de sincronizar */
export async function refreshPendingChanges() {
  try {
    const pending = await getPendingSyncLog(1000);
    syncStore.setPendingChanges(pending.length);
    return pending.length;
  } catch {
    syncStore.setPendingChanges(0);
    return 0;
  }
}

/* ================================================================
   CONEXION QWBP — Ciclo de vida
   ================================================================ */

let qwbpConnection = null;
let dataChannel = null;
let html5QrCode = null;

/**
 * Inicia una nueva conexion QWBP y genera el QR para mostrar.
 */
export async function startSyncConnection() {
  await cerrarSyncConnection();
  syncStore.reset();
  syncStore.setState(SyncConnectionState.INITIALIZING);

  try {
    qwbpConnection = new QWBPConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      timeout: 60000,
      maxCandidates: 4,
    });

    await qwbpConnection.initialize();

    const qrPayload = qwbpConnection.getQRPayload();
    const qrBase64 = uint8ToBase64(qrPayload);

    const qrDataUrl = await QRCode.toDataURL(qrBase64, {
      errorCorrectionLevel: 'M',
      width: 280,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    syncStore.setQR(qrDataUrl);
    syncStore.setState(SyncConnectionState.DISPLAYING_QR);

    qwbpConnection.onDataChannel((channel) => {
      dataChannel = channel;
      handleDataChannelOpen(channel);
    });

    qwbpConnection.options.onStateChange = (state) => {
      console.log('[SyncWebRTC] QWBP state:', state);
      if (state === 'Connecting') {
        syncStore.setState(SyncConnectionState.CONNECTING);
      }
    };

    qwbpConnection.options.onError = (err) => {
      console.error('[SyncWebRTC] QWBP error:', err);
      syncStore.setError(err?.message || 'Error de conexion P2P');
    };
  } catch (err) {
    console.error('[SyncWebRTC] Error iniciando conexion:', err);
    syncStore.setError(err?.message || 'No se pudo iniciar la conexion P2P');
    throw err;
  }
}

/**
 * Procesa un QR escaneado del otro dispositivo.
 * @param {string} qrBase64String — texto base64 decodificado del QR
 */
export async function processScannedQR(qrBase64String) {
  if (!qwbpConnection) {
    throw new Error('No hay conexion activa. Inicia primero la conexion desde este dispositivo.');
  }

  const trimmed = (qrBase64String || '').trim();
  if (!trimmed || trimmed.length < 20) {
    throw new Error('QR invalido: datos insuficientes');
  }

  try {
    syncStore.setState(SyncConnectionState.SCANNED_ONE);

    const qrPayload = base64ToUint8(trimmed);
    await qwbpConnection.processScannedPayload(qrPayload);

    const responseQR = qwbpConnection.getQRPayload();
    const responseBase64 = uint8ToBase64(responseQR);

    const qrDataUrl = await QRCode.toDataURL(responseBase64, {
      errorCorrectionLevel: 'M',
      width: 280,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    syncStore.setQR(qrDataUrl);
    syncStore.setState(SyncConnectionState.AWAITING_SCAN);

    const sas = await qwbpConnection.getSAS();
    if (sas) syncStore.setSAS(sas);
  } catch (err) {
    console.error('[SyncWebRTC] Error procesando QR:', err);
    syncStore.setError(err?.message || 'QR invalido o conexion fallida');
    throw err;
  }
}

/** Maneja la apertura del DataChannel (ambos dispositivos) */
async function handleDataChannelOpen(channel) {
  syncStore.setState(SyncConnectionState.HANDSHAKING);

  try {
    const remoteInfo = await performHandshake(channel);
    console.log('[SyncWebRTC] Handshake recibido:', remoteInfo);

    const localHash = await getSyncSchemaHash();
    const validation = validateHandshake(
      { schemaHash: localHash },
      { schemaHash: remoteInfo.schemaHash }
    );

    if (!validation.ok) {
      const abortMsg = createMessage(MsgType.SYNC_ABORT, { reason: validation.error });
      channel.send(JSON.stringify(abortMsg));
      syncStore.setError(validation.error);
      return;
    }

    syncStore.setRemoteDevice({
      deviceId: remoteInfo.deviceId,
      deviceName: remoteInfo.deviceName || 'Dispositivo desconocido',
    });

    syncStore.setState(SyncConnectionState.SYNCING);

    const tablasOrdenadas = getSyncableTablesOrdered();
    const stats = await performFullSync(channel, remoteInfo.deviceId, (tabla, phase, phaseStats) => {
      const idx = tablasOrdenadas.indexOf(tabla);
      const percent = Math.round(((idx + (phase === 'done' ? 1 : 0.5)) / tablasOrdenadas.length) * 100);
      syncStore.setProgress({
        tabla,
        phase,
        stats: phaseStats,
        percent: Math.min(percent, 100),
      });
    });

    const now = new Date().toISOString();
    await addPairedDevice(remoteInfo.deviceId, remoteInfo.deviceName, now);

    syncStore.setState(SyncConnectionState.CONNECTED);
    syncStore.setLastSyncAt(now);
    syncStore.setProgress({ tabla: null, phase: 'complete', stats, percent: 100 });
    console.log('[SyncWebRTC] Sync completado:', stats);

    try {
      await cleanSyncLog(7);
    } catch (e) {
      console.warn('[SyncWebRTC] Error limpiando syncLog:', e);
    }

    await refreshPendingChanges();

    channel.onclose = () => {
      console.log('[SyncWebRTC] DataChannel cerrado');
      syncStore.setState(SyncConnectionState.DISCONNECTED);
      dataChannel = null;
    };
    channel.onerror = (e) => {
      console.error('[SyncWebRTC] DataChannel error:', e);
    };
  } catch (err) {
    console.error('[SyncWebRTC] Error durante sync:', err);
    syncStore.setError(err?.message || 'Error durante la sincronizacion');
  }
}

/** Cierra la conexion activa y limpia todos los recursos */
export async function cerrarSyncConnection() {
  if (html5QrCode) {
    try { await html5QrCode.stop(); } catch { /* ignore */ }
    try { await html5QrCode.clear(); } catch { /* ignore */ }
    html5QrCode = null;
  }

  if (qwbpConnection) {
    try { qwbpConnection.close(); } catch { /* ignore */ }
    qwbpConnection = null;
  }

  dataChannel = null;
  syncStore.reset();
}

/* ================================================================
   ESCANER DE QR (html5-qrcode)
   ================================================================ */

/**
 * Inicia el escaneo de QR usando la camara del dispositivo.
 */
export async function startQRScanner(elementId, onScan, onError) {
  if (html5QrCode) {
    await stopQRScanner();
  }

  try {
    html5QrCode = new Html5Qrcode(elementId);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        if (decodedText && decodedText.length >= 20 && /^[A-Za-z0-9+/=]+$/.test(decodedText)) {
          onScan(decodedText);
        }
      },
      () => {}
    );
  } catch (err) {
    console.error('[SyncWebRTC] Error iniciando escaner QR:', err);
    if (onError) onError(err);
    throw err;
  }
}

/** Detiene el escaner de QR y libera la camara */
export async function stopQRScanner() {
  if (html5QrCode) {
    try { await html5QrCode.stop(); } catch { /* ignore */ }
    try { await html5QrCode.clear(); } catch { /* ignore */ }
    html5QrCode = null;
  }
}

/* ================================================================
   SYNC POR ARCHIVO (fallback sin WebRTC)
   ================================================================ */

export { exportSyncPackage, importSyncPackage } from './sync-engine.js';

/**
 * Exporta un paquete de sync y dispara la descarga del archivo .tiendasync
 */
export async function exportarSyncArchivo(targetDeviceId) {
  const { blob, filename } = await exportSyncPackage(targetDeviceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * Importa un paquete de sync desde un archivo seleccionado por el usuario.
 */
export async function importarSyncArchivo(file) {
  const buffer = await file.arrayBuffer();
  return importSyncPackage(buffer);
}
