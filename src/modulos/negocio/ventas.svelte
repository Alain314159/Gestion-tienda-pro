<script module>
  export const manifiesto = {
    id: 'ventas',
    nombre: 'Ventas',
    icono: 'cart',
    grupo: 'negocio',
    orden: 1,
    tablas: { ventas: '++id, fecha, anulada', lotes: '++id, productoId, fecha, costo, compraId' }
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { listar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, confirmar, preguntar, pedirPIN } from '../../core/state.svelte.js';
  import { n, m, q, fmt, fmtCant, fmtFH, stockProducto, calcFIFO } from '../../core/util.js';
  import { VentaService } from '../../services/VentaService.js';
  import Icono from '../../core/Icono.svelte';

  let productos = $state([]);
  let lotes = $state([]);
  let ventas = $state([]);
  let busq = $state('');
  let focusBusq = $state(false);
  let carrito = $state([]);
  let procesando = $state(false);

  let cobro = $state({ activo: false, total: 0, recibido: '', vuelto: 0 });
  let busqHist = $state('');
  let busqDebounced = $state('');
  let busqHistDebounced = $state('');
  let paginaHist = $state(1);
  const itemsPorPagina = 20;
  $effect(() => { const t = setTimeout(() => busqDebounced = busq, 200); return () => clearTimeout(t); });
  $effect(() => { const t = setTimeout(() => busqHistDebounced = busqHist, 200); return () => clearTimeout(t); });
  $effect(() => { busqHistDebounced; paginaHist = 1; });

  let prodsActivos = $derived(productos.filter(p => !p.archivado));
  let resultados = $derived((() => {
    const qry = busqDebounced.toLowerCase().trim();
    const base = qry ? prodsActivos.filter(p => p.nombre.toLowerCase().includes(qry) || (p.codigo || '').toLowerCase().includes(qry)) : prodsActivos;
    return base.filter(p => stockProducto(lotes, p.id) > 0).slice(0, 12);
  })());
  let ventasFiltradas = $derived((() => {
    let v = ventas.slice().sort((a, b) => { if (a.anulada !== b.anulada) return a.anulada ? 1 : -1; return new Date(b.fecha) - new Date(a.fecha); });
    const qry = busqHistDebounced.toLowerCase().trim();
    if (qry) v = v.filter(x => x.items.some(i => i.nombre.toLowerCase().includes(qry)));
    return v;
  })());
  let ventasPaginadas = $derived(ventasFiltradas.slice((paginaHist - 1) * itemsPorPagina, paginaHist * itemsPorPagina));
  let totalPaginas = $derived(Math.max(1, Math.ceil(ventasFiltradas.length / itemsPorPagina)));
  let totalCarrito = $derived(m(carrito.reduce((s, it) => s + (n(it.precio) * n(it.cant)), 0)));
  let gananciaCarrito = $derived(m(carrito.reduce((s, it) => {
    const f = calcFIFO(lotes, it.productoId, n(it.cant));
    if (f.error) return s;
    return s + ((n(it.precio) * n(it.cant)) - f.costoTotal);
  }, 0)));

  async function recargar() {
    [productos, lotes, ventas] = await Promise.all([listar('productos'), listar('lotes'), listar('ventas')]);
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  function agregar(p) {
    const s = stockProducto(lotes, p.id);
    if (s <= 0) return avisar('Sin stock', 'bad');
    const ex = carrito.find(i => i.productoId === p.id);
    if (ex) {
      if (n(ex.cant) < s) ex.cant = String(n(ex.cant) + 1);
      else return avisar('Stock maximo', 'warn');
    } else {
      carrito.push({ productoId: p.id, nombre: p.nombre, precio: String(p.precio), cant: '1', unidad: p.unidad || '' });
    }
    busq = '';
    focusBusq = false;
  }

  function cambiarCant(it, dir) {
    let val = n(it.cant) + dir;
    if (it.unidad && ['kg', 'lb', 'gr', 'litro', 'm'].includes(it.unidad)) {
      val = n(it.cant) + (dir * 0.5);
    }
    const max = stockProducto(lotes, it.productoId);
    if (val > max) return avisar('Stock maximo alcanzado', 'warn');
    if (val < 0) val = 0;
    it.cant = String(val);
  }

  function validarCant(it) {
    let val = n(it.cant);
    const max = stockProducto(lotes, it.productoId);
    if (val > max) { val = max; avisar('Cantidad ajustada al stock disponible', 'warn'); }
    if (val < 0) val = 0;
    it.cant = String(val);
  }

  function subTotal(it) {
    return m(n(it.precio) * n(it.cant));
  }

  function iniciarCobro() {
    const inv = carrito.filter(it => n(it.cant) <= 0);
    if (inv.length) return avisar('Todas las cantidades deben ser > 0', 'bad');
    cobro = { activo: true, total: totalCarrito, recibido: '', vuelto: 0 };
  }

  function calcVuelto() {
    const rec = n(cobro.recibido);
    cobro.vuelto = rec > 0 ? m(rec - cobro.total) : 0;
  }

  async function procesarVenta() {
    procesando = true;
    try {
      const { venta, total, ganancia } = await VentaService.procesar(carrito, lotes);
      await recargar();
      carrito = [];
      cobro.activo = false;
      avisar('Venta exitosa: ' + fmt(total));
      bus.emit('recargar');
    } catch (e) {
      avisar(e.message, 'bad');
    } finally {
      procesando = false;
    }
  }

  async function anularVenta(v) {
    const pinOk = await pedirPIN();
    if (!pinOk) return;
    const ok = await confirmar('Anular venta', '¿Anular venta por ' + fmt(v.total) + '? Se restaura el stock.');
    if (!ok) return;

    await VentaService.anular(v, lotes);
    await recargar();
    bus.emit('recargar');
    avisar('Venta anulada');
  }
</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="cart" size={18} />
      Nueva Venta
    </div>
    <div class="relative mb-3">
      <Icono nombre="search" size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input class="w-full pl-10 pr-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="text" placeholder="Buscar producto por nombre o codigo..." bind:value={busq} onfocus={() => focusBusq = true} />
    </div>
    {#if focusBusq}
      <div class="border border-border rounded-[var(--radius-md)] bg-card max-h-64 overflow-y-auto mb-3 shadow-[var(--color-shadow)]">
        <div class="flex justify-between items-center px-3 py-2.5 text-xs font-extrabold text-muted border-b border-border sticky top-0 bg-card">
          <span>{resultados.length} resultado(s)</span>
          <button class="bg-transparent border-none text-danger font-extrabold text-lg cursor-pointer leading-none" onclick={() => { focusBusq = false; busq = ''; }}>×</button>
        </div>
        {#if resultados.length === 0}
          <div class="text-center text-muted py-5 text-sm">Sin coincidencias (o sin stock)</div>
        {:else}
          {#each resultados as p}
            <button class="w-full flex justify-between items-center px-3.5 py-3 text-left border-b border-border last:border-0 text-sm cursor-pointer hover:bg-background active:bg-background" onclick={() => agregar(p)}>
              <span>{p.nombre}</span>
              <span class="text-muted text-xs whitespace-nowrap">Stock {fmtCant(stockProducto(lotes, p.id))} {p.unidad || ''} · {fmt(p.precio)}</span>
            </button>
          {/each}
        {/if}
      </div>
    {/if}

    {#if carrito.length > 0}
      <div class="mt-3">
        {#each carrito as it, i}
          <div class="bg-background rounded-[var(--radius-md)] p-3.5 mb-3">
            <div class="flex justify-between items-start gap-2">
              <div class="font-bold text-sm truncate flex-1">{it.nombre}</div>
              <button class="w-8 h-8 rounded-full bg-danger text-white border-none flex items-center justify-center cursor-pointer flex-shrink-0" aria-label="Eliminar del carrito" onclick={() => carrito.splice(i, 1)}><Icono nombre="x" size={14} color="#fff" /></button>
            </div>
            <div class="flex items-center gap-3 flex-wrap mt-3">
              <span class="text-xs text-muted w-10">Cant</span>
              <div class="flex items-center bg-card border border-border rounded-lg overflow-hidden">
                <button class="w-9 h-9 bg-background border-none text-primary font-extrabold text-lg cursor-pointer flex items-center justify-center" aria-label="Disminuir cantidad" onclick={() => cambiarCant(it, -1)}><Icono nombre="minus" size={14} /></button>
                <input class="w-16 text-center border-none bg-transparent text-sm py-1" type="text" bind:value={it.cant} onblur={() => validarCant(it)} />
                <button class="w-9 h-9 bg-background border-none text-primary font-extrabold text-lg cursor-pointer flex items-center justify-center" onclick={() => cambiarCant(it, 1)}><Icono nombre="plus" size={14} /></button>
              </div>
              <span class="text-xs text-muted ml-1">@</span>
              <input class="w-20 text-center border border-border rounded-lg bg-card text-sm py-1.5 px-1" type="number" step="0.01" bind:value={it.precio} />
            </div>
            <div class="text-xs text-muted mt-2">{fmt(it.precio)} × {fmtCant(it.cant)} {it.unidad || ''} = <b class="text-primary">{fmt(subTotal(it))}</b></div>
          </div>
        {/each}
        <div class="flex justify-between items-center bg-success/10 border border-success rounded-[var(--radius-md)] p-3.5 my-4 font-extrabold text-success">
          <span>TOTAL</span>
          <span>{fmt(totalCarrito)}</span>
        </div>
        <div class="flex justify-between text-xs text-success mb-4 px-1">
          <span>Ganancia estimada</span>
          <span>{fmt(gananciaCarrito)}</span>
        </div>
        <button class="w-full py-3.5 rounded-[var(--radius-md)] bg-success text-white font-extrabold text-sm mb-3 active:scale-[0.97] transition-transform disabled:opacity-50" onclick={iniciarCobro} disabled={procesando}>
          <Icono nombre="check" size={16} color="#fff" />
          {procesando ? 'Procesando...' : 'Cobrar Venta'}
        </button>
        <button class="w-full py-3.5 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={() => carrito = []}>
          <Icono nombre="trash" size={14} />
          Limpiar carrito
        </button>
      </div>
    {:else if !focusBusq}
      <div class="text-center text-muted py-8 text-sm">Toca el buscador y agrega productos al carrito</div>
    {/if}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="history" size={18} />
      Historial de Ventas
    </div>
    <input class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3" type="text" placeholder="Buscar en historial..." bind:value={busqHist} />
    {#if ventasPaginadas.length === 0}
      <div class="text-center text-muted py-6 text-sm">Sin ventas</div>
    {:else}
      {#each ventasPaginadas as v}
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border {v.anulada ? 'opacity-50' : ''}">
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm {v.anulada ? 'line-through' : ''}">{v.items.map(x => x.nombre + ' ×' + fmtCant(x.cantidad) + (x.unidad ? (' ' + x.unidad) : '')).join(', ')}</div>
            <div class="text-xs text-muted">{fmtFH(v.fecha)} · <b class="text-primary">{fmt(v.total)}</b> · <span class="text-success">+{fmt(v.ganancia)}</span></div>
          </div>
          {#if !v.anulada}
            <button class="bg-transparent border-none text-danger text-xs underline cursor-pointer" onclick={() => anularVenta(v)}>Anular</button>
          {:else}
            <span class="inline-block px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold text-white bg-muted">ANULADA</span>
          {/if}
        </div>
      {/each}
      {#if totalPaginas > 1}
        <div class="flex justify-center items-center gap-2 mt-3 text-sm">
          <button class="px-3 py-1 rounded-md border border-border bg-card disabled:opacity-30" onclick={() => paginaHist--} disabled={paginaHist <= 1}>←</button>
          <span class="text-muted">{paginaHist} / {totalPaginas}</span>
          <button class="px-3 py-1 rounded-md border border-border bg-card disabled:opacity-30" onclick={() => paginaHist++} disabled={paginaHist >= totalPaginas}>→</button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Modal Cobro -->
{#if cobro.activo}
  <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 no-print" role="dialog">
    <div class="bg-card rounded-[var(--radius-lg)] p-5 w-full max-w-sm shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-pop">
      <div class="flex items-center gap-2 font-extrabold text-primary text-lg mb-3">
        <Icono nombre="wallet" size={20} />
        Cobrar Venta
      </div>
      <div class="text-center text-xl font-extrabold my-2">Total a Pagar: {fmt(cobro.total)}</div>
      <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2" type="number" inputmode="decimal" step="0.01" placeholder="Efectivo recibido (opcional)" bind:value={cobro.recibido} oninput={calcVuelto} />
      <button class="w-full py-2 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-bold text-sm mb-3" onclick={() => { cobro.recibido = cobro.total.toFixed(2); calcVuelto(); }}>Pagar Exacto</button>
      {#if cobro.recibido && cobro.vuelto >= 0}
        <div class="text-center text-2xl font-extrabold text-success my-2 p-4 bg-success/10 rounded-[var(--radius-md)]">Vuelto: {fmt(cobro.vuelto)}</div>
      {/if}
      <button class="w-full py-3 rounded-[var(--radius-md)] bg-success text-white font-extrabold text-sm mb-2 active:scale-[0.97] transition-transform disabled:opacity-50" onclick={procesarVenta} disabled={procesando}>
        <Icono nombre="check" size={16} color="#fff" />
        {procesando ? 'Procesando...' : 'Confirmar Pago'}
      </button>
      <button class="w-full py-3 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={() => cobro.activo = false}>Cancelar</button>
    </div>
  </div>
{/if}
