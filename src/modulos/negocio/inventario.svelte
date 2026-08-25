<script>
  import { onMount } from 'svelte';
  import { getDB } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, pedirPIN } from '../../core/store.svelte.js';
  import { dinero } from '../../core/appstate.svelte.js';
  import { n, fmtCant, fmtFH } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  export const manifiesto = {
    id: 'inventario',
    nombre: 'Inventario',
    icono: 'layers',
    grupo: 'negocio',
    orden: 4,
    tablas: {
      ajustesInv: '++id, productoId, fecha'
    }
  };

  let productos = $state([]);
  let lotes = $state([]);
  let ajustes = $state([]);
  let tab = $state('merma'); // 'merma' | 'inventario' | 'historial'
  let prodSel = $state(null);
  let busquedaProd = $state('');
  let motivo = $state('Merma / Daño');
  let cantidadAjuste = $state('');
  let prodExpandido = $state(null);

  async function cargar() {
    const db = getDB();
    productos = (await db.productos.toArray()).filter(p => !p.archivado);
    lotes = await db.lotes.toArray();
    ajustes = (await db.ajustesInv.toArray()).sort((a, b) => b.fecha - a.fecha);
  }

  function stock(productoId) {
    return lotes.filter(l => l.productoId === productoId)
      .reduce((a, l) => a + Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)), 0);
  }

  function costoPromedio(productoId) {
    const lotesProd = lotes.filter(l => l.productoId === productoId && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0)
      .sort((a, b) => n(a.fecha) - n(b.fecha));
    let total = 0, cant = 0;
    for (const l of lotesProd) {
      const r = n(l.cantidadInicial) - n(l.cantidadVendida);
      total += r * n(l.costo); cant += r;
    }
    return cant > 0 ? total / cant : 0;
  }

  function valorLotes(productoId) {
    return lotes.filter(l => l.productoId === productoId)
      .reduce((a, l) => {
        const r = Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida));
        return a + r * n(l.costo);
      }, 0);
  }

  let resultados = $derived.by(() => {
    const q = busquedaProd.trim().toLowerCase();
    if (!q) return productos.slice(0, 10);
    return productos.filter(p =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.codigo || '').toLowerCase().includes(q)
    ).slice(0, 10);
  });

  async function registrarAjuste() {
    if (!prodSel) { avisar('Selecciona un producto', 'dg'); return; }
    const cant = parseFloat(cantidadAjuste);
    if (isNaN(cant) || cant === 0) { avisar('Cantidad inválida', 'dg'); return; }

    const ok = await pedirPIN();
    if (!ok) { avisar('PIN incorrecto', 'dg'); return; }

    const db = getDB();
    const costoPerdida = cant < 0 ? Math.abs(cant) * costoPromedio(prodSel.id) : 0;

    if (cant < 0) {
      // Merma: consumir lotes FIFO
      let restante = Math.abs(cant);
      const lotesProd = lotes.filter(l => l.productoId === prodSel.id)
        .sort((a, b) => n(a.fecha) - n(b.fecha));
      for (const l of lotesProd) {
        if (restante <= 0) break;
        const disponible = n(l.cantidadInicial) - n(l.cantidadVendida);
        if (disponible <= 0) continue;
        const tomar = Math.min(restante, disponible);
        await db.lotes.update(l.id, { cantidadVendida: n(l.cantidadVendida) + tomar });
        restante -= tomar;
      }
      if (restante > 0) {
        avisar(`Stock insuficiente (faltan ${fmtCant(restante)})`, 'dg');
        return;
      }
    } else {
      // Sobrante: crear lote virtual
      await db.lotes.add({
        productoId: prodSel.id,
        fecha: Date.now(),
        cantidadInicial: cant,
        cantidadVendida: 0,
        costo: costoPromedio(prodSel.id)
      });
    }

    await db.ajustesInv.add({
      productoId: prodSel.id,
      productoNombre: prodSel.nombre,
      fecha: Date.now(),
      motivo,
      cantidad: cant,
      costoPerdida
    });

    bus.emitir('merma:registrada', { productoId: prodSel.id });
    avisar('Ajuste registrado', 'ok');
    prodSel = null;
    cantidadAjuste = '';
    await cargar();
  }

  function toggleExpand(p) {
    prodExpandido = prodExpandido === p.id ? null : p.id;
  }

  let inventario = $derived.by(() => {
    return productos
      .map(p => ({
        ...p,
        stockTotal: stock(p.id),
        valorTotal: valorLotes(p.id),
        lotesActivos: lotes.filter(l => l.productoId === p.id && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0)
          .sort((a, b) => n(a.fecha) - n(b.fecha))
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  onMount(cargar);
  bus.on('compra:registrada', cargar);
  bus.on('venta:registrada', cargar);
  bus.on('venta:anulada', cargar);
</script>

<div class="modulo">
  <div class="chips" style="margin-bottom:1rem">
    <button class="chip" class:activo={tab === 'merma'} onclick={() => tab = 'merma'}>Merma / Ajuste</button>
    <button class="chip" class:activo={tab === 'inventario'} onclick={() => tab = 'inventario'}>Inventario</button>
    <button class="chip" class:activo={tab === 'historial'} onclick={() => tab = 'historial'}>Historial</button>
  </div>

  {#if tab === 'merma'}
    <div class="card">
      <div class="tit">Registrar Ajuste de Inventario</div>
      <div class="lbl">
        Producto
        <div class="search">
          <Icono nombre="search" size={18} />
          <input class="inp" type="text" placeholder="Buscar..." bind:value={busquedaProd} />
        </div>
      </div>
      {#if resultados.length > 0 && !prodSel}
        <div class="list" style="margin-top:0.5rem;max-height:180px;overflow-y:auto">
          {#each resultados as p}
            <button class="item" onclick={() => { prodSel = p; busquedaProd = ''; }}>
              <div class="t">{p.nombre}</div>
              <div class="s">Stock: {fmtCant(stock(p.id))} {p.unidad || ''}</div>
            </button>
          {/each}
        </div>
      {/if}
      {#if prodSel}
        <div class="item" style="margin-top:0.5rem;background:var(--sf)">
          <div class="t">{prodSel.nombre}</div>
          <div class="s">Stock actual: {fmtCant(stock(prodSel.id))} {prodSel.unidad || ''}</div>
          <button class="mini" style="margin-top:0.25rem" onclick={() => prodSel = null}>
            <Icono nombre="x" size={14} /> Cambiar
          </button>
        </div>
      {/if}

      <label class="lbl" style="margin-top:0.75rem">
        Motivo
        <select class="inp" bind:value={motivo}>
          <option>Merma / Daño</option>
          <option>Vencimiento</option>
          <option>Robo / Pérdida</option>
          <option>Error de registro</option>
          <option>Sobrante en conteo</option>
        </select>
      </label>

      <label class="lbl" style="margin-top:0.5rem">
        Cantidad (negativo = merma, positivo = sobrante)
        <input class="inp" type="number" step="0.01" bind:value={cantidadAjuste} placeholder="Ej: -2.5 o +3" />
      </label>

      <div class="row" style="margin-top:1rem">
        <button class="btn ok" style="flex:1" onclick={registrarAjuste}>
          <Icono nombre="save" size={16} /> Registrar Ajuste
        </button>
      </div>
    </div>
  {:else if tab === 'inventario'}
    <div class="card">
      <div class="tit">Inventario por producto</div>
      {#if inventario.length === 0}
        <div class="empty"><Icono nombre="layers" size={48} /><p>Sin productos</p></div>
      {:else}
        <div class="list">
          {#each inventario as p}
            <div class="item blk">
              <button class="item-row" style="width:100%;background:none;border:none;text-align:left;cursor:pointer;padding:0" onclick={() => toggleExpand(p.id)}>
                <div class="item-info">
                  <div class="t">{p.nombre}</div>
                  <div class="s">Stock {fmtCant(p.stockTotal)} {p.unidad || ''} · {dinero(p.valorTotal)}</div>
                </div>
                <Icono nombre={prodExpandido === p.id ? 'minus' : 'plus'} size={18} />
              </button>
              {#if prodExpandido === p.id}
                <div class="item-lotes" style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px dashed var(--bd)">
                  {#if p.lotesActivos.length === 0}
                    <div class="mut">Sin lotes activos</div>
                  {:else}
                    {#each p.lotesActivos as l}
                      {@const r = n(l.cantidadInicial) - n(l.cantidadVendida)}
                      <div class="mut" style="font-size:0.85rem">
                        {fmtFH(l.fecha)} · {fmtCant(r)}/{fmtCant(l.cantidadInicial)} {p.unidad || ''}
                        @{dinero(n(l.costo))} = {dinero(r * n(l.costo))}
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="card">
      <div class="tit">Últimos ajustes</div>
      {#if ajustes.length === 0}
        <div class="empty"><Icono nombre="archive" size={48} /><p>Sin ajustes</p></div>
      {:else}
        <div class="list">
          {#each ajustes.slice(0, 30) as a}
            <div class="item">
              <div>
                <div class="t">{a.productoNombre}</div>
                <div class="s">{fmtFH(a.fecha)} · {a.motivo}</div>
              </div>
              <div style="text-align:right">
                <div class={a.cantidad > 0 ? 'pos' : 'neg'} style="font-weight:600">
                  {a.cantidad > 0 ? '+' : ''}{fmtCant(a.cantidad)}
                </div>
                {#if a.costoPerdida > 0}
                  <div class="neg" style="font-size:0.8rem">-{dinero(a.costoPerdida)}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .chip.activo { background: var(--pri); color: #fff; border-color: var(--pri); }
  .item.blk { display: block; }
  .item-row { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  .item-info { flex: 1; min-width: 0; }
</style>
