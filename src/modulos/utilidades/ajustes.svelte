<script module>
  export const manifiesto = {
    id: 'ajustes',
    nombre: 'Ajustes',
    icono: 'settings',
    grupo: 'utilidades',
    orden: 13,
    tablas: {},
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { getDB, listar, guardar, limpiar, leerConfig } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { ui, alternarTema, avisar, confirmar, preguntar, pedirPIN } from '../../core/state.svelte.js';
  import { n, m, fmt, clean, nowLocal, escapeHtml } from '../../core/util.js';
      import Icono from '../../core/Icono.svelte';

  let cfg = $state({});
  const tablas = $state([
    'productos',
    'productoVariantes',
    'lotes',
    'ventas',
    'compras',
    'ajustes',
    'movCaja',
    'capital',
    'retiros',
    'arqueos',
    'cierres',
    'socios',
    'gastosOp',
    'config',
  ]);
  let conteos = $state({});
  let pinStr = $state('');
  let pinActivo = $state(false);

  async function recargar() {
    cfg = (await leerConfig('cfg')) || { nombre: 'Tienda Pro', moneda: '$', periodoInicio: nowLocal().iso };
    pinActivo = !!cfg.pinActivo;
    const counts = {};
    const db = getDB();
    for (const t of tablas) {
      try {
        counts[t] = await db.table(t).count();
      } catch (e) {
        counts[t] = 0;
      }
    }
    conteos = counts;
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  async function guardarCfg() {
    await guardar('config', { key: 'cfg', value: clean(cfg) });
    bus.emit('recargar');
    avisar('Configuracion guardada');
  }

  async function guardarPIN() {
    const p = pinStr.trim();
    if (p.length < 4) return avisar('PIN minimo 4 digitos', 'bad');
    cfg.pin = p;
    cfg.pinActivo = true;
    await guardarCfg();
    pinStr = '';
    pinActivo = true;
    avisar('PIN guardado');
  }

  async function desactivarPIN() {
    const ok = await pedirPIN();
    if (!ok) return;
    cfg.pinActivo = false;
    await guardarCfg();
    pinActivo = false;
    avisar('PIN desactivado');
  }

  async function exportarJSON() {
    const db = getDB();
    const datos = {};
    for (const t of tablas) {
      try {
        datos[t] = await db.table(t).toArray();
      } catch (e) {
        datos[t] = [];
      }
    }
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tienda_pro_backup_' + nowLocal().local + '.json';
    a.click();
    URL.revokeObjectURL(url);
    avisar('Backup descargado');
  }

  async function importarJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const datos = JSON.parse(text);
        if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
          throw new Error('El archivo no contiene un objeto JSON valido');
        }
        const tablasValidas = new Set(tablas);
        for (const t of Object.keys(datos)) {
          if (!tablasValidas.has(t)) throw new Error(`Tabla desconocida en backup: "${t}"`);
          if (!Array.isArray(datos[t])) throw new Error(`La tabla "${t}" debe ser un array`);
        }
        const db = getDB();
        await db.transaction('rw', db.tables, async () => {
          for (const t of Object.keys(datos)) {
            if (db.tables.some((x) => x.name === t)) {
              await db.table(t).clear();
              if (datos[t]?.length > 0) await db.table(t).bulkPut(datos[t].map((o) => clean(o)));
            }
          }
        });
        await recargar();
        bus.emit('recargar');
        avisar('Datos restaurados');
      } catch (e) {
        avisar('Error al importar: ' + e.message, 'bad');
      }
    };
    input.click();
  }

  async function borrarTodo() {
    const pinOk = await pedirPIN();
    if (!pinOk) return;
    const ok = await confirmar('Borrar todo', 'Eliminar TODOS los datos? No se puede deshacer.');
    if (!ok) return;
    const confirmText = await preguntar('Confirmacion final', 'Escribe BORRAR para eliminar todos los datos');
    if (confirmText !== 'BORRAR') return avisar('Cancelado', 'bad');
    const db = getDB();
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) await t.clear();
    });
    await recargar();
    bus.emit('recargar');
    avisar('Todos los datos eliminados');
  }

