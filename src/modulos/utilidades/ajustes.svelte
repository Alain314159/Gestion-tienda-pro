<script>
  import { onMount } from 'svelte';
  import { getDB } from '../../core/db.js';
  import { avisar, confirmar, preguntar, ui, alternarTema } from '../../core/store.svelte.js';
  import { actualizarCfg, app } from '../../core/appstate.svelte.js';
  import Icono from '../../core/Icono.svelte';

  export const manifiesto = {
    id: 'ajustes',
    nombre: 'Ajustes',
    icono: 'ajustes',
    grupo: 'utilidades',
    orden: 9,
    tablas: {}
  };

  let contadores = $state({ productos: 0, ventas: 0, compras: 0 });
  let backupAuto = $state(null);

  async function cargarContadores() {
    const db = getDB();
    contadores.productos = (await db.productos.toArray()).length;
    contadores.ventas = (await db.ventas.toArray()).length;
    contadores.compras = (await db.compras.toArray()).length;
  }

  async function cambiarTema() {
    await alternarTema();
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
  }

  async function quitarPin() {
    const ok = await confirmar('Quitar PIN', '¿Estás seguro de eliminar el PIN?');
    if (!ok) return;
    await actualizarCfg({ pin: null });
    avisar('PIN eliminado', 'ok');
  }

  async function exportarRespaldo() {
    const db = getDB();
    const tablas = {};
    for (const table of db.tables) {
      tablas[table.name] = await table.toArray();
    }
    const data = { version: 6, fecha: Date.now(), tablas };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
    const data = JSON.parse(await file.text());
    const ok = await confirmar('Importar', 'Se reemplazan TODOS los datos actuales');
    if (!ok) return;
    const db = getDB();
    for (const [nombre, filas] of Object.entries(data.tablas)) {
      if (db[nombre]) await db[nombre].bulkPut(filas);
    }
    avisar('Datos importados', 'ok');
    setTimeout(() => location.reload(), 1000);
  }

  async function backupAhora() {
    const db = getDB();
    const tablas = {};
    for (const table of db.tables) tablas[table.name] = await table.toArray();
    localStorage.setItem('tp-backup-auto', JSON.stringify({ version: 6, fecha: Date.now(), tablas }));
    backupAuto = new Date().toISOString();
    avisar('Backup guardado', 'ok');
  }


  async function restaurarBackup() {
    const raw = localStorage.getItem('tp-backup-auto');
    const ok = await confirmar('Restaurar', 'Se reemplazan TODOS los datos actuales con el backup automático');
    const data = JSON.parse(raw);
    const db = getDB();
    for (const [nombre, filas] of Object.entries(data.tablas)) {
      if (db[nombre]) await db[nombre].bulkPut(filas);
    }
    avisar('Backup restaurado', 'ok');
    setTimeout(() => location.reload(), 1000);
  }


  async function restaurarBackup() {
    const raw = localStorage.getItem("tp-backup-auto");
    if (!raw) { avisar("No hay backup guardado", "dg"); return; }
    const ok = await confirmar("Restaurar", "Se reemplazan TODOS los datos actuales con el backup automático");
    if (!ok) return;
    const data = JSON.parse(raw);
    const db = getDB();
    for (const [nombre, filas] of Object.entries(data.tablas)) {
      if (db[nombre]) await db[nombre].bulkPut(filas);
    }
    avisar("Backup restaurado", "ok");
    setTimeout(() => location.reload(), 1000);
  }


  async function restaurarBackup() {
    const raw = localStorage.getItem("tp-backup-auto");
    if (!raw) { avisar("No hay backup guardado", "dg"); return; }
    const ok = await confirmar("Restaurar", "Se reemplazan TODOS los datos actuales con el backup automático");
    if (!ok) return;
    const data = JSON.parse(raw);
    const db = getDB();
    for (const [nombre, filas] of Object.entries(data.tablas)) {
      if (db[nombre]) await db[nombre].bulkPut(filas);
    }
    avisar("Backup restaurado", "ok");
    setTimeout(() => location.reload(), 1000);
  }


  async function restaurarBackup() {
    const raw = localStorage.getItem("tp-backup-auto");
    if (!raw) { avisar("No hay backup guardado", "dg"); return; }
    const ok = await confirmar("Restaurar", "Se reemplazan TODOS los datos actuales con el backup automático");
    if (!ok) return;
    const data = JSON.parse(raw);
    const db = getDB();
    for (const [nombre, filas] of Object.entries(data.tablas)) {
      if (db[nombre]) await db[nombre].bulkPut(filas);
    }
    avisar("Backup restaurado", "ok");
    setTimeout(() => location.reload(), 1000);
  }

  onMount(async () => {
    await cargarContadores();
    const ba = localStorage.getItem('tp-backup-auto');
    if (ba) {
      try { backupAuto = new Date(JSON.parse(ba).fecha).toISOString(); } 
      catch(e) { backupAuto = ba; }
    }
  });
</script>

<div class="modulo">
  <div class="card">
    <div class="tit">Apariencia</div>
    <div class="item">
      <label class="switch">
        <input type="checkbox" checked={ui.tema === 'dark'} on:change={cambiarTema} />
        <i></i> Modo oscuro
      </label>
    </div>
  </div>

  <div class="card">
    <div class="tit">Seguridad</div>
    <div class="item">
      <div class="lbl">PIN para operaciones sensibles</div>
      <div class="row">
        <button class="btn sec sm" onclick={cambiarPin}>
          <Icono nombre="edit" size={16} /> Cambiar PIN
        </button>
        {#if app.cfg?.pin}
          <button class="btn dgr sm" onclick={quitarPin}>
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
        <button class="btn ok sm" onclick={exportarRespaldo}>
          <Icono nombre="save" size={16} /> Exportar respaldo
        </button>
        <label class="btn sec sm">
          <Icono nombre="refresh" size={16} /> Importar datos
          <input type="file" accept=".json" style="display:none" on:change={importarDatos} />
        </label>
      </div>
    </div>
    <div class="item">
      <div class="mut">Último backup automático: {backupAuto ? new Date(backupAuto).toLocaleString() : 'Nunca'}</div>
      <button class="btn sec sm" onclick={backupAhora}>
        <Icono nombre="save" size={16} /> Hacer backup ahora
      </button>
      {#if backupAuto}
        <button class="btn dgr sm" onclick={restaurarBackup}>
          <Icono nombre="refresh" size={16} /> Restaurar backup automático
        </button>
      {/if}
      {#if backupAuto}
        <button class="btn dgr sm" onclick={restaurarBackup}>
          <Icono nombre="refresh" size={16} /> Restaurar backup automático
        </button>
      {/if}
      {#if backupAuto}
        <button class="btn dgr sm" onclick={restaurarBackup}>
          <Icono nombre="refresh" size={16} /> Restaurar backup automático
        </button>
      {/if}
      {#if backupAuto}
        <button class="btn dgr sm" onclick={restaurarBackup}>
          <Icono nombre="refresh" size={16} /> Restaurar backup automático
        </button>
      {/if}
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
