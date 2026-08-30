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
  import { getDB, listar, guardar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, confirmar } from '../../core/state.svelte.js';
  import { n, m, fmt, fmtCant, fmtFH, genId, stockProducto } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  let productos = $state([]);
  let lotes = $state([]);
  let compras = $state([]);
  let busq = $state('');
  let focusBusq = $state(false);

  let form = $state({ editId: '', productoId: '', nombre: '', cantidad: '', costo: '', unidad: '' });

  let prodsActivos = $derived(productos.filter(p => !p.archivado));
  let resultados = $derived(() => {
    const qry = busq.toLowerCase().trim();
    const base = qry ? prodsActivos.filter(p => p.nombre.toLowerCase().includes(qry) || (p.codigo || '').toLowerCase().includes(qry)) : prodsActivos;
    return base.slice(0, 12);
  });
  let comprasOrdenadas = $derived(compras.filter(c => !c.anulada).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 100));

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
    const db = getDB();
    const l = lotes.find(x => x.compraId === c.id);
    await db.transaction('rw', db.compras, db.lotes, async () => {
      await db.compras.delete(c.id);
      if (l) await db.lotes.delete(l.id);
    });
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

    const ejecutar = async () => {
      try {
        if (form.editId) {
          const l = lotes.find(x => x.compraId === form.editId);
          if (l && n(l.cantidadVendida) > 0) return avisar('Lote con ventas: no editable', 'bad');
          const c = compras.find(x => x.id === form.editId);
          const db = getDB();
          await db.transaction('rw', db.compras, db.lotes, async () => {
            await guardar('compras', { ...c, productoId: form.productoId, productoNombre: form.nombre, productoUnidad: form.unidad, cantidad: cant, costo, total, unidad: form.unidad });
            if (l) await guardar('lotes', { ...l, productoId: form.productoId, productoNombre: form.nombre, productoUnidad: form.unidad, cantidadInicial: cant, costo });
          });
        } else {
          const compra = { id: genId('c'), fecha: new Date().toISOString(), productoId: form.productoId, productoNombre: form.nombre, productoUnidad: form.unidad, cantidad: cant, costo, total, anulada: false, unidad: form.unidad };
          const lote = { id: genId('l'), compraId: compra.id, productoId: form.productoId, productoNombre: form.nombre, productoUnidad: form.unidad, cantidadInicial: cant, cantidadVendida: 0, costo, fecha: compra.fecha };
          const db = getDB();
          await db.transaction('rw', db.compras, db.lotes, async () => {
            await guardar('compras', compra);
            await guardar('lotes', lote);
          });
        }
        await recargar();
        resetForm();
        avisar('Compra ' + fmt(total));
        bus.emit('recargar');
      } catch (e) { avisar(e.message, 'bad'); }
    };

    ejecutar();
  }
</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="bag" size={18} />
      Registrar Compra
    </div>
    {#if !form.productoId}
      <div class="relative mb-3">
        <Icono nombre="search" size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input class="w-full pl-10 pr-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="text" placeholder="Buscar producto..." bind:value={busq} onfocus={() => focusBusq = true} />
      </div>
      {#if focusBusq}
        <div class="border border-border rounded-[var(--radius-md)] bg-card max-h-64 overflow-y-auto mb-3 shadow-[var(--color-shadow)]">
          <div class="flex justify-between items-center px-3 py-2.5 text-xs font-extrabold text-muted border-b border-border sticky top-0 bg-card">
            <span>{resultados().length} resultado(s)</span>
            <button class="bg-transparent border-none text-danger font-extrabold text-lg cursor-pointer leading-none" onclick={() => { focusBusq = false; busq = ''; }}>×</button>
          </div>
          {#if resultados().length === 0}
            <div class="text-center text-muted py-5 text-sm">Sin coincidencias</div>
          {:else}
            {#each resultados() as p}
              <button class="w-full flex justify-between items-center px-3.5 py-3 text-left border-b border-border last:border-0 text-sm cursor-pointer hover:bg-background active:bg-background" onclick={() => seleccionar(p)}>
                <span>{p.nombre}</span>
                <span class="text-muted text-xs">Stock {fmtCant(stockProducto(lotes, p.id))} {p.unidad || ''}</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    {:else}
      <div class="flex justify-between items-center py-1 mb-3 text-sm border-b-0">
        <span class="text-muted">Producto</span>
        <b>{form.nombre}</b>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <input class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="number" inputmode="decimal" step="0.001" placeholder="Cantidad" bind:value={form.cantidad} />
        <input class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="number" inputmode="decimal" step="0.01" placeholder="Costo unit." bind:value={form.costo} />
      </div>
      {#if n(form.cantidad) > 0 && n(form.costo) >= 0}
        <div class="text-danger font-extrabold text-sm my-2">Total: {fmt(n(form.cantidad) * n(form.costo))}</div>
      {/if}
      <button class="w-full py-3.5 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm mb-3 active:scale-[0.97] transition-transform" onclick={guardarCompra}>
        <Icono nombre="bag" size={16} color="#fff" />
        {form.editId ? 'Actualizar' : 'Registrar'} Compra
      </button>
      <button class="w-full py-3.5 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={resetForm}>Cancelar</button>
    {/if}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="history" size={18} />
      Historial de Compras
    </div>
    {#if comprasOrdenadas.length === 0}
      <div class="text-center text-muted py-8 text-sm">Sin compras</div>
    {:else}
      {#each comprasOrdenadas as c}
        <div class="flex justify-between items-center gap-2 py-3 border-b border-border">
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm"><Icono nombre="bag" size={14} /> {c.productoNombre}</div>
            <div class="text-xs text-muted">{fmtFH(c.fecha)} · {fmtCant(c.cantidad)} {c.unidad || ''} × {fmt(c.costo)}</div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <b class="text-danger">{fmt(c.total)}</b>
            {#if loteSinVentas(c.id)}
              <button class="w-8 h-8 rounded-lg bg-background flex items-center justify-center border-none cursor-pointer" onclick={() => editar(c)}><Icono nombre="edit" size={15} /></button>
              <button class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center border-none cursor-pointer" onclick={() => eliminar(c)}><Icono nombre="trash" size={15} color="#dc2626" /></button>
            {:else}
              <span title="Con ventas: no editable"><Icono nombre="lock" size={15} /></span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
