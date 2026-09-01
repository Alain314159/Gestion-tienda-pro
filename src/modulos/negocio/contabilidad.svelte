<script module>
  export const manifiesto = {
    id: 'contabilidad',
    nombre: 'Contabilidad',
    icono: 'book',
    grupo: 'utilidades',
    orden: 11,
    tablas: {}
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { getDB, listar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { n, m, fmt, nowLocal } from '../../core/util.js';
  import { libroDiario, estadoPyG, balanceGeneral } from '../../core/contabilidad.js';
  import Icono from '../../core/Icono.svelte';

  let cfg = $state({});
  let ventas = $state([]);
  let compras = $state([]);
  let retiros = $state([]);
  let capital = $state([]);
  let ajustes = $state([]);
  let lotes = $state([]);
  let cierres = $state([]);
  let gastosOp = $state([]);

  let fechaInicio = $state(nowLocal().local.slice(0, 8) + '01');
  let fechaFin = $state(nowLocal().local);
  let tab = $state('diario');

  let diario = $derived(libroDiario({ ventas, compras, retiros, capital, gastosOp, ajustes }, fechaInicio, fechaFin));
  let pyg = $derived(estadoPyG({ ventas, compras, ajustes, gastosOp }, fechaInicio, fechaFin));
  let balance = $derived(balanceGeneral({ cfg, capital, retiros, ventas, compras, lotes, cierres }));

  async function recargar() {
    const db = getDB();
    [ventas, compras, retiros, capital, ajustes, lotes, cierres, gastosOp] = await Promise.all([
      listar('ventas'), listar('compras'), listar('retiros'), listar('capital'),
      listar('ajustes'), listar('lotes'), listar('cierres'), listar('gastosOp')
    ]);
    const c = await db.config.get('cfg');
    cfg = c?.value || {};
  }
  onMount(() => { recargar(); const off = bus.on('recargar', recargar); return () => off(); });
</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex gap-2 mb-4">
      <button class="flex-1 py-2 rounded-lg text-sm font-bold {tab === 'diario' ? 'bg-primary text-white' : 'bg-background text-muted'}" onclick={() => tab = 'diario'}>Diario</button>
      <button class="flex-1 py-2 rounded-lg text-sm font-bold {tab === 'pyg' ? 'bg-primary text-white' : 'bg-background text-muted'}" onclick={() => tab = 'pyg'}>P&G</button>
      <button class="flex-1 py-2 rounded-lg text-sm font-bold {tab === 'balance' ? 'bg-primary text-white' : 'bg-background text-muted'}" onclick={() => tab = 'balance'}>Balance</button>
    </div>

    {#if tab !== 'balance'}
      <div class="grid grid-cols-2 gap-2 mb-4">
        <input type="date" class="px-3 py-2 border border-border rounded-lg bg-card text-sm" bind:value={fechaInicio} />
        <input type="date" class="px-3 py-2 border border-border rounded-lg bg-card text-sm" bind:value={fechaFin} />
      </div>
    {/if}

    {#if tab === 'diario'}
      {#if diario.length === 0}
        <div class="text-center text-muted py-8">Sin movimientos</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="text-left text-muted border-b border-border"><th>Fecha</th><th>Cuenta</th><th class="text-right">Debe</th><th class="text-right">Haber</th></tr></thead>
            <tbody>
              {#each diario as m}
                <tr class="border-b border-border/50">
                  <td class="py-2 text-xs">{new Date(m.fecha).toLocaleDateString()}</td>
                  <td class="py-2">{m.cuenta}</td>
                  <td class="py-2 text-right text-danger">{m.debe > 0 ? fmt(m.debe) : ''}</td>
                  <td class="py-2 text-right text-success">{m.haber > 0 ? fmt(m.haber) : ''}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

    {:else if tab === 'pyg'}
      <div class="space-y-3">
        <div class="flex justify-between py-2 border-b border-border"><span>Ingresos</span><span class="text-success font-bold">{fmt(pyg.ingresos)}</span></div>
        <div class="flex justify-between py-2 border-b border-border"><span>Costo de bienes</span><span class="text-danger">-{fmt(pyg.cogs)}</span></div>
        <div class="flex justify-between py-2 border-b border-border font-bold"><span>Ganancia bruta</span><span class="text-primary">{fmt(pyg.gananciaBruta)}</span></div>
        <div class="flex justify-between py-2 border-b border-border"><span>Mermas</span><span class="text-danger">-{fmt(pyg.mermas)}</span></div>
        <div class="flex justify-between py-2 border-b border-border"><span>Gastos operativos</span><span class="text-danger">-{fmt(pyg.gastosOperativos)}</span></div>
        <div class="flex justify-between py-3 bg-success/10 rounded-lg px-3 font-extrabold text-success">
          <span>GANANCIA NETA</span><span>{fmt(pyg.gananciaNeta)}</span>
        </div>
      </div>

    {:else}
      <div class="space-y-4">
        <div>
          <h3 class="font-bold text-primary mb-2">Activos</h3>
          <div class="flex justify-between py-1 text-sm"><span>Caja / Bancos</span><span>{fmt(balance.activos.caja)}</span></div>
          <div class="flex justify-between py-1 text-sm"><span>Inventario</span><span>{fmt(balance.activos.inventario)}</span></div>
          <div class="flex justify-between py-2 border-t border-border font-bold"><span>Total activos</span><span class="text-primary">{fmt(balance.activos.total)}</span></div>
        </div>
        <div>
          <h3 class="font-bold text-purple mb-2">Patrimonio</h3>
          <div class="flex justify-between py-1 text-sm"><span>Capital social</span><span>{fmt(balance.patrimonio.capital)}</span></div>
          <div class="flex justify-between py-1 text-sm"><span>Ganancias retenidas</span><span>{fmt(balance.patrimonio.gananciasRetenidas)}</span></div>
          <div class="flex justify-between py-2 border-t border-border font-bold"><span>Total patrimonio</span><span class="text-purple">{fmt(balance.patrimonio.total)}</span></div>
        </div>
      </div>
    {/if}
  </div>
</div>
