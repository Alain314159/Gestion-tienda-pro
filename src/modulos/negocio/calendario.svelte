<script module>
  export const manifiesto = {
    id: 'calendario',
    nombre: 'Calendario',
    icono: 'calendar',
    grupo: 'negocio',
    orden: 8,
    tablas: {}
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { listar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { n, fmt } from '../../core/util.js';
  import { diasConVentas, ventasDelDia } from '../../core/calendario.js';
  import Icono from '../../core/Icono.svelte';

  let ventas = $state([]);
  let hoy = new Date();
  let anio = $state(hoy.getFullYear());
  let mes = $state(hoy.getMonth());
  let diaSel = $state(null);

  let nombresMes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  let diasSem = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  let mapa = $derived(diasConVentas(ventas, mes, anio));

  function calendario() {
    const primerDia = new Date(anio, mes, 1).getDay();
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const celdas = [];
    for (let i = 0; i < primerDia; i++) celdas.push(null);
    for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
    return celdas;
  }

  let ventasDiaSel = $derived(diaSel ? ventasDelDia(ventas, `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaSel).padStart(2, '0')}`) : []);

  async function recargar() { ventas = await listar('ventas'); }
  onMount(() => { recargar(); const off = bus.on('recargar', recargar); return () => off(); });
</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center justify-between mb-4">
      <button class="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center" onclick={() => { mes--; if (mes < 0) { mes = 11; anio--; } }}>
        <Icono nombre="chevron" size={18} class="rotate-90" />
      </button>
      <h2 class="font-extrabold text-lg">{nombresMes[mes]} {anio}</h2>
      <button class="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center" onclick={() => { mes++; if (mes > 11) { mes = 0; anio++; } }}>
        <Icono nombre="chevron" size={18} class="-rotate-90" />
      </button>
    </div>

    <div class="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted mb-2">
      {#each diasSem as d}<div>{d}</div>{/each}
    </div>
    <div class="grid grid-cols-7 gap-1">
      {#each calendario() as d}
        {#if d === null}
          <div class="aspect-square"></div>
        {:else}
          {@const info = mapa[d]}
          <button
            class="aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative
              {diaSel === d ? 'bg-primary text-white shadow-lg scale-105' : 'bg-background text-text hover:bg-border/50'}"
            onclick={() => diaSel = diaSel === d ? null : d}
          >
            <span>{d}</span>
            {#if info}
              <span class="text-[0.6rem] {diaSel === d ? 'text-white/80' : 'text-success'}">{fmt(info.ventas).slice(0, 6)}</span>
              <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-success"></span>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
  </div>

  {#if diaSel}
    <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] animate-fade-up">
      <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
        <Icono nombre="cart" size={18} />
        Ventas del {diaSel}/{mes + 1}/{anio}
      </div>
      {#if ventasDiaSel.length === 0}
        <div class="text-center text-muted py-4">Sin ventas</div>
      {:else}
        <div class="text-sm text-muted mb-2">{ventasDiaSel.length} ventas · Total {fmt(ventasDiaSel.reduce((s, v) => s + n(v.total), 0))}</div>
        {#each ventasDiaSel as v}
          <div class="flex justify-between py-2 border-b border-border text-sm">
            <span class="truncate flex-1">{v.items.map(i => i.nombre).join(', ')}</span>
            <span class="font-bold">{fmt(v.total)}</span>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
