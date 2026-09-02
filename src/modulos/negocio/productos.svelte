<script module>
  export const manifiesto = {
    id: 'productos',
    nombre: 'Productos',
    icono: 'tag',
    grupo: 'negocio',
    orden: 3,
    tablas: { productos: '++id, nombre, codigo, archivado' },
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { getDB, listar, guardar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, confirmar } from '../../core/state.svelte.js';
  import {
    n,
    m,
    fmt,
    fmtCant,
    fmtFH,
    genId,
    stockProducto,
    lotesDeProducto,
    valorLotesProducto,
    badgeStock,
  } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  let productos = $state([]);
  let lotes = $state([]);
  let busq = $state('');
  let busqDebounced = $state('');
  $effect(() => {
    const t = setTimeout(() => (busqDebounced = busq), 200);
    return () => clearTimeout(t);
  });
  let mostrarArchivados = $state(false);
  const expandido = $state({});
  let pagina = $state(1);
  const itemsPorPagina = 20;

  let form = $state({ editId: '', nombre: '', codigo: '', precio: '', stockMin: '5', unidad: '' });

  const filtrados = $derived(
    (() => {
      const p = mostrarArchivados ? productos : productos.filter((x) => !x.archivado);
      const q = busqDebounced.toLowerCase().trim();
      if (!q) return p;
      return p.filter((x) => x.nombre.toLowerCase().includes(q) || (x.codigo || '').toLowerCase().includes(q));
    })()
  );
  const totalPaginas = $derived(Math.max(1, Math.ceil(filtrados.length / itemsPorPagina)));
  const filtradosPaginados = $derived(filtrados.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina));

  async function recargar() {
    [productos, lotes] = await Promise.all([listar('productos'), listar('lotes')]);
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  async function guardarProducto() {
    const nombre = (form.nombre || '').trim();
    const precio = n(form.precio);
    const min = n(form.stockMin);
    const unidad = (form.unidad || '').trim();
    if (!nombre) return avisar('Nombre obligatorio', 'bad');
    if (precio <= 0) return avisar('Precio debe ser > 0', 'bad');
    const dup = productos.find(
      (x) => x.nombre.toLowerCase() === nombre.toLowerCase() && x.id !== form.editId && !x.archivado
    );
    if (dup) return avisar('Ya existe ese nombre', 'bad');

    if (form.editId) {
      const o = productos.find((x) => x.id === form.editId);
      await guardar('productos', {
        ...o,
        nombre,
        codigo: (form.codigo || '').trim(),
        precio,
        stockMinimo: min,
        unidad,
      });
      avisar('Producto actualizado');
    } else {
      await guardar('productos', {
        id: genId('p'),
        nombre,
        codigo: (form.codigo || '').trim(),
        precio,
        stockMinimo: min,
        archivado: false,
        unidad,
      });
      avisar('Producto agregado');
    }
    resetForm();
    await recargar();
    bus.emit('recargar');
  }

  function editar(p) {
    form = {
      editId: p.id,
      nombre: p.nombre,
      codigo: p.codigo || '',
      precio: String(p.precio),
      stockMin: String(p.stockMinimo || 5),
      unidad: p.unidad || '',
    };
    window.scrollTo(0, 0);
  }

  function resetForm() {
    form = { editId: '', nombre: '', codigo: '', precio: '', stockMin: '5', unidad: '' };
  }

  async function archivar(p) {
    if (stockProducto(lotes, p.id) > 0) return avisar('No archivar con stock > 0', 'bad');
    const ok = await confirmar('Archivar producto', '¿Archivar "' + p.nombre + '"?');
    if (!ok) return;
    await guardar('productos', { ...p, archivado: true });
    await recargar();
    bus.emit('recargar');
    avisar('Archivado');
  }

  async function restaurar(p) {
    await guardar('productos', { ...p, archivado: false });
    await recargar();
    bus.emit('recargar');
    avisar('Restaurado');
  }
</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="tag" size={18} />
      {form.editId ? 'Editar' : 'Agregar'} Producto
    </div>
    <input
      class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3"
      type="text"
      placeholder="Nombre del producto"
      bind:value={form.nombre}
    />
    <input
      class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3"
      type="text"
      placeholder="Codigo (opcional)"
      bind:value={form.codigo}
    />
    <div class="grid grid-cols-2 gap-3 mb-3">
      <input
        class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]"
        type="number"
        inputmode="decimal"
        step="0.01"
        placeholder="Precio venta"
        bind:value={form.precio}
      />
      <input
        class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]"
        type="number"
        inputmode="decimal"
        step="0.1"
        placeholder="Stock min."
        bind:value={form.stockMin}
      />
    </div>
    <p class="text-xs text-primary mb-3 bg-primary/10 rounded-lg p-3 leading-relaxed">
      Define la unidad si vendes por peso/volumen (ej: kg, lb, gr, litro). Si es unidad suelta, pon "u" o dejalo vacio.
    </p>
    <input
      class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-4"
      type="text"
      placeholder="Unidad (kg, lb, gr, u, paq)"
      bind:value={form.unidad}
      list="unidades-list"
    />
    <datalist id="unidades-list">
      <option value="u"></option>
      <option value="kg"></option>
      <option value="lb"></option>
      <option value="gr"></option>
      <option value="litro"></option>
      <option value="m"></option>
      <option value="caja"></option>
      <option value="paq"></option>
    </datalist>
    <button
      class="w-full py-3.5 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm mb-3 active:scale-[0.97] transition-transform"
      onclick={guardarProducto}
    >
      <Icono nombre="check" size={16} color="#fff" />
      {form.editId ? 'Actualizar' : 'Guardar'}
    </button>
    {#if form.editId}
      <button
        class="w-full py-3.5 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm active:scale-[0.97] transition-transform"
        onclick={resetForm}>Cancelar</button
      >
    {/if}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="tag" size={18} />
      Productos
    </div>
    <input
      class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3"
      type="text"
      placeholder="Buscar..."
      bind:value={busq}
    />
    <div class="text-right mb-3">
      <button
        class="inline-block px-3 py-1.5 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-bold text-xs"
        onclick={() => (mostrarArchivados = !mostrarArchivados)}
      >
        {mostrarArchivados ? 'Ocultar archivados' : 'Ver archivados'}
      </button>
    </div>
    {#if filtrados.length === 0}
      <div class="text-center text-muted py-6 text-sm">Sin productos</div>
    {:else}
      <div class="text-xs text-muted mb-2 px-1">{filtrados.length} producto(s) · Pagina {pagina} de {totalPaginas}</div>
      {#each filtradosPaginados as p}
        {@const badge = badgeStock(p, lotes)}
        {@const s = stockProducto(lotes, p.id)}
        {@const lotesP = lotesDeProducto(lotes, p.id)}
        <div class="mb-1">
          <div
            class="flex justify-between items-center gap-2 py-2.5 border-b border-border"
            style={p.archivado ? 'opacity:0.5' : ''}
          >
            <button
              class="flex-1 min-w-0 bg-transparent border-none text-left cursor-pointer"
              onclick={() => (expandido[p.id] = !expandido[p.id])}
              onkeydown={(e) => e.key === 'Enter' && (expandido[p.id] = !expandido[p.id])}
            >
              <div class="font-bold text-sm truncate">
                {p.nombre}
                {#if p.codigo}<span class="text-muted font-normal text-xs">({p.codigo})</span>{/if}
              </div>
              <div class="flex items-center gap-2 flex-wrap mt-1">
                <span
                  class="inline-block px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold text-white {badge.clase ===
                  'ok'
                    ? 'bg-success'
                    : badge.clase === 'low'
                      ? 'bg-warning'
                      : badge.clase === 'out'
                        ? 'bg-danger'
                        : 'bg-muted'}">{badge.texto}</span
                >
                <span class="text-primary font-extrabold text-sm">Stock: {fmtCant(s)} {p.unidad || ''}</span>
                <span class="text-muted text-xs">{fmt(p.precio)}</span>
                {#if lotesP.length > 0}
                  <span class="transition-transform {expandido[p.id] ? 'rotate-180' : ''}"
                    ><Icono nombre="chevron" size={14} /></span
                  >
                {/if}
              </div>
            </button>
            <div class="flex gap-1 flex-shrink-0">
              <button
                class="w-8 h-8 rounded-lg bg-background flex items-center justify-center border-none cursor-pointer"
                onclick={() => editar(p)}><Icono nombre="edit" size={15} /></button
              >
              {#if !p.archivado}
                <button
                  class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center border-none cursor-pointer"
                  onclick={() => archivar(p)}><Icono nombre="trash" size={15} color="#dc2626" /></button
                >
              {:else}
                <button
                  class="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center border-none cursor-pointer"
                  onclick={() => restaurar(p)}><Icono nombre="refresh" size={15} color="#16a34a" /></button
                >
              {/if}
            </div>
          </div>
          {#if expandido[p.id]}
            <div class="bg-background rounded-b-lg px-3 py-2">
              {#if lotesP.length === 0}
                <div class="text-center text-muted text-xs py-2">Sin lotes activos (stock 0)</div>
              {:else}
                {#each lotesP as l}
                  <div class="flex justify-between text-xs py-1 px-2 bg-card rounded mb-1">
                    <span
                      >{fmtFH(l.fecha)} · Quedan {fmtCant(n(l.cantidadInicial) - n(l.cantidadVendida))}/{fmtCant(
                        l.cantidadInicial
                      )}
                      {p.unidad || ''}</span
                    >
                    <span
                      >@{fmt(l.costo)} = <b>{fmt((n(l.cantidadInicial) - n(l.cantidadVendida)) * n(l.costo))}</b></span
                    >
                  </div>
                {/each}
                <div class="text-right text-xs text-muted mt-1">
                  Valor total: <b class="text-success">{fmt(valorLotesProducto(lotes, p.id))}</b>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
      {#if totalPaginas > 1}
        <div class="flex items-center justify-center gap-2 mt-4">
          <button
            class="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center disabled:opacity-30"
            onclick={() => (pagina = Math.max(1, pagina - 1))}
            disabled={pagina === 1}
            aria-label="Pagina anterior"><Icono nombre="chevron" size={16} class="rotate-90" /></button
          >
          <span class="text-xs text-muted font-bold px-2">{pagina} / {totalPaginas}</span>
          <button
            class="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center disabled:opacity-30"
            onclick={() => (pagina = Math.min(totalPaginas, pagina + 1))}
            disabled={pagina === totalPaginas}
            aria-label="Pagina siguiente"><Icono nombre="chevron" size={16} class="-rotate-90" /></button
          >
        </div>
      {/if}
    {/if}
  </div>
</div>
