<script module>
  export const manifiesto = {
      id: 'ventas',
      nombre: 'Ventas',
      icono: 'cash',
      grupo: 'negocio',
      orden: 1,
      tablas: { ventas: '++id, fecha, estado' }
  </script>

  <script>
    import { onMount } from 'svelte';
    import { getDB } from '../../core/db.js';
    import { bus } from '../../core/bus.js';
    import { avisar, pedirPIN } from '../../core/store.svelte.js';
    import { dinero } from '../../core/appstate.svelte.js';
    import { n, fmtCant, fmtFH } from '../../core/util.js';
    import Icono from '../../core/Icono.svelte';

    };
</script>

<div class="modulo">
  <div class="card">
    <div class="tit">Nueva Venta</div>
    <div class="search">
      <Icono nombre="search" size={18} />
      <input class="inp" type="text" placeholder="Buscar producto..." bind:value={busqueda} />
    </div>

    {#if busqueda.trim()}
      <div class="mut" style="text-align:right;font-size:0.85rem;margin-top:0.25rem">{resultados.length} resultado(s)</div>
    {/if}
    {#if busqueda.trim()}
      <div class="mut" style="text-align:right;font-size:0.85rem;margin-top:0.25rem">{resultados.length} resultado(s)</div>
    {/if}
    {#if resultados.length > 0}
      <div class="list" style="margin-top:0.5rem;max-height:200px;overflow-y:auto">
        {#each resultados as p}
          <button class="item" on:click={() => agregarAlCarrito(p)}>
            <div class="t">{p.nombre}</div>
            <div class="s">Stock {fmtCant(stock(p.id))} {p.unidad||''} · {dinero(p.precio)}</div>
          </button>
        {/each}
      </div>
    {:else if busqueda.trim()}
      <div class="mut" style="text-align:center;padding:0.5rem">Sin coincidencias (o sin stock)</div>
    {/if}
  </div>

  {#if carrito.length > 0}
    <div class="card">
      <div class="tit">Carrito ({carrito.length})</div>
      <div class="list">
        {#each carrito as it, i}
          <div class="item blk">
            <div class="item-row">
              <div class="item-info">
                <div class="t">{it.nombre}</div>
                <div class="s">
                  <button class="mini" on:click={() => cambiarCant(it, -1)}><Icono nombre="minus" size={14}/></button>
                  <span style="margin:0 0.4rem;font-weight:600">{fmtCant(it.cant)} {it.unidad||''}</span>
                  <button class="mini" on:click={() => cambiarCant(it, 1)}><Icono nombre="plus" size={14}/></button>
                  <span style="margin-left:0.5rem">@</span>
                  <input class="inp" type="number" step="0.01" style="width:80px;display:inline-block;margin-left:0.25rem"
                    bind:value={it.precio} />
                </div>
              </div>
              <div class="pos" style="font-weight:600;white-space:nowrap">{dinero(subTotalItem(it))}</div>
            </div>
          </div>
        {/each}
      </div>
      <hr class="sep" />
      <div class="row" style="justify-content:space-between;font-weight:700;font-size:1.05rem">
        <span>TOTAL</span>
        <span class="pos">{dinero(totalCarrito())}</span>
      </div>
      <div class="row" style="justify-content:space-between;color:var(--ok);font-size:0.9rem">
        <span>Ganancia estimada</span>
        <span>{dinero(gananciaCarrito())}</span>
      </div>
      <div class="row" style="margin-top:0.5rem">
        <button class="btn sec" on:click={limpiarCarrito}>
          <Icono nombre="trash" size={16} /> Limpiar
        </button>
        <button class="btn ok" style="flex:1" on:click={abrirCobro}>
          <Icono nombre="cash" size={16} /> {procesando ? 'Procesando...' : 'Cobrar Venta'}
        </button>
      </div>
    </div>
  {:else}
    <div class="empty">
      <Icono nombre="cart" size={48} />
      <p>Toca el buscador y agrega productos al carrito</p>
    </div>
  {/if}

  <div class="card">
    <div class="tit">Historial de Ventas</div>
    {#if ventas.length === 0}
      <div class="empty"><Icono nombre="archive" size={48} /><p>Sin ventas</p></div>
    {:else}
      <div class="list">
        {#each ventas as v}
          <div class="item blk" class:anulada={v.estado === 'anulada'}>
            <div class="item-row">
              <div class="item-info">
                <div class="t">
                  {fmtFH(v.fecha)}
                  {#if v.estado === 'anulada'}<span class="badge dg">ANULADA</span>{/if}
                </div>
                <div class="s">{v.items.map(x => x.nombre + ' ×' + fmtCant(x.cant) + (x.unidad ? ' ' + x.unidad : '')).join(', ')}</div>
              </div>
              <div style="text-align:right">
                <div class="pos" style="font-weight:600">{dinero(v.total)}</div>
                <div class="mut" style="font-size:0.8rem">+{dinero(v.ganancia)}</div>
                {#if v.estado !== 'anulada'}
                  <button class="mini dg" style="margin-top:0.25rem" on:click={() => anularVenta(v)}>
                    <Icono nombre="trash" size={14} /> Anular
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if cobroAbierto}
    <div class="mask cent" on:click={() => cobroAbierto = false} on:keydown={(e) => e.key === 'Escape' && (cobroAbierto = false)} role="dialog">
      <div class="modal" on:click={(e) => e.stopPropagation()} role="dialog">
        <div class="tit"><Icono nombre="cash" size={20} /> Cobrar Venta</div>
        <div class="big" style="text-align:center;margin:0.5rem 0">{dinero(totalCarrito())}</div>
        <div class="mut" style="text-align:center;margin-bottom:1rem">Total a pagar</div>
        <label class="lbl">
          Recibido
          <input class="inp" type="number" step="0.01" bind:value={recibido} />
        </label>
        <div class="row" style="margin-top:0.5rem">
          <button class="btn sec sm" on:click={pagarExacto}>Pagar exacto</button>
        </div>
        <div class="row" style="justify-content:space-between;margin-top:1rem;font-weight:700">
          <span>Vuelto</span>
          <span class="pos">{dinero(vuelto)}</span>
        </div>
        <div class="row" style="margin-top:1rem">
          <button class="btn sec" on:click={() => cobroAbierto = false}>Cancelar</button>
          <button class="btn ok" style="flex:1" on:click={confirmarPago} disabled={procesando}>
            <Icono nombre="check" size={16} /> Confirmar Pago
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .item.blk { display: block; }
  .item-row { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .item-info { flex: 1; min-width: 0; }
  .item.anulada { opacity: 0.55; border-style: dashed; }
  .mini { background: none; border: 1px solid var(--bd); border-radius: 10px; padding: 4px 8px; color: var(--txm); cursor: pointer; }
  .mini:hover { color: var(--tx); }
  .mini.dg { color: var(--dg); }
</style>
