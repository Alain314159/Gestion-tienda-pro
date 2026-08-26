<script module>
  export const manifiesto = {
        id: 'inicio',
        nombre: 'Inicio',
        icono: 'home',
        grupo: 'negocio',
        orden: 0,
        tablas: {}
    </script>

    <script>
      import { onMount, onDestroy } from 'svelte';
      import { getDB } from '../../core/db.js';
      import { bus } from '../../core/bus.js';
      import { ui } from ../../core/store.js';
      import { dinero, app } from ../../core/appstate.js';
      import { n, fmt, fmtCant, fmtFH, fmtFecha } from '../../core/util.js';
      import Icono from '../../core/Icono.svelte';

      };
</script>

<div class="modulo">
  {#if productosAgotados.length > 0 || productosBajoStock.length > 0}
    <div class="card" style="border-color:var(--wn)">
      <div class="tit" style="color:var(--wn)">
        <Icono nombre="alert" size={18} /> Alertas de stock
      </div>
      <div class="mut">
        {productosAgotados.length} agotado(s) · {productosBajoStock.length} bajo(s)
      </div>
    </div>
{/if}

  <div class="card">
    <div class="tit">Resumen del período</div>
    <div class="mut" style="margin-bottom:0.5rem">Desde {fmtFecha(periodoInicio)}</div>
    <div class="row" style="gap:0.75rem;flex-wrap:wrap">
      <div style="flex:1;min-width:120px">
        <div class="mut">Ventas</div>
        <div class="big pos">{dinero(ventasPeriodo)}</div>
      </div>
      <div style="flex:1;min-width:120px">
        <div class="mut">Ganancia</div>
        <div class="big pos">{dinero(gananciaNetaPeriodo)}</div>
      </div>
      <div style="flex:1;min-width:120px">
        <div class="mut">Compras</div>
        <div class="big neg">{dinero(comprasPeriodo)}</div>
      </div>
      <div style="flex:1;min-width:120px">
        <div class="mut">Margen</div>
        <div class="big">{margenPeriodo}%</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="tit">Efectivo en Caja</div>
    <div class="big" class:pos={saldoCaja >= 0} class:neg={saldoCaja < 0}>
      {dinero(saldoCaja)}
    </div>
    <div class="mut">Inventario: {dinero(valorInventario())}</div>
  </div>

  <div class="card">
    <div class="tit">Ventas vs Ganancia (6 meses)</div>
    <div style="height:220px;position:relative">
      {#if Chart}
        <canvas bind:this={canvas}></canvas>
      {:else}
        <div class="empty" style="padding:2rem"><div class="mut">Cargando gráfica...</div></div>
      {/if}
    </div>
  </div>

  <div class="card">
    <div class="tit">Top rentables del mes</div>
    {#if topRentables.length === 0}
      <div class="empty"><div class="mut">Sin ventas este mes</div></div>
    {:else}
      <div class="list">
        {#each topRentables as p, i}
          <div class="item">
            <div class="t">{i + 1}. {p.nombre}</div>
            <div class="pos" style="font-weight:600">{dinero(p.gan)}</div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="card">
    <div class="tit">Accesos rápidos</div>
    <div class="row" style="flex-wrap:wrap;gap:0.5rem">
      <button class="btn ok sm" on:click={() => irA('ventas')}>
        <Icono nombre="cash" size={16} /> Nueva Venta
      </button>
      <button class="btn sec sm" on:click={() => irA('compras')}>
        <Icono nombre="cart" size={16} /> Registrar Compra
      </button>
      <button class="btn sec sm" on:click={() => irA('caja')}>
        <Icono nombre="check" size={16} /> Arqueo de Caja
      </button>
      <button class="btn sec sm" on:click={() => irA('inventario')}>
        <Icono nombre="layers" size={16} /> Ver Inventario
      </button>
    </div>
    <div class="mut" style="margin-top:0.75rem;font-size:0.85rem">
      Última actividad: {ultimaActividad}
    </div>
  </div>
</div>

<style>
  .big.pos { color: var(--ok); }
  .big.neg { color: var(--dg); }
</style>
