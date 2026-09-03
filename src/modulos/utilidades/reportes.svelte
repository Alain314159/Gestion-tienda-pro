<script module>
  export const manifiesto = {
    id: 'reportes',
    nombre: 'Reportes',
    icono: 'chart',
    grupo: 'utilidades',
    orden: 7,
    tablas: { cierres: '++id, fechaCierre' }
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { getDB, listar, guardar, leerConfig } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, confirmar } from '../../core/state.svelte.js';
  import { n, m, fmt, fmtFecha, genId, generarReporte, valorInventario, clean, nowLocal } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  let cfg = $state({});
  let ventas = $state([]);
  let compras = $state([]);
  let ajustes = $state([]);
  let cierres = $state([]);
  let lotes = $state([]);

  let repInicio = $state('');
  let repFin = $state('');
  let rep = $state(null);

  let periodoInicio = $derived(cfg.periodoInicio || nowLocal().iso);
  let cierresOrdenados = $derived(cierres.slice().sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre)));

  async function recargar() {
    [ventas, compras, ajustes, cierres, lotes] = await Promise.all([
      listar('ventas'), listar('compras'), listar('ajustes'), listar('cierres'), listar('lotes')
    ]);
    cfg = await leerConfig('cfg') || { periodoInicio: nowLocal().iso };
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  function generar() {
    if (!repInicio || !repFin) return avisar('Selecciona fechas', 'bad');
    rep = generarReporte({ ventas, ajustes }, repInicio, repFin);
    if (rep.error) { avisar(rep.error, 'bad'); rep = null; }
  }

  function exportarCSV() {
    if (!rep || !rep._vp) return;
    let csv = 'Fecha,Productos,Total,Ganancia\n';
    rep._vp.forEach(v => {
      csv += `${v.fecha},${v.items.map(i => i.nombre + ' x' + i.cantidad).join(';')},${v.total},${v.ganancia}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'reporte_' + repInicio + '_' + repFin + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    avisar('CSV descargado');
  }

  async function cerrarPeriodo() {
    const ok = await confirmar('Cerrar periodo', 'Esto reinicia los contadores del dashboard. ¿Continuar?');
    if (!ok) return;
    const vta = ventas.filter(v => !v.anulada && new Date(v.fecha) >= new Date(periodoInicio));
    const ing = m(vta.reduce((s, v) => s + n(v.total), 0));
    const cogs = m(vta.reduce((s, v) => s + v.items.reduce((ss, it) => ss + n(it.costo), 0), 0));
    const bruta = m(ing - cogs);
    const mermas = m(ajustes.filter(a => a.cantidad < 0 && new Date(a.fecha) >= new Date(periodoInicio)).reduce((s, a) => s + n(a.costoPerdida), 0));
    const gastos = m((await listar('gastosOp')).filter(g => new Date(g.fecha) >= new Date(periodoInicio)).reduce((s, g) => s + n(g.monto), 0));
    const neta = m(bruta - mermas - gastos);
    const cierre = {
      id: genId('cr'), fechaCierre: nowLocal().iso, fechaLocal: nowLocal().local, fechaInicio: periodoInicio,
      periodo: 'Del ' + fmtFecha(periodoInicio) + ' al ' + fmtFecha(nowLocal().iso),
      ingresos: ing, cogs, bruta, mermas, gastos, neta, numVentas: vta.length, margenB: ing > 0 ? ((bruta / ing) * 100).toFixed(1) : '0.0', margenN: ing > 0 ? ((neta / ing) * 100).toFixed(1) : '0.0'
    };
    await guardar('cierres', cierre);
    cfg.periodoInicio = nowLocal().iso;
    await guardar('config', { key: 'cfg', value: clean(cfg) });
    await recargar();
    bus.emit('recargar');
    avisar('Periodo cerrado');
  }
</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="calendar" size={18} />
      Reporte por periodo
    </div>
    <div class="grid grid-cols-2 gap-2 mb-2">
      <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="date" bind:value={repInicio} />
      <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)]" type="date" bind:value={repFin} />
    </div>
    <button class="w-full py-3 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm mb-2 active:scale-[0.97] transition-transform" onclick={generar}>
      <Icono nombre="chart" size={16} color="#fff" />
      Generar Reporte
    </button>
    {#if rep}
      <div class="bg-background rounded-[var(--radius-md)] p-3 mt-2">
        <div class="flex justify-between gap-2 py-1.5 border-b border-border text-sm"><span>Ingresos</span><span class="text-success">{fmt(rep.ingresos)}</span></div>
        <div class="flex justify-between gap-2 py-1.5 border-b border-border text-sm"><span>Costo de bienes</span><span class="text-danger">-{fmt(rep.cogs)}</span></div>
        <div class="flex justify-between gap-2 py-1.5 border-b border-border text-sm font-bold"><span>Ganancia bruta</span><span class="text-primary">{fmt(rep.bruta)}</span></div>
        <div class="flex justify-between gap-2 py-1.5 border-b border-border text-sm"><span>Mermas</span><span class="text-danger">-{fmt(rep.mermas)}</span></div>
        <div class="flex justify-between gap-2 py-1.5 border-b border-border text-sm font-bold"><span>Ganancia neta</span><span class="text-success">{fmt(rep.neta)}</span></div>
        <div class="flex justify-between gap-2 py-1.5 border-b border-border text-sm"><span>Margen bruto</span><span>{rep.margenB}%</span></div>
        <div class="flex justify-between gap-2 py-1.5 text-sm font-bold"><span>Margen neto</span><span>{rep.margenN}%</span></div>
        <div class="flex justify-between gap-2 py-1.5 text-sm"><span>Ventas</span><span>{rep.numVentas}</span></div>
      </div>
      <button class="w-full py-2.5 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-extrabold text-sm mt-2 active:scale-[0.97] transition-transform" onclick={exportarCSV}>
        <Icono nombre="export" size={14} />
        Exportar CSV
      </button>
    {/if}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-danger mb-3">
      <Icono nombre="lock" size={18} />
      Cierre de periodo
    </div>
    <p class="text-sm text-muted mb-3">Cierra el periodo actual para reiniciar los contadores del dashboard. El historial se conserva.</p>
    <button class="w-full py-3 rounded-[var(--radius-md)] bg-danger text-white font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={cerrarPeriodo}>
      <Icono nombre="lock" size={16} color="#fff" />
      Cerrar Periodo
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="history" size={18} />
      Historial de cierres
    </div>
    {#if cierresOrdenados.length === 0}
      <div class="text-center text-muted py-6 text-sm">Sin cierres</div>
    {:else}
      {#each cierresOrdenados as cr}
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border">
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm">{cr.periodo}</div>
            <div class="text-xs text-muted">{cr.numVentas} ventas · {cr.margenN}% margen</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-success font-bold">{fmt(cr.neta)}</div>
            <div class="text-xs text-muted">{fmt(cr.ingresos)} ing.</div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
