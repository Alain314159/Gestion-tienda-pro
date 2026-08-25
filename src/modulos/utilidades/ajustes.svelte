<script>
  import { onMount } from 'svelte';
  import { getDB } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, confirmar, preguntar } from '../../core/store.svelte.js';
  import { actualizarCfg } from '../../core/appstate.svelte.js';
  import { alternarTema } from '../../core/store.svelte.js';
  import Icono from '../../core/Icono.svelte';

  export const manifiesto = {
    id: 'ajustes',
    nombre: 'Ajustes',
    icono: 'ajustes',
    grupo: 'utilidades',
    orden: 9,
    tablas: {}
  };

  let ui = $state({ tema: 'light' });
  let cfg = $state({ pin: null });
  let contadores = $state({ productos: 0, ventas: 0, compras: 0 });
  let backupAuto = $state(null);

  async function cargarConfig() {
    const db = getDB();
    const cfgData = await db.config.toArray();
    if (cfgData.length > 0) {
      cfg = cfgData[0];
    }
    const uiData = await db.ui.toArray();
    if (uiData.length > 0) {
      ui = uiData[0];
    }
    backupAuto = localStorage.getItem('tp-backup-auto');
  }

  async function cargarContadores() {
    const db = getDB();
    contadores.productos = (await db.productos.toArray()).length;
    contadores.ventas = (await db.ventas.toArray()).length;
    contadores.compras = (await db.compras.toArray()).length;
  }

  async function cambiarTema() {
    await alternarTema();
    await cargarConfig();
  }

  async function cambiarPin() {
    const pin1 = await preguntar('Nuevo PIN', '4 dígitos');
    if (!pin1) return;
    const pin2 = await preguntar('Repite el PIN', '4 dígitos');
    if (!pin2) return;
    if (pin1 !== pin2) {
      avisar('Los PIN no coinciden', 'dg');
      return;
    }
    await actualizarCfg({ pin: pin1 });
    avisar('PIN actualizado', 'ok');
    await cargarConfig();
  }

  async function quitarPin() {
    const ok = await confirmar('Quitar PIN', '¿Estás seguro de eliminar el PIN?');
    if (!ok) return;
    await actualizarCfg({ pin: null });
    avisar('PIN eliminado', 'ok');
    await cargarConfig();
  }

  async function exportarRespaldo() {
    const db = getDB();
    const tablas = {};
    for (const table of db.tables) {
      tablas[table.name] = await table.toArray();
    }
    const data = {
      version: 6,
      fecha: Date.now(),
      tablas
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tienda-pro-respaldo.json';
    a.click();
    URL.revokeObjectURL(url);
    avisar('Respaldo exportado', 'ok');
  }

  async function importarDatos(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    const ok = await confirmar('Importar', 'Se reemplazan TODOS los datos actuales');
    if (!ok) return;
    const db = getDB();
    for (const [nombre, filas] of Object.entries(data.tablas)) {
      if (db[nombre]) {
        await db[nombre].bulkPut(filas);
      }
    }
    avisar('Datos importados', 'ok');
    setTimeout(() => location.reload(), 1000);
  }

  async function backupAhora() {
    const db = getDB();
    const tablas = {};
    for (const table of db.tables) {
      tablas[table.name] = await table.toArray();
    }
    const data = {
      version: 6,
      fecha: Date.now(),
      tablas
    };
    localStorage.setItem('tp-backup-auto', JSON.stringify(data));
    backupAuto = new Date().toISOString();
    avisar('Backup guardado', 'ok');
  }

  onMount(async () => {
    await cargarConfig();
    await cargarContadores();
  });
</script>

<div class="modulo">
  <div class="card">
    <div class="tit">Apariencia</div>
    <div class="item">
      <label class="switch">
        <input type="checkbox" checked={ui.tema === 'dark'} on:change={cambiarTema} />
        <i></i>
        Modo oscuro
      </label>
    </div>
  </div>

  <div class="card">
    <div class="tit">Seguridad</div>
    <div class="item">
      <div class="lbl">PIN para operaciones sensibles</div>
      <div class="row">
        <button class="btn sec sm" on:click={cambiarPin}>
          <Icono nombre="edit" size={16} /> Cambiar PIN
        </button>
        {#if cfg.pin}
          <button class="btn dgr sm" on:click={quitarPin}>
            <Icono nombre="trash" size={16} /> Quitar PIN
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="tit">Datos</div>
    <div class="item">
      <div class="row">
        <button class="btn ok sm" on:click={exportarRespaldo}>
          <Icono nombre="save" size={16} /> Exportar respaldo
        </button>
        <label class="btn sec sm">
          <Icono nombre="refresh" size={16} /> Importar datos
          <input type="file" accept=".json" style="display:none" on:change={importarDatos} />
        </label>
      </div>
    </div>
    <div class="item">
      <div class="mut">
        Último backup automático: {backupAuto ? new Date(backupAuto).toLocaleString() : 'Nunca'}
      </div>
      <button class="btn sec sm" on:click={backupAhora}>
        <Icono nombre="save" size={16} /> Hacer backup ahora
      </button>
    </div>
  </div>

  <div class="card">
    <div class="tit">Información</div>
    <div class="item">
      <div class="mut">Versión 6.0 · Datos locales</div>
      <div class="mut">{contadores.productos} productos · {contadores.ventas} ventas · {contadores.compras} compras</div>
    </div>
  </div>
</div>
