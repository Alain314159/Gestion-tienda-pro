<script module>
  export const manifiesto = {
    id: 'sync',
    nombre: 'Sincronizar',
    icono: 'sync',
    grupo: 'utilidades',
    orden: 12,
    tablas: {},
  };
</script>

<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    syncStore,
    SyncConnectionState,
    startSyncConnection,
    processScannedQR,
    cerrarSyncConnection,
    startQRScanner,
    stopQRScanner,
    loadPairedDevices,
    removePairedDevice,
    refreshPendingChanges,
    exportarSyncArchivo,
    importarSyncArchivo,
  } from '../../core/sync-webrtc.js';
  import { getDeviceId, getDeviceName } from '../../core/db.js';
  import { avisar, confirmar } from '../../core/state.svelte.js';
  import { bus } from '../../core/bus.js';
  import Icono from '../../core/Icono.svelte';

  let sync = $state({});
  let deviceId = $state('');
  let deviceName = $state('');
  let modo = $state('inicio'); // inicio | mostrarQR | escanearQR | progreso | resultado
  let scannerElementId = 'sync-qr-scanner';

  const unsubscribe = syncStore.subscribe((s) => {
    sync = s;
  });

  onMount(async () => {
    deviceId = getDeviceId();
    deviceName = await getDeviceName();
    await loadPairedDevices();
    await refreshPendingChanges();
  });

  onDestroy(() => {
    unsubscribe();
    cerrarSyncConnection();
    stopQRScanner();
  });

  function estadoLabel(estado) {
    const map = {
      idle: 'Listo',
      initializing: 'Inicializando...',
      'displaying-qr': 'Mostrando QR',
      'awaiting-scan': 'Esperando escaneo...',
      'scanned-one': 'QR escaneado',
      connecting: 'Conectando P2P...',
      handshaking: 'Verificando compatibilidad...',
      syncing: 'Sincronizando datos...',
      connected: 'Sincronizado',
      disconnected: 'Desconectado',
      error: 'Error',
    };
    return map[estado] || estado;
  }

  function estadoColor(estado) {
    if (estado === 'connected') return 'text-success';
    if (estado === 'error') return 'text-danger';
    if (estado === 'syncing' || estado === 'connecting') return 'text-primary';
    return 'text-muted';
  }

  async function iniciarMostrarQR() {
    modo = 'mostrarQR';
    try {
      await startSyncConnection();
    } catch (e) {
      avisar(e.message, 'bad');
      modo = 'inicio';
    }
  }

  async function iniciarEscanearQR() {
    modo = 'escanearQR';
    try {
      await startSyncConnection();
      await startQRScanner(
        scannerElementId,
        async (qrText) => {
          try {
            await processScannedQR(qrText);
            modo = 'progreso';
          } catch (e) {
            avisar(e.message, 'bad');
          }
        },
        (err) => {
          console.error('Scanner error:', err);
        }
      );
    } catch (e) {
      avisar(e.message, 'bad');
      modo = 'inicio';
    }
  }

  async function cancelar() {
    await cerrarSyncConnection();
    await stopQRScanner();
    modo = 'inicio';
  }

  async function eliminarDispositivo(deviceIdToRemove) {
    const ok = await confirmar('Eliminar dispositivo', 'Quitar este dispositivo de la lista de emparejados?');
    if (!ok) return;
    await removePairedDevice(deviceIdToRemove);
    avisar('Dispositivo eliminado');
  }

  async function exportarArchivo() {
    try {
      const filename = await exportarSyncArchivo('all-devices');
      avisar('Archivo exportado: ' + filename);
    } catch (e) {
      avisar('Error al exportar: ' + e.message, 'bad');
    }
  }

  async function importarArchivo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.tiendasync';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const stats = await importarSyncArchivo(file);
        avisar(`Importado: ${stats.totalInserted} nuevos, ${stats.totalUpdated} actualizados`);
        bus.emit('recargar');
      } catch (e) {
        avisar('Error al importar: ' + e.message, 'bad');
      }
    };
    input.click();
  }

  function formatearFecha(iso) {
    if (!iso) return 'Nunca';
    const d = new Date(iso);
    return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="modulo">
  <!-- Header -->
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-2">
      <Icono nombre="sync" size={20} />
      Sincronizar dispositivos
    </div>
    <div class="text-sm text-muted mb-1">
      Este dispositivo: <span class="font-bold text-text">{deviceName}</span>
    </div>
    <div class="text-xs text-muted font-mono">{deviceId}</div>
  </div>

  <!-- Cambios pendientes -->
  {#if sync.pendingChanges > 0}
    <div class="bg-primary/5 border border-primary/20 rounded-[var(--radius-lg)] p-4 mb-4">
      <div class="flex items-center gap-2 text-sm text-primary font-bold">
        <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        {sync.pendingChanges} cambio{sync.pendingChanges > 1 ? 's' : ''} pendiente{sync.pendingChanges > 1 ? 's' : ''} de sincronizar
      </div>
    </div>
  {/if}

  <!-- Estado actual -->
  {#if sync.state !== SyncConnectionState.IDLE}
    <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-4">
      <div class="flex items-center gap-3 mb-3">
        <div class="relative w-10 h-10 rounded-full flex items-center justify-center bg-primary/10">
          <Icono
            nombre={sync.state === SyncConnectionState.CONNECTED ? 'check' : sync.state === SyncConnectionState.ERROR ? 'alert' : 'sync'}
            size={20}
            color={sync.state === SyncConnectionState.CONNECTED ? '#4CAF50' : sync.state === SyncConnectionState.ERROR ? '#dc2626' : '#2196F3'}
          />
          {#if sync.state === SyncConnectionState.SYNCING || sync.state === SyncConnectionState.CONNECTING}
            <div class="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          {/if}
        </div>
        <div class="flex-1">
          <div class="font-bold text-sm {estadoColor(sync.state)}">{estadoLabel(sync.state)}</div>
          {#if sync.error}
            <div class="text-xs text-danger">{sync.error}</div>
          {/if}
          {#if sync.remoteDevice}
            <div class="text-xs text-muted">Conectado con: {sync.remoteDevice.deviceName}</div>
          {/if}
        </div>
      </div>

      <!-- Progreso de sync -->
      {#if sync.state === SyncConnectionState.SYNCING && sync.progress.tabla}
        <div class="mb-2">
          <div class="flex justify-between text-xs text-muted mb-1">
            <span>{sync.progress.tabla} — {sync.progress.phase === 'receiving' ? 'Recibiendo' : sync.progress.phase === 'sending' ? 'Enviando' : 'Listo'}</span>
            <span>{sync.progress.percent}%</span>
          </div>
          <div class="w-full h-2 bg-background rounded-full overflow-hidden">
            <div class="h-full bg-primary rounded-full transition-all duration-300" style="width: {sync.progress.percent}%"></div>
          </div>
        </div>
      {/if}

      {#if sync.sasCode}
        <div class="mt-3 p-3 rounded-[var(--radius-md)] bg-background text-center">
          <div class="text-xs text-muted mb-1">Codigo de verificacion (debe coincidir en ambos dispositivos)</div>
          <div class="text-3xl font-black tracking-widest text-primary">{sync.sasCode}</div>
        </div>
      {/if}

      {#if sync.qrDataUrl && (sync.state === SyncConnectionState.DISPLAYING_QR || sync.state === SyncConnectionState.AWAITING_SCAN)}
        <div class="mt-3 flex flex-col items-center">
          <img src={sync.qrDataUrl} alt="QR de conexion" class="w-64 h-64 rounded-[var(--radius-md)] border border-border" />
          <div class="text-xs text-muted mt-2 text-center">
            {sync.state === SyncConnectionState.DISPLAYING_QR ? 'Escanea este QR con el otro dispositivo' : 'Escanea este QR con el otro dispositivo para completar'}
          </div>
        </div>
      {/if}

      {#if sync.state !== SyncConnectionState.IDLE}
        <button
          class="w-full mt-3 py-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 text-danger font-extrabold text-sm active:scale-[0.97] transition-transform"
          onclick={cancelar}
        >
          Cancelar / Cerrar
        </button>
      {/if}
    </div>
  {/if}

  <!-- Modo: Escaner QR -->
  {#if modo === 'escanearQR' && sync.state !== SyncConnectionState.CONNECTED}
    <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-4">
      <div class="text-sm font-bold text-text mb-3">Escanear QR del otro dispositivo</div>
      <div id={scannerElementId} class="w-full aspect-square max-w-sm mx-auto rounded-[var(--radius-md)] overflow-hidden border border-border bg-black"></div>
      <button
        class="w-full mt-3 py-2 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform"
        onclick={cancelar}
      >
        Cancelar
      </button>
    </div>
  {/if}

  <!-- Menu principal -->
  {#if modo === 'inicio'}
    <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
      <div class="font-extrabold text-primary mb-4">Sync P2P (WebRTC + QR)</div>
      <div class="grid grid-cols-2 gap-3 mb-4">
        <button
          class="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border border-border bg-background active:scale-[0.97] transition-transform"
          onclick={iniciarMostrarQR}
        >
          <Icono nombre="qr" size={28} color="#2196F3" />
          <span class="text-xs font-bold text-text">Mostrar mi QR</span>
        </button>
        <button
          class="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border border-border bg-background active:scale-[0.97] transition-transform"
          onclick={iniciarEscanearQR}
        >
          <Icono nombre="camera" size={28} color="#2196F3" />
          <span class="text-xs font-bold text-text">Escanear QR</span>
        </button>
      </div>
      <div class="text-xs text-muted text-center leading-relaxed">
        Ambos dispositivos deben estar en la misma red WiFi.<br/>
        Uno muestra QR, el otro escanea. Luego intercambian QRs de respuesta.
      </div>
    </div>

    <!-- Fallback por archivo -->
    <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
      <div class="font-extrabold text-primary mb-4">Sync por archivo</div>
      <div class="grid grid-cols-2 gap-3">
        <button
          class="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border border-border bg-background active:scale-[0.97] transition-transform"
          onclick={exportarArchivo}
        >
          <Icono nombre="export" size={24} color="#4CAF50" />
          <span class="text-xs font-bold text-text">Exportar .tiendasync</span>
        </button>
        <button
          class="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border border-border bg-background active:scale-[0.97] transition-transform"
          onclick={importarArchivo}
        >
          <Icono nombre="import" size={24} color="#4CAF50" />
          <span class="text-xs font-bold text-text">Importar .tiendasync</span>
        </button>
      </div>
      <div class="text-xs text-muted text-center mt-3 leading-relaxed">
        Comparte el archivo via WhatsApp, email o airdrop. Funciona sin internet.
      </div>
    </div>

    <!-- Dispositivos emparejados -->
    <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
      <div class="flex items-center justify-between mb-4">
        <div class="font-extrabold text-primary">Dispositivos emparejados</div>
        {#if sync.pairedDevices.length > 0}
          <span class="text-xs text-muted">{sync.pairedDevices.length}</span>
        {/if}
      </div>
      {#if sync.pairedDevices.length === 0}
        <div class="text-center text-muted text-sm py-4">No hay dispositivos emparejados aun</div>
      {:else}
        {#each sync.pairedDevices as dev}
          <div class="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div class="min-w-0">
              <div class="text-sm font-bold text-text truncate">{dev.name}</div>
              <div class="text-xs text-muted font-mono">{dev.deviceId}</div>
              <div class="text-xs text-muted">Ultimo sync: {formatearFecha(dev.lastSyncAt)}</div>
            </div>
            <button
              class="ml-2 px-2 py-1 rounded-[var(--radius-md)] text-xs text-danger font-bold border border-danger/20 bg-danger/5 active:scale-[0.97] transition-transform"
              onclick={() => eliminarDispositivo(dev.deviceId)}
            >
              Eliminar
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Ultimo sync -->
    {#if sync.lastSyncAt}
      <div class="bg-success/5 border border-success/20 rounded-[var(--radius-lg)] p-4 mb-4">
        <div class="flex items-center gap-2 text-sm text-success font-bold">
          <Icono nombre="check" size={16} color="#4CAF50" />
          Ultima sincronizacion: {formatearFecha(sync.lastSyncAt)}
        </div>
      </div>
    {/if}
  {/if}
</div>
