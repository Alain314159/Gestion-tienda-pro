<script module>
  export const manifiesto = {
        id: 'patrimonio',
        nombre: 'Patrimonio',
        icono: 'chart',
        grupo: 'negocio',
        orden: 6,
        tablas: {
          patrimonioMov: '++id, fecha, tipo',
          cierresPeriodo: '++id, periodo, fechaCierre'
        }
    </script>

    <script>
      import { onMount } from 'svelte';
      import { getDB } from '../../core/db.js';
      import { bus } from '../../core/bus.js';
      import { avisar, confirmar, pedirPIN } from '../../core/store.svelte.js';
      import { dinero, actualizarCfg, app } from '../../core/appstate.svelte.js';
      import { n, fmt, fmtFecha } from '../../core/util.js';
      import Icono from '../../core/Icono.svelte';

      };
</script>

<div class="modulo">
  <div class="card">
    <div class="tit">Patrimonio Total</div>
    <div class="big pos">{dinero(patrimonioTotal)}</div>
    <div class="mut">Capital {dinero(capitalTotal)} · Gan. acum. {dinero(gananciasAcumuladas)}</div>
  </div>

  <div class="card">
    <div class="tit">Resumen contable</div>
    <div class="list">
      <div class="item"><div class="t">Capital inicial</div><div>{dinero(capitalInicial)}</div></div>
      <div class="item"><div class="t">Aportes</div><div class="pos">+{dinero(aportesPatrimonio)}</div></div>
      <div class="item" style="font-weight:700"><div class="t">= CAPITAL</div><div>{dinero(capitalTotal)}</div></div>
      <hr class="sep" />
      <div class="item"><div class="t">Caja</div><div>{dinero(saldoCaja)}</div></div>
      <div class="item"><div class="t">Inventario</div><div>{dinero(valorInventario())}</div></div>
      <div class="item" style="font-weight:700"><div class="t">= ACTIVOS</div><div>{dinero(saldoCaja + valorInventario())}</div></div>
      <hr class="sep" />
      <div class="item"><div class="t">Ganancia bruta</div><div>{dinero(ventasPeriodo)}</div></div>
      <div class="item"><div class="t">Gastos operativos</div><div class="neg">-{dinero(gastosOpPeriodo)}</div></div>
      <div class="item" style="font-weight:700"><div class="t">= Ganancia neta (período)</div><div class="pos">{dinero(gananciaNetaPeriodo)}</div></div>
      <hr class="sep" />
      <div class="item" style="background:var(--sf);font-weight:700">
        <div class="t">DISPONIBLE PARA RETIRO</div>
        <div class="pos">{dinero(gananciaDisponible)}</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="tit">Acciones</div>
    <div class="row" style="flex-wrap:wrap;gap:0.5rem">
      <button class="btn dgr sm" on:click={() => abrirModal('Retiro')}>
        <Icono nombre="minus" size={16} /> Retirar Ganancia
      </button>
      <button class="btn ok sm" on:click={() => abrirModal('Aporte')}>
        <Icono nombre="plus" size={16} /> Aportar Capital
      </button>
      <button class="btn sec sm" on:click={() => abrirModal('capital')}>
        <Icono nombre="edit" size={16} /> Capital Inicial
      </button>
    </div>
  </div>

  <div class="card">
    <div class="tit">Cerrar Período</div>
    <div class="mut" style="margin-bottom:0.5rem">
      Al cerrar, los contadores del inicio se reinician. El historial se conserva y la ganancia se acumula.
    </div>
    <div class="mut">Período actual: desde {fmtFecha(periodoInicio)}</div>
    <div class="mut" style="margin-top:0.25rem">
      Ventas {dinero(ventasPeriodo)} · Compras {dinero(comprasPeriodo)} · Ganancia {dinero(gananciaNetaPeriodo)}
    </div>
    <button class="btn dgr" style="margin-top:0.75rem;width:100%" on:click={cerrarPeriodo}>
      <Icono nombre="check" size={16} /> Cerrar Período y Empezar Nuevo
    </button>
  </div>

  <div class="card">
    <div class="tit">Historial de Cierres</div>
    {#if cierres.length === 0}
      <div class="empty"><Icono nombre="archive" size={48} /><p>Sin cierres</p></div>
    {:else}
      <div class="list">
        {#each cierres as c}
          <div class="item">
            <div class="t">{c.periodo}</div>
            <div class="s">Cerrado {fmtFecha(c.fechaCierre)} · Vtas {dinero(c.totalVentas)} · Gan {dinero(c.ganancia)}</div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="card">
    <div class="tit">Historial de Movimientos</div>
    {#if movs.length === 0}
      <div class="empty"><Icono nombre="archive" size={48} /><p>Sin movimientos</p></div>
    {:else}
      <div class="list">
        {#each movs.slice(0, 30) as m}
          <div class="item">
            <div>
              <div class="t">{m.tipo}</div>
              <div class="s">{fmtFecha(m.fecha)}{m.nota ? ' · ' + m.nota : ''}</div>
            </div>
            <div class={m.tipo === 'Retiro' ? 'neg' : 'pos'} style="font-weight:600">
              {m.tipo === 'Retiro' ? '-' : '+'}{dinero(m.monto)}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if modalAbierto === 'retiro' || modalAbierto === 'aporte'}
    <div class="mask cent" on:click={() => modalAbierto = null} on:keydown={(e) => e.key === 'Escape' && (modalAbierto = null)} role="dialog">
      <div class="modal" on:click={(e) => e.stopPropagation()} role="dialog">
        <div class="tit">
          <Icono nombre={formMov.tipo === 'Retiro' ? 'minus' : 'plus'} size={20} />
          {formMov.tipo === 'Retiro' ? 'Retirar Ganancia' : 'Aportar Capital'}
        </div>
        <label class="lbl">
          Monto
          <input class="inp" type="number" step="0.01" bind:value={formMov.monto} placeholder="0.00" />
        </label>
        <label class="lbl" style="margin-top:0.5rem">
          Nota (opcional)
          <input class="inp" type="text" bind:value={formMov.nota} placeholder="Ej: Retiro para gastos personales" />
        </label>
        <div class="row" style="margin-top:1rem">
          <button class="btn sec" on:click={() => modalAbierto = null}>Cancelar</button>
          <button class="btn ok" style="flex:1" on:click={guardarMov}>
            <Icono nombre="save" size={16} /> Guardar
          </button>
        </div>
      </div>
    </div>
  {:else if modalAbierto === 'capital'}
    <div class="mask cent" on:click={() => modalAbierto = null} on:keydown={(e) => e.key === 'Escape' && (modalAbierto = null)} role="dialog">
      <div class="modal" on:click={(e) => e.stopPropagation()} role="dialog">
        <div class="tit"><Icono nombre="edit" size={20} /> Capital Inicial</div>
        <div class="mut">Actual: {dinero(capitalInicial)}</div>
        <label class="lbl" style="margin-top:0.5rem">
          Nuevo capital inicial
          <input class="inp" type="number" step="0.01" bind:value={nuevoCapital} placeholder="0.00" />
        </label>
        <div class="row" style="margin-top:1rem">
          <button class="btn sec" on:click={() => modalAbierto = null}>Cancelar</button>
          <button class="btn ok" style="flex:1" on:click={guardarCapital}>
            <Icono nombre="save" size={16} /> Guardar
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .big.pos { color: var(--ok); }
</style>
