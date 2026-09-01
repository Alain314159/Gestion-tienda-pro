<script module>
  export const manifiesto = {
    id: 'compras',
    nombre: 'Compras',
    icono: 'bag',
    grupo: 'negocio',
    orden: 2,
    tablas: { compras: '++id, fecha, productoId, anulada', lotes: '++id, productoId, fecha, costo, compraId' }
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { listar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, confirmar } from '../../core/state.svelte.js';
  import { n, m, fmt, fmtCant, fmtFH, stockProducto } from '../../core/util.js';
  import { CompraService } from '../../services/CompraService.js';
  import Icono from '../../core/Icono.svelte';

  let productos = $state([]);
  let lotes = $state([]);
  let compras = $state([]);
  let busq = $state('');
  let busqDebounced = $state('');
  $effect(() => { const t = setTimeout(() => busqDebounced = busq, 200); return () => clearTimeout(t); });
  let focusBusq = $state(false);
  let paginaHist = $state(1);
  const itemsPorPagina = 20;

  let form = $state({ editId: '', productoId: '', nombre: '', cantidad: '', costo: '', unidad: '' });

  let prodsActivos = $derived(productos.filter(p => !p.archivado));
  let resultados = $derived((() => {
    const qry = busqDebounced.toLowerCase().trim();
    const base = qry ? prodsActivos.filter(p => p.nombre.toLowerCase().includes(qry) || (p.codigo || '').toLowerCase().includes(qry)) : prodsActivos;
    return base.slice(0, 12);
  })());
  let comprasOrdenadas = $derived(compras.filter(c => !c.anulada).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
  let comprasPaginadas = $derived(comprasOrdenadas.slice((paginaHist - 1) * itemsPorPagina, paginaHist * itemsPorPagina));
  let totalPaginas = $derived(Math.max(1, Math.ceil(comprasOrdenadas.length / itemsPorPagina)));

  async function recargar() {
    [productos, lotes, compras] = await Promise.all([listar('productos'), listar('lotes'), listar('compras')]);
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  function seleccionar(p) {
    form = { editId: '', productoId: p.id, nombre: p.nombre, cantidad: '', costo: '', unidad: p.unidad || '' };
    busq = '';
    focusBusq = false;
  }

  function resetForm() {
    form = { editId: '', productoId: '', nombre: '', cantidad: '', costo: '', unidad: '' };
  }

  function loteSinVentas(cid) {
    const l = lotes.find(x => x.compraId === cid);
    return l ? n(l.cantidadVendida) === 0 : true;
  }

  function editar(c) {
    if (!loteSinVentas(c.id)) return;
    form = { editId: c.id, productoId: c.productoId, nombre: c.productoNombre, cantidad: String(c.cantidad), costo: String(c.costo), unidad: c.unidad || '' };
    window.scrollTo(0, 0);
  }

  async function eliminar(c) {
    if (!loteSinVentas(c.id)) return;
    const ok = await confirmar('Eliminar compra', '¿Eliminar compra de ' + c.productoNombre + '?');
    if (!ok) return;
    const l = lotes.find(x => x.compraId === c.id);
    await CompraService.eliminar(c.id, l?.id);
    await recargar();
    bus.emit('recargar');
    avisar('Compra eliminada');
  }

  async function guardarCompra() {
    const cant = n(form.cantidad), costo = n(form.costo);
    if (!form.productoId) return avisar('Selecciona producto', 'bad');
    if (cant <= 0) return avisar('Cantidad debe ser > 0', 'bad');
    if (costo < 0) return avisar('Costo invalido', 'bad');
    const total = m(cant * costo);

    try {
      if (form.editId) {
        const l = lotes.find(x => x.compraId === form.editId);
        if (l && n(l.cantidadVendida) > 0) return avisar('Lote con ventas: no editable', 'bad');
        const c = compras.find(x => x.id === form.editId);
        await CompraService.editar(c, l, {
          compra: { productoId: form.productoId, productoNombre: form.nombre, productoUnidad: form.unidad, cantidad: cant, costo, total, unidad: form.unidad },
          lote: { productoId: form.productoId, productoNombre: form.nombre, productoUnidad: form.unidad, cantidadInicial: cant, costo }
        });
      } else {
        await CompraService.registrarExistente({
          productoId: form.productoId, nombre: form.nombre, unidad: form.unidad || '',
          cantidad: cant, costo, total
        });
      }
      await recargar();
      resetForm();
      avisar('Compra ' + fmt(total));
      bus.emit('recargar');
    } catch (e) { avisar(e.message, 'bad'); }
  }
</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="bag" size={18} />
      Registrar Compra
    </div>
    {#if !form.productoId}
      <div class="relative mb-2">
        <Icono nombre="search" size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input class="w-full pl-10 pr-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="text" placeholder="Buscar producto..." bind:value={busq} onfocus={() => focusBusq = true} />
      </div>
      {#if focusBusq}
        <div class="border border-border rounded-[var(--radius-md)] bg-card max-h-64 overflow-y-auto mb-2 shadow-[var(--color-shadow)]">
          <div class="flex justify-between items-center px-3 py-2 text-xs font-extrabold text-muted border-b border-border sticky top-0 bg-card">
            <span>{resultados.length} resultado(s)</span>
            <button class="bg-transparent border-none text-danger font-extrabold text-lg cursor-pointer leading-none" onclick={() => { focusBusq = false; busq = ''; }}>×</button>
          </div>
          {#if resultados.length === 0}
            <div class="text-center text-muted py-4 text-sm">Sin coincidencias</div>
          {:else}
            {#each resultados as p}
              <button class="w-full flex justify-between items-center px-3.5 py-2.5 text-left border-b border-border last:border-0 text-sm cursor-pointer hover:bg-background active:bg-background" onclick={() => seleccionar(p)}>
                <span>{p.nombre}</span>
                <span class="text-muted text-xs">Stock {fmtCant(stockProducto(lotes, p.id))} {p.unidad || ''}</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    {:else}
      <div class="flex justify-between items-center py-1 mb-2 text-sm border-b-0">
        <span class="text-muted">Producto</span>
        <b>{form.nombre}</b>
      </div>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="number" inputmode="decimal" step="0.001" placeholder="Cantidad" bind:value={form.cantidad} />
        <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="number" inputmode="decimal" step="0.01" placeholder="Costo unit." bind:value={form.costo} />
      </div>
      {#if n(form.cantidad) > 0 && n(form.costo) >= 0}
        <div class="text-danger font-extrabold text-sm my-1">Total: {fmt(n(form.cantidad) * n(form.costo))}</div>
      {/if}
      <button class="w-full py-3 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm mb-2 active:scale-[0.97] transition-transform" onclick={guardarCompra}>
        <Icono nombre="bag" size={16} color="#fff" />
        {form.editId ? 'Actualizar' : 'Registrar'} Compra
      </button>
      <button class="w-full py-3 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={resetForm}>Cancelar</button>
    {/if}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="history" size={18} />
      Historial de Compras
    </div>
    {#if comprasPaginadas.length === 0}
      <div class="text-center text-muted py-6 text-sm">Sin compras</div>
    {:else}
      {#each comprasPaginadas as c}
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border">
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm"><Icono nombre="bag" size={14} /> {c.productoNombre}</div>
            <div class="text-xs text-muted">{fmtFH(c.fecha)} · {fmtCant(c.cantidad)} {c.unidad || ''} × {fmt(c.costo)}</div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <b class="text-danger">{fmt(c.total)}</b>
            {#if loteSinVentas(c.id)}
              <button class="w-8 h-8 rounded-lg bg-background flex items-center justify-center border-none cursor-pointer" aria-label="Editar compra" onclick={() => editar(c)}><Icono nombre="edit" size={15} /></button>
              <button class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center border-none cursor-pointer" aria-label="Eliminar compra" onclick={() => eliminar(c)}><Icono nombre="trash" size={15} color="#dc2626" /></button>
            {:else}
              <span title="Con ventas: no editable"><Icono nombre="lock" size={15} /></span>
            {/if}
          </div>
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
