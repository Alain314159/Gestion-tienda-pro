<script module>
  export const manifiesto = {
    id: 'inicio',
    nombre: 'Inicio',
    icono: 'home',
    grupo: 'negocio',
    orden: 0,
    tablas: {},
  };
</script>

<script>
  import { onMount, onDestroy } from 'svelte';
  import { getDB, listar, listarPaginado, leerConfig } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { ui, avisar } from '../../core/state.svelte.js';
  import {
    n,
    m,
    fmt,
    fmtCant,
    fmtFecha,
    fmtFH,
    valorInventario,
    stockVariante,
    datosChart6Meses,
    topRentables,
    saldoCaja,
    badgeStockVariante,
    nowLocal,
  } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  let productos = $state([]);
  let variantes = $state([]);
  let lotes = $state([]);
  let ventas = $state([]);
  let compras = $state([]);
  let ajustes = $state([]);
  let movCaja = $state([]);
  let cierres = $state([]);
  let capital = $state([]);
  let retiros = $state([]);
  let arqueos = $state([]);
  let cfg = $state({});
  let chartCanvas = $state(null);

  const periodoInicio = $derived(cfg.periodoInicio || nowLocal().iso);
  const ventasPeriodoArr = $derived(ventas.filter((v) => !v.anulada && new Date(v.fecha) >= new Date(periodoInicio)));
  const comprasPeriodoArr = $derived(compras.filter((c) => !c.anulada && new Date(c.fecha) >= new Date(periodoInicio)));
  const ventasPeriodo = $derived(m(ventasPeriodoArr.reduce((s, v) => s + n(v.total), 0)));
  const comprasPeriodo = $derived(m(comprasPeriodoArr.reduce((s, c) => s + n(c.total), 0)));
  const gananciaBruta = $derived(m(ventasPeriodoArr.reduce((s, v) => s + n(v.ganancia), 0)));
  const gastosOp = $derived(
    m(
      ajustes
        .filter((a) => a.cantidad < 0 && new Date(a.fecha) >= new Date(periodoInicio))
        .reduce((s, a) => s + n(a.costoPerdida), 0)
    )
  );
  const gananciaNeta = $derived(m(gananciaBruta - gastosOp));
  const margen = $derived(ventasPeriodo > 0 ? ((gananciaNeta / ventasPeriodo) * 100).toFixed(1) : '0.0');
  const saldo = $derived(saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja }));
  const valInv = $derived(valorInventario(lotes));
  const varsActivas = $derived(variantes.filter((v) => !v.archivado));
  const agotados = $derived(varsActivas.filter((v) => stockVariante(lotes, v.id) === 0));
  const bajoStock = $derived(
    varsActivas.filter((v) => {
      const s = stockVariante(lotes, v.id);
      return s > 0 && s <= n(v.stockMinimo);
    })
  );
  const topRent = $derived(topRentables(ventas));
  const chartData = $derived(datosChart6Meses(ventas));
  const ultimaAct = $derived(
    (() => {
      const v = ventas.filter((x) => !x.anulada).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
      const c = cierres.sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre))[0];
      if (!v && !c) return 'Sin actividad';
      if (v && (!c || new Date(v.fecha) > new Date(c.fechaCierre)))
        return 'Venta ' + fmt(v.total) + ' el ' + fmtFH(v.fecha);
      return 'Cierre ' + (c?.periodo || '');
    })()
  );

  async function recargar() {
    // Productos y lotes: tablas pequenas, cargar completas
    // Ventas/compras: tablas grandes, solo ultimos N para el dashboard
    [productos, variantes, lotes, ventas, compras, ajustes, movCaja, cierres, capital, retiros, arqueos] =
      await Promise.all([
        listar('productos'),
        listar('productoVariantes'),
        listar('lotes'),
        listarPaginado('ventas', 0, 300),
        listarPaginado('compras', 0, 150),
        listarPaginado('ajustes', 0, 50),
        listarPaginado('movCaja', 0, 50),
        listarPaginado('cierres', 0, 20),
        listarPaginado('capital', 0, 20),
        listarPaginado('retiros', 0, 50),
        listarPaginado('arqueos', 0, 20),
      ]);
    cfg = (await leerConfig('cfg')) || {
      moneda: '$',
      nombre: 'Tienda Pro',
      periodoInicio: nowLocal().iso,
      capitalInicial: 0,
    };
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);

    // ResizeObserver para redibujar canvas al cambiar tamaño (con debounce para evitar loops)
    let ro;
    let resizeTimeout;
    if (chartCanvas && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (chartCanvas) {
            chartCanvas.width = chartCanvas.offsetWidth;
          }
        }, 150);
      });
      ro.observe(chartCanvas.parentElement);
    }

    return () => {
      off();
      clearTimeout(resizeTimeout);
      if (ro) ro.disconnect();
    };
  });

  $effect(() => {
    if (!chartCanvas || chartData.length === 0) return;
    const ctx = chartCanvas.getContext('2d');
    const w = (chartCanvas.width = chartCanvas.offsetWidth);
    const h = (chartCanvas.height = 200);
    ctx.clearRect(0, 0, w, h);

    // Leer colores del tema CSS
    const style = getComputedStyle(chartCanvas);
    const colorPrimary = style.getPropertyValue('--color-primary').trim() || '#2196F3';
    const colorSuccess = style.getPropertyValue('--color-success').trim() || '#16a34a';
    const colorMuted = style.getPropertyValue('--color-muted').trim() || '#6b7280';

    const max = Math.max(...chartData.map((d) => Math.max(d.v, d.g)), 1);
    const barW = (w / chartData.length) * 0.3;
    const gap = (w / chartData.length) * 0.1;
    const step = w / chartData.length;

    chartData.forEach((d, i) => {
      const x = i * step + step * 0.15;
      const vh = (d.v / max) * (h - 30);
      const gh = (d.g / max) * (h - 30);

      ctx.fillStyle = colorPrimary;
      ctx.fillRect(x, h - vh - 20, barW, vh);
      ctx.fillStyle = colorSuccess;
      ctx.fillRect(x + barW + gap, h - gh - 20, barW, gh);

      ctx.fillStyle = colorMuted;
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

  <div
    class="bg-gradient-to-br from-primary to-[#1e3a8a] text-white rounded-[var(--radius-lg)] p-5 text-center mb-3 shadow-[var(--color-shadow)]"
  >
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
    <div class="text-xs text-muted">Ultima actividad: <b class="text-text">{ultimaAct}</b></div>
  </div>
</div>
