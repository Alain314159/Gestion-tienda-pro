<script module>
  export const manifiesto = {
        id: 'ajustes',
        nombre: 'Ajustes',
        icono: 'ajustes',
        grupo: 'utilidades',
        orden: 9,
        tablas: {}
    </script>

    <script>
      import { onMount } from 'svelte';
      import { getDB } from '../../core/db.js';
      import { avisar, confirmar, preguntar, ui, alternarTema } from '../../core/store.svelte.js';
      import { actualizarCfg, app } from '../../core/appstate.svelte.js';
      import Icono from '../../core/Icono.svelte';

      };
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
        <button class="btn sec sm" on:click={cambiarPin}>
          <Icono nombre="edit" size={16} /> Cambiar PIN
        </button>
        {#if app.cfg?.pin}
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
      <div class="mut">Último backup automático: {backupAuto ? new Date(backupAuto).toLocaleString() : 'Nunca'}</div>
      <button class="btn sec sm" on:click={backupAhora}>
        <Icono nombre="save" size={16} /> Hacer backup ahora
      </button>
      {#if backupAuto}
        <button class="btn dgr sm" on:click={restaurarBackup}>
          <Icono nombre="refresh" size={16} /> Restaurar backup automático
        </button>
      {/if}
      {#if backupAuto}
        <button class="btn dgr sm" on:click={restaurarBackup}>
          <Icono nombre="refresh" size={16} /> Restaurar backup automático
        </button>
      {/if}
      {#if backupAuto}
        <button class="btn dgr sm" on:click={restaurarBackup}>
          <Icono nombre="refresh" size={16} /> Restaurar backup automático
        </button>
      {/if}
      {#if backupAuto}
        <button class="btn dgr sm" on:click={restaurarBackup}>
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