</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="settings" size={18} />
      Configuracion
    </div>
    <div class="mb-3">
      <label for="cfg-nombre" class="text-xs text-muted font-bold mb-1.5 block">Nombre del negocio</label>
      <input
        id="cfg-nombre"
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]"
        type="text"
        bind:value={cfg.nombre}
        onblur={guardarCfg}
      />
    </div>
    <div class="mb-3">
      <label for="cfg-moneda" class="text-xs text-muted font-bold mb-1.5 block">Simbolo de moneda</label>
      <input
        id="cfg-moneda"
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]"
        type="text"
        bind:value={cfg.moneda}
        onblur={guardarCfg}
      />
    </div>
    <div class="mb-3">
      <label for="cfg-periodo" class="text-xs text-muted font-bold mb-1.5 block">Fecha de inicio del negocio</label>
      <input
        id="cfg-periodo"
        type="date"
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base"
        bind:value={cfg.periodoInicio}
        onblur={guardarCfg}
      />
    </div>
    <div>
      <span class="text-xs text-muted font-bold mb-1.5 block">Tema</span>
      <button
        class="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform"
        onclick={alternarTema}
      >
        <Icono nombre={ui.tema === 'dark' ? 'sun' : 'moon'} size={16} />
        {ui.tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      </button>
    </div>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="lock" size={18} />
      PIN de seguridad
    </div>
    {#if pinActivo}
      <div class="text-sm text-success mb-3">PIN activo</div>
      <button
        class="w-full py-3 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform"
        onclick={desactivarPIN}>Desactivar PIN</button
      >
    {:else}
      <input
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3"
        type="password"
        inputmode="numeric"
        placeholder="PIN (minimo 4 digitos)"
        bind:value={pinStr}
      />
      <button
        class="w-full py-3 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm active:scale-[0.97] transition-transform"
        onclick={guardarPIN}
      >
        <Icono nombre="lock" size={16} color="#fff" />
        Activar PIN
      </button>
    {/if}
  </div>

  <!-- Sync P2P -->
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="sync" size={18} />
      Sincronizar dispositivos
      <span class="text-xs text-muted font-normal ml-auto">P2P + QR</span>
    </div>
    <div class="text-sm text-muted mb-3">
      Sincroniza datos entre dispositivos via WiFi usando codigos QR. Sin servidores, sin internet.
    </div>
    <button
      class="w-full py-3 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
      onclick={() => { try { window.location.hash = 'sync'; } catch {} }}
    >
      <Icono nombre="sync" size={16} color="#fff" />
      Abrir sincronizacion
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="backup" size={18} />
      Backup y Restore
    </div>
    <button
      class="w-full py-3 rounded-[var(--radius-md)] bg-success text-white font-extrabold text-sm mb-3 active:scale-[0.97] transition-transform"
      onclick={exportarJSON}
    >
      <Icono nombre="export" size={16} color="#fff" />
      Exportar datos (JSON)
    </button>
    <button
      class="w-full py-3 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform"
      onclick={importarJSON}
    >
      <Icono nombre="import" size={16} />
      Importar datos (JSON)
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="database" size={18} />
      Estado de la base de datos
    </div>
    {#each tablas as t}
      <div class="flex justify-between gap-2 py-2 border-b border-border text-sm">
        <span>{t}</span><span class="text-muted">{conteos[t] || 0} registros</span>
      </div>
    {/each}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-danger mb-4">
      <Icono nombre="trash" size={18} />
      Zona peligrosa
    </div>
    <button
      class="w-full py-3 rounded-[var(--radius-md)] bg-danger text-white font-extrabold text-sm active:scale-[0.97] transition-transform"
      onclick={borrarTodo}
    >
      <Icono nombre="trash" size={16} color="#fff" />
      Borrar todos los datos
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="info" size={18} />
      Acerca de
    </div>
    <div class="text-sm text-muted">
      <p class="mb-1"><b>Tienda Pro</b> v8.0.0</p>
      <p class="mb-1">Punto de venta offline-first con contabilidad</p>
      <p class="mb-1">Datos guardados localmente en tu dispositivo</p>
      <p>Desarrollado con Svelte 5 + Dexie + Vite + Manrope</p>
    </div>
  </div>
</div>
