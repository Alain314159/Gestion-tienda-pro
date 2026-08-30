<script module>
  export const manifiesto = {
    id: 'ajustes',
    nombre: 'Ajustes',
    icono: 'settings',
    grupo: 'utilidades',
    orden: 8,
    tablas: {}
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { getDB, listar, guardar, limpiar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { ui, alternarTema, avisar, confirmar, preguntar, pedirPIN } from '../../core/state.svelte.js';
  import { n, m, fmt, clean } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  let cfg = $state({});
  let tablas = $state(['productos', 'lotes', 'ventas', 'compras', 'ajustes', 'movCaja', 'capital', 'retiros', 'arqueos', 'cierres', 'config']);
  let conteos = $state({});
  let pinStr = $state('');
  let pinActivo = $state(false);

  async function recargar() {
    const db = getDB();
    const c = await db.config.get('cfg');
    cfg = c?.value || { nombre: 'Tienda Pro', moneda: '$' };
    pinActivo = !!cfg.pinActivo;
    const counts = {};
    for (const t of tablas) {
      try { counts[t] = await db.table(t).count(); } catch (e) { counts[t] = 0; }
    }
    conteos = counts;
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  async function guardarCfg() {
    const db = getDB();
    await db.config.put({ key: 'cfg', value: JSON.parse(JSON.stringify(cfg)) });
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
      try { datos[t] = await db.table(t).toArray(); } catch (e) { datos[t] = []; }
    }
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tienda_pro_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    avisar('Backup descargado');
  }

  async function importarJSON() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const datos = JSON.parse(text);
        const db = getDB();
        await db.transaction('rw', db.tables, async () => {
          for (const t of Object.keys(datos)) {
            if (db.tables.some(x => x.name === t)) {
              await db.table(t).clear();
              if (datos[t]?.length > 0) await db.table(t).bulkPut(datos[t].map(o => JSON.parse(JSON.stringify(o))));
            }
          }
        });
        await recargar();
        bus.emit('recargar');
        avisar('Datos restaurados');
      } catch (e) { avisar('Error al importar: ' + e.message, 'bad'); }
    };
    input.click();
  }

  async function borrarTodo() {
    const ok = await confirmar('Borrar todo', '¿Eliminar TODOS los datos? No se puede deshacer.');
    if (!ok) return;
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
  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="settings" size={18} />
      Configuracion
    </div>
    <div class="mb-2">
      <label class="text-xs text-muted font-bold mb-1 block">Nombre del negocio</label>
      <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="text" bind:value={cfg.nombre} onblur={guardarCfg} />
    </div>
    <div class="mb-2">
      <label class="text-xs text-muted font-bold mb-1 block">Simbolo de moneda</label>
      <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="text" bind:value={cfg.moneda} onblur={guardarCfg} />
    </div>
    <div class="mb-2">
      <label class="text-xs text-muted font-bold mb-1 block">Tema</label>
      <button class="w-full py-3 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm" onclick={alternarTema}>
        <Icono nombre={ui.tema === 'dark' ? 'sun' : 'moon'} size={16} />
        {ui.tema === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
      </button>
    </div>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="lock" size={18} />
      PIN de seguridad
    </div>
    {#if pinActivo}
      <div class="text-sm text-success mb-2">PIN activo</div>
      <button class="w-full py-3 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm" onclick={desactivarPIN}>Desactivar PIN</button>
    {:else}
      <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2" type="password" inputmode="numeric" placeholder="PIN (minimo 4 digitos)" bind:value={pinStr} />
      <button class="w-full py-3 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={guardarPIN}>
        <Icono nombre="lock" size={16} color="#fff" />
        Activar PIN
      </button>
    {/if}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="backup" size={18} />
      Backup y Restore
    </div>
    <button class="w-full py-3 rounded-[var(--radius-md)] bg-success text-white font-extrabold text-sm mb-2 active:scale-[0.97] transition-transform" onclick={exportarJSON}>
      <Icono nombre="export" size={16} color="#fff" />
      Exportar datos (JSON)
    </button>
    <button class="w-full py-3 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={importarJSON}>
      <Icono nombre="import" size={16} />
      Importar datos (JSON)
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="database" size={18} />
      Estado de la base de datos
    </div>
    {#each tablas as t}
      <div class="flex justify-between gap-2 py-1.5 border-b border-border text-sm">
        <span>{t}</span><span class="text-muted">{conteos[t] || 0} registros</span>
      </div>
    {/each}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-danger mb-3">
      <Icono nombre="trash" size={18} />
      Zona peligrosa
    </div>
    <button class="w-full py-3 rounded-[var(--radius-md)] bg-danger text-white font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={borrarTodo}>
      <Icono nombre="trash" size={16} color="#fff" />
      Borrar todos los datos
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="info" size={18} />
      Acerca de
    </div>
    <div class="text-sm text-muted">
      <p class="mb-1"><b>Tienda Pro</b> v7.0.0</p>
      <p class="mb-1">Punto de venta offline-first</p>
      <p class="mb-1">Datos guardados localmente en tu dispositivo</p>
      <p>Desarrollado con Svelte 5 + Dexie + Vite</p>
    </div>
  </div>
</div>
