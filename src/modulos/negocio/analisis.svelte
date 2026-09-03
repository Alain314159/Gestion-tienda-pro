<script module>
  export const manifiesto = {
    id: 'analisis',
    nombre: 'Analisis',
    icono: 'layers',
    grupo: 'utilidades',
    orden: 10,
    tablas: {}
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { listar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { n, fmt } from '../../core/util.js';
  import { analisisABC, detectarAnomalias } from '../../core/analisis.js';
  import Icono from '../../core/Icono.svelte';

  let productos = $state([]);
  let ventas = $state([]);
  let lotes = $state([]);
  let compras = $state([]);
  let ajustes = $state([]);

  let abc = $derived(analisisABC(productos, ventas, lotes));
  let anomalias = $derived(detectarAnomalias(ventas, compras, ajustes));

  async function recargar() {
    [productos, ventas, lotes, compras, ajustes] = await Promise.all([
      listar('productos'), listar('ventas'), listar('lotes'), listar('compras'), listar('ajustes')
    ]);
  }
  onMount(() => { recargar(); const off = bus.on('recargar', recargar); return () => off(); });
</script>

<div class="modulo">
  {#if anomalias.length > 0}
    <div class="bg-danger/10 border-l-4 border-danger rounded-[var(--radius-lg)] p-4 mb-4">
      <div class="flex items-center gap-2 text-danger font-bold mb-2">
        <Icono nombre="alert" size={18} />
        {anomalias.length} anomalia(s) detectada(s)
      </div>
      {#each anomalias as a}
        <div class="text-sm py-1 {a.gravedad === 'alta' ? 'text-danger font-bold' : 'text-warning'}">
          · {a.msg}
        </div>
      {/each}
    </div>
  {/if}

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="layers" size={18} />
      Analisis ABC (ultimos 3 meses)
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-muted border-b border-border">
            <th class="pb-2">Producto</th>
            <th class="pb-2 text-right">Vol</th>
            <th class="pb-2 text-right">Ganancia</th>
            <th class="pb-2 text-center">Cat</th>
          </tr>
        </thead>
        <tbody>
          {#each abc.slice(0, 20) as p}
            <tr class="border-b border-border/50">
              <td class="py-2 font-medium">{p.nombre}</td>
              <td class="py-2 text-right">{p.volumen}</td>
              <td class="py-2 text-right text-success">{fmt(p.ganancia)}</td>
              <td class="py-2 text-center">
                <span class="inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-bold text-white
                  {p.catGanancia === 'A' ? 'bg-success' : p.catGanancia === 'B' ? 'bg-warning' : 'bg-muted'}">
                  {p.catGanancia}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
