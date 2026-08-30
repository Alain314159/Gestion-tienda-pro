<script module>
  export const manifiesto = {
    id: 'inicio',
    nombre: 'Inicio',
    icono: 'home',
    grupo: 'negocio',
    orden: 0,
    tablas: {}
  };
</script>

<script>
  import { onMount, onDestroy } from 'svelte';
  import { getDB, listar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { ui, avisar } from '../../core/state.svelte.js';
  import {
    n, m, fmt, fmtCant, fmtFecha, fmtFH, valorInventario, stockProducto,
    datosChart6Meses, topRentables, saldoCaja, inventarioGrupos, badgeStock
  } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  let productos = $state([]);
  let lotes = $state([]);
  let ventas = $state([]);
  let compras = $state([]);
  let ajustes = $state([]);
  let movCaja = $state([]);
  let cierres = $state([]);
  let capital = $state([]);
  let retiros = $state([]);
  let cfg = $state({});
  let chartCanvas = $state(null);

  let periodoInicio = $derived(cfg.periodoInicio || new Date().toISOString());
  let ventasPeriodoArr = $derived(ventas.filter(v => !v.anulada && new Date(v.fecha) >= new Date(periodoInicio)));
  let comprasPeriodoArr = $derived(compras.filter(c => !c.anulada && new Date(c.fecha) >= new Date(periodoInicio)));
  let ventasPeriodo = $derived(m(ventasPeriodoArr.reduce((s, v) => s + n(v.total), 0)));
  let comprasPeriodo = $derived(m(comprasPeriodoArr.reduce((s, c) => s + n(c.total), 0)));
  let gananciaBruta = $derived(m(ventasPeriodoArr.reduce((s, v) => s + n(v.ganancia), 0)));
  let gastosOp = $derived(m(ajustes.filter(a => a.cantidad < 0 && new Date(a.fecha) >= new Date(periodoInicio)).reduce((s, a) => s + n(a.costoPerdida), 0)));
  let gananciaNeta = $derived(m(gananciaBruta - gastosOp));
  let margen = $derived(ventasPeriodo > 0 ? ((gananciaNeta / ventasPeriodo) * 100).toFixed(1) : '0.0');
  let saldo = $derived(saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja }));
  let valInv = $derived(valorInventario(lotes));
  let prodsActivos = $derived(productos.filter(p => !p.archivado));
  let agotados = $derived(prodsActivos.filter(p => stockProducto(lotes, p.id) === 0));
  let bajoStock = $derived(prodsActivos.filter(p => { const s = stockProducto(lotes, p.id); return s > 0 && s <= n(p.stockMinimo); }));
  let topRent = $derived(topRentables(ventas));
  let chartData = $derived(datosChart6Meses(ventas));
  let ultimaAct = $derived(() => {
    const v = ventas.filter(x => !x.anulada).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
    const c = cierres.sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre))[0];
    if (!v && !c) return 'Sin actividad';
    if (v && (!c || new Date(v.fecha) > new Date(c.fechaCierre))) return 'Venta ' + fmt(v.total) + ' el ' + fmtFH(v.fecha);
    return 'Cierre ' + (c?.periodo || '');
  });

  async function recargar() {
    const db = getDB();
    [productos, lotes, ventas, compras, ajustes, movCaja, cierres, capital, retiros] = await Promise.all([
      listar('productos'), listar('lotes'), listar('ventas'), listar('compras'),
      listar('ajustes'), listar('movCaja'), listar('cierres'), listar('capital'), listar('retiros')
    ]);
    const c = await db.config.get('cfg');
    cfg = c?.value || { moneda: '$', nombre: 'Tienda Pro', periodoInicio: new Date().toISOString(), capitalInicial: 0 };
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  // Dibujar chart simple con canvas
  $effect(() => {
    if (!chartCanvas || chartData.length === 0) return;
    const ctx = chartCanvas.getContext('2d');
    const w = chartCanvas.width = chartCanvas.offsetWidth;
    const h = chartCanvas.height = 200;
    ctx.clearRect(0, 0, w, h);

    const max = Math.max(...chartData.map(d => Math.max(d.v, d.g)), 1);
    const barW = (w / chartData.length) * 0.3;
    const gap = (w / chartData.length) * 0.1;
    const step = w / chartData.length;

    chartData.forEach((d, i) => {
      const x = i * step + step * 0.15;
      const vh = (d.v / max) * (h - 30);
      const gh = (d.g / max) * (h - 30);

      ctx.fillStyle = '#2196F3';
      ctx.fillRect(x, h - vh - 20, barW, vh);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(x + barW + gap, h - gh - 20, barW, gh);

      ctx.fillStyle = ui.tema === 'dark' ? '#94a3b8' : '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW + gap / 2, h - 5);
    });
  });
</script>

<div class="modulo">
  {#if agotados.length > 0 || bajoStock.length > 0}
    <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3 border-l-4 border-warning">
      <div class="flex items-center gap-2 text-warning font-bold mb-1">
        <Icono nombre="alert" size={18} />
        Alertas de stock
      </div>
      <p class="text-sm text-muted">{agotados.length} agotado(s) · {bajoStock.length} bajo(s)</p>
    </div>
  {/if}

  <div class="bg-gradient-to-br from-primary to-[#1e3a8a] text-white rounded-[var(--radius-lg)] p-5 text-center mb-3 shadow-[var(--color-shadow)]">
    <div class="flex items-center justify-center gap-1.5 text-xs opacity-90 mb-1">
      <Icono nombre="wallet" size={14} color="#fff" />
      Efectivo en Caja
    </div>
    <div class="text-3xl font-extrabold my-0.5">{fmt(saldo)}</div>
    <div class="text-xs opacity-85">Inventario: {fmt(valInv)} · Desde {fmtFecha(periodoInicio)}</div>
  </div>

  <div class="grid grid-cols-2 gap-2.5 mb-3">
    <div class="bg-card rounded-[var(--radius-lg)] p-3.5 text-center shadow-[var(--color-shadow)]">
      <div class="flex items-center justify-center gap-1 text-[0.66rem] text-muted mb-1">
        <Icono nombre="trend" size={13} />
        Ventas
      </div>
      <div class="text-xl font-extrabold text-primary">{fmt(ventasPeriodo)}</div>
    </div>
    <div class="bg-card rounded-[var(--radius-lg)] p-3.5 text-center shadow-[var(--color-shadow)]">
      <div class="flex items-center justify-center gap-1 text-[0.66rem] text-muted mb-1">
        <Icono nombre="dollar" size={13} />
        Ganancia
      </div>
      <div class="text-xl font-extrabold text-success">{fmt(gananciaNeta)}</div>
    </div>
    <div class="bg-card rounded-[var(--radius-lg)] p-3.5 text-center shadow-[var(--color-shadow)]">
      <div class="flex items-center justify-center gap-1 text-[0.66rem] text-muted mb-1">
        <Icono nombre="bag" size={13} />
        Compras
      </div>
      <div class="text-xl font-extrabold text-danger">{fmt(comprasPeriodo)}</div>
    </div>
    <div class="bg-card rounded-[var(--radius-lg)] p-3.5 text-center shadow-[var(--color-shadow)]">
      <div class="flex items-center justify-center gap-1 text-[0.66rem] text-muted mb-1">
        <Icono nombre="chart" size={13} />
        Margen
      </div>
      <div class="text-xl font-extrabold text-primary">{margen}%</div>
    </div>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="chart" size={18} />
      Ventas vs Ganancia (6 meses)
    </div>
    <div class="relative h-[200px]">
      <canvas bind:this={chartCanvas} class="w-full h-full"></canvas>
    </div>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="diamond" size={18} />
      Top rentables del mes
    </div>
    {#if topRent.length === 0}
      <div class="text-center text-muted py-6 text-sm">Sin ventas este mes</div>
    {:else}
      {#each topRent as p, i}
        <div class="flex justify-between py-2 border-b border-border last:border-0 text-sm">
          <span>{i + 1}. {p.nombre}</span>
          <span class="text-success font-bold">{fmt(p.gan)}</span>
        </div>
      {/each}
    {/if}
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)]">
    <div class="text-xs text-muted">Ultima actividad: <b class="text-text">{ultimaAct()}</b></div>
  </div>
</div>
