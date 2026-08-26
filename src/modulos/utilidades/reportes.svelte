<script module>
  export const manifiesto = {
        id: 'reportes',
        nombre: 'Reportes',
        icono: 'chart',
        grupo: 'utilidades',
        orden: 10,
        tablas: {}
    </script>

    <script>
      import { onMount } from 'svelte';
      import { getDB } from '../../core/db.js';
      import { avisar } from '../../core/store.svelte.js';
      import { dinero } from '../../core/appstate.svelte.js';
      import { n, fmt, fmtFecha } from '../../core/util.js';
      import Icono from '../../core/Icono.svelte';

      };
</script>

<div class="modulo">
  <div class="card">
    <div class="tit">Reporte por Período</div>
    <div class="row" style="gap:0.5rem">
      <label class="lbl" style="flex:1">
        Desde
        <input class="inp" type="date" bind:value={fechaDesde} />
      </label>
      <label class="lbl" style="flex:1">
        Hasta
        <input class="inp" type="date" bind:value={fechaHasta} />
      </label>
    </div>
    <button class="btn ok" style="width:100%;margin-top:0.75rem" on:click={generarReporte}>
      <Icono nombre="search" size={16} /> Generar Reporte
    </button>
  </div>

  {#if resultado}
    <div class="card">
      <div class="tit">Resultado</div>
      <div class="list">
        <div class="item"><div class="t">Ingresos</div><div class="pos">{dinero(resultado.ingresos)}</div></div>
        <div class="item"><div class="t">Costos (COGS)</div><div class="neg">-{dinero(resultado.cogs)}</div></div>
        <div class="item" style="font-weight:600"><div class="t">Ganancia bruta</div><div>{dinero(resultado.bruta)} ({resultado.margenB}%)</div></div>
        <div class="item"><div class="t">Mermas</div><div class="neg">-{dinero(resultado.mermas)}</div></div>
        <div class="item" style="font-weight:700;background:var(--sf)">
          <div class="t">Ganancia neta</div>
          <div class="pos">{dinero(resultado.neta)} ({resultado.margenN}%)</div>
        </div>
        <div class="item"><div class="t">Ventas realizadas</div><div>{resultado.numVentas}</div></div>
      </div>
      <div class="row" style="margin-top:0.75rem;gap:0.5rem">
        <button class="btn sec sm" style="flex:1" on:click={exportarCSV}>
          <Icono nombre="download" size={16} /> CSV
        </button>
        <button class="btn sec sm" style="flex:1" on:click={compartir}>
          <Icono nombre="share" size={16} /> Compartir
        </button>
      </div>
    </div>
  {/if}
</div>
