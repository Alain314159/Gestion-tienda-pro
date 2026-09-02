<script module>
  export const manifiesto = {
    id: 'inventario',
    nombre: 'Inventario',
    icono: 'package',
    grupo: 'negocio',
    orden: 4,
    tablas: { ajustes: '++id, fecha, productoId' },
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { listar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar } from '../../core/state.svelte.js';
  import { n, m, fmt, fmtCant, fmtFH, stockProducto, valorInventario, inventarioGrupos } from '../../core/util.js';
  import { InventarioService } from '../../services/InventarioService.js';
  import { obtenerPeriodosCerrados } from '../../core/periodos.js';
  import Icono from '../../core/Icono.svelte';

  let productos = $state([]);
  let lotes = $state([]);
  let ajustes = $state([]);
  const expandido = $state({});
  let procesando = $state(false);
  let periodosCerrados = $state([]);

  let form = $state({ productoId: '', cantidad: '', motivo: '', costoSobrante: '' });
  let busqProd = $state('');
  let focusBusqProd = $state(false);
  let busqProdDebounced = $state('');
  $effect(() => {
    const t = setTimeout(() => (busqProdDebounced = busqProd), 200);
    return () => clearTimeout(t);
  });

  const prodsActivos = $derived(productos.filter((p) => !p.archivado));
  const prodsFiltrados = $derived(
    (() => {
      const q = busqProdDebounced.toLowerCase().trim();
      if (!q) return prodsActivos.slice(0, 8);
      return prodsActivos.filter((p) => p.nombre.toLowerCase().includes(q)).slice(0, 8);
    })()
  );
  const valInv = $derived(valorInventario(lotes));
  const unidadesTotal = $derived(
    lotes
      .filter((l) => n(l.cantidadInicial) - n(l.cantidadVendida) > 0)
      .reduce((s, l) => s + (n(l.cantidadInicial) - n(l.cantidadVendida)), 0)
  );
  const lotesActivos = $derived(lotes.filter((l) => n(l.cantidadInicial) - n(l.cantidadVendida) > 0).length);
  const grupos = $derived(inventarioGrupos(productos, lotes));
  const ajustesRecientes = $derived(
    ajustes
      .slice()
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 20)
  );

  async function recargar() {
    [productos, lotes, ajustes] = await Promise.all([listar('productos'), listar('lotes'), listar('ajustes')]);
    periodosCerrados = await obtenerPeriodosCerrados();
  }

  function esCerrado(fechaIso) {
    const f = new Date(fechaIso);
    return periodosCerrados.some((p) => new Date(p.inicio) <= f && f <= new Date(p.fin));
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  async function registrarAjuste() {
    if (procesando) return;
    const cant = n(form.cantidad);
    if (!form.productoId) return avisar('Selecciona producto', 'bad');
    if (cant === 0) return avisar('Cantidad no puede ser 0', 'bad');
    if (!form.motivo) return avisar('Selecciona motivo', 'bad');
    const prod = productos.find((p) => p.id === form.productoId);
    if (cant < 0 && Math.abs(cant) > stockProducto(lotes, form.productoId))
      return avisar('Solo hay ' + stockProducto(lotes, form.productoId), 'bad');

    procesando = true;
    try {
      if (cant < 0) {
        const { costoPerdida } = await InventarioService.ajustarNegativo({
          productoId: form.productoId,
          productoNombre: prod.nombre,
          cantidad: Math.abs(cant),
          motivo: form.motivo,
          lotes,
        });
        await recargar();
        bus.emit('recargar');
        avisar('Merma registrada · perdida ' + fmt(costoPerdida));
      } else {
        const cs = n(form.costoSobrante);
        if (cs < 0) return avisar('Costo invalido', 'bad');
        await InventarioService.ajustarPositivo({
          productoId: form.productoId,
          productoNombre: prod.nombre,
          productoUnidad: prod.unidad,
          cantidad: cant,
          motivo: form.motivo,
          costo: cs,
        });
        await recargar();
        bus.emit('recargar');
        avisar('Sobrante registrado');
      }
      form = { productoId: '', cantidad: '', motivo: '', costoSobrante: '' };
    } catch (e) {
      avisar(e.message, 'bad');
    } finally {
      procesando = false;
    }
  }
</script>

<div class="modulo">
  <div
    class="bg-gradient-to-br from-success to-[#15803d] text-white rounded-[var(--radius-lg)] p-5 text-center mb-3 shadow-[var(--color-shadow)]"
  >
    <div class="flex items-center justify-center gap-1.5 text-xs opacity-90 mb-1">
      <Icono nombre="package" size={14} color="#fff" />
      Valor del Inventario
    </div>
    <div class="text-3xl font-extrabold my-0.5">{fmt(valInv)}</div>
    <div class="text-xs opacity-85">{fmtCant(unidadesTotal, true)} unidades · {lotesActivos} lotes</div>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-warning mb-3">
      <Icono nombre="alert" size={18} />
      Merma / Ajuste
    </div>
    <!-- Buscador tipoahead de producto -->
    <div class="relative mb-2">
      <input
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]"
        type="text"
        placeholder="Buscar producto..."
        bind:value={busqProd}
        onfocus={() => (focusBusqProd = true)}
        onblur={() => setTimeout(() => (focusBusqProd = false), 200)}
      />
      {#if focusBusqProd && prodsFiltrados.length > 0}
        <div
          class="absolute left-0 right-0 top-full mt-1 border border-border rounded-[var(--radius-md)] bg-card max-h-48 overflow-y-auto shadow-[var(--color-shadow)] z-20"
        >
          {#each prodsFiltrados as p}
            <button
              class="w-full text-left px-3.5 py-2.5 text-sm border-b border-border/50 last:border-none hover:bg-background transition-colors flex items-center justify-between gap-2"
              onclick={() => {
                form.productoId = p.id;
                busqProd = p.nombre;
                focusBusqProd = false;
              }}
            >
              <span class="font-medium truncate">{p.nombre}</span>
              <span class="text-xs text-muted flex-shrink-0"
                >Stock: {fmtCant(stockProducto(lotes, p.id))} {p.unidad || ''}</span
              >
            </button>
          {/each}
        </div>
      {/if}
      {#if form.productoId}
        {@const sel = productos.find((p) => p.id === form.productoId)}
        {#if sel}
          <div class="text-xs text-muted mt-1 px-1">
            Seleccionado: <b class="text-primary">{sel.nombre}</b> (Stock: {fmtCant(stockProducto(lotes, sel.id))}
            {sel.unidad || ''})
          </div>
        {/if}
      {/if}
    </div>
    <div class="grid grid-cols-2 gap-2 mb-2">
      <input
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]"
        type="number"
        inputmode="decimal"
        step="0.001"
        placeholder="- merma / + sobrante"
        bind:value={form.cantidad}
      />
      <select
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]"
        bind:value={form.motivo}
      >
        <option value="">Motivo...</option>
        <option value="merma">Merma / Daño</option>
        <option value="vencimiento">Vencimiento</option>
        <option value="robo">Robo / Perdida</option>
        <option value="error">Error de registro</option>
        <option value="sobrante">Sobrante en conteo</option>
      </select>
    </div>
    {#if n(form.cantidad) > 0}
      <input
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2"
        type="number"
        inputmode="decimal"
        step="0.01"
        placeholder="Costo unit. del sobrante"
        bind:value={form.costoSobrante}
      />
    {/if}
    <button
      class="w-full py-3 rounded-[var(--radius-md)] bg-warning text-white font-extrabold text-sm active:scale-[0.97] transition-transform"
      onclick={registrarAjuste}
    >
      <Icono nombre="package" size={16} color="#fff" />
      Registrar Ajuste
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-3 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3 px-1 pt-1">
      <Icono nombre="package" size={18} />
      Inventario por producto
    </div>
    {#if grupos.length === 0}
      <div class="text-center text-muted py-6 text-sm">Sin inventario</div>
    {:else}
      {#each grupos as g}
        <div class="bg-card rounded-[var(--radius-lg)] shadow-[var(--color-shadow)] mb-2 overflow-hidden">
          <button
            class="w-full flex justify-between items-center px-4 py-3 cursor-pointer gap-2 bg-transparent border-none text-left"
            onclick={() => (expandido[g.productoId] = !expandido[g.productoId])}
            onkeydown={(e) => e.key === 'Enter' && (expandido[g.productoId] = !expandido[g.productoId])}
          >
            <div class="min-w-0 flex-1">
              <div class="font-extrabold text-primary text-sm">{g.nombre}</div>
              <div class="text-xs text-muted">Stock {fmtCant(g.stockTotal)} {g.unidad || ''}</div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <b class="text-success">{fmt(g.valorTotal)}</b>
              <Icono nombre="chevron" size={16} class={expandido[g.productoId] ? 'rotate-180' : ''} />
            </div>
          </button>
          {#if expandido[g.productoId]}
            <div class="bg-background px-3 py-2">
              {#each g.lotes as l}
                <div class="flex justify-between text-xs py-1 px-2 bg-card rounded mb-1">
                  <span
                    >{fmtFH(l.fecha)} · {fmtCant(n(l.cantidadInicial) - n(l.cantidadVendida))}/{fmtCant(
                      l.cantidadInicial
                    )}
                    {g.unidad || ''}</span
                  >
                  <span>@{fmt(l.costo)} = <b>{fmt((n(l.cantidadInicial) - n(l.cantidadVendida)) * n(l.costo))}</b></span
                  >
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="history" size={18} />
      Ultimos ajustes
    </div>
    {#if ajustesRecientes.length === 0}
      <div class="text-center text-muted py-6 text-sm">Sin ajustes</div>
    {:else}
      {#each ajustesRecientes as a}
        <div
          class="flex justify-between items-center gap-2 py-2.5 border-b border-border {esCerrado(a.fecha)
            ? 'opacity-60'
            : ''}"
        >
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm">{a.productoNombre}</div>
            <div class="text-xs text-muted">{fmtFH(a.fecha)} · {a.motivo}</div>
          </div>
          <div class="text-right flex-shrink-0">
            {#if esCerrado(a.fecha)}
              <span
                class="inline-block px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold text-white bg-warning"
                title="Periodo cerrado">🔒 CERRADO</span
              >
            {:else}
              <div class="font-extrabold {a.cantidad < 0 ? 'text-danger' : 'text-success'}">
                {a.cantidad > 0 ? '+' : ''}{fmtCant(a.cantidad)}
              </div>
              {#if a.costoPerdida}<div class="text-xs text-danger">-{fmt(a.costoPerdida)}</div>{/if}
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
