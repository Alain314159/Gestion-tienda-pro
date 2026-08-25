<script>
  import { onMount, onDestroy } from 'svelte';
  import { getDB } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { ui } from '../../core/store.svelte.js';
  import { dinero, app } from '../../core/appstate.svelte.js';
  import { n, fmt, fmtCant, fmtFH, fmtFecha } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  export const manifiesto = {
    id: 'inicio',
    nombre: 'Inicio',
    icono: 'home',
    grupo: 'negocio',
    orden: 0,
    tablas: {}
  };

  let ventas = $state([]);
  let compras = $state([]);
  let productos = $state([]);
  let lotes = $state([]);
  let ajustesInv = $state([]);
  let movsCaja = $state([]);
  let Chart = $state(null);
  let canvas;
  let chartInstance;

  async function cargar() {
    const db = getDB();
    ventas = await db.ventas.toArray();
    compras = await db.compras.toArray();
    productos = await db.productos.toArray();
    lotes = await db.lotes.toArray();
    ajustesInv = await db.ajustesInv.toArray();
    movsCaja = await db.movsCaja.toArray();
  }

  function stock(id) {
    return lotes.filter(l => l.productoId === id)
      .reduce((a, l) => a + Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)), 0);
  }

  function costoPromedio(id) {
    const lp = lotes.filter(l => l.productoId === id && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0)
      .sort((a, b) => n(a.fecha) - n(b.fecha));
    let t = 0, c = 0;
    for (const l of lp) { const r = n(l.cantidadInicial) - n(l.cantidadVendida); t += r * n(l.costo); c += r; }
    return c > 0 ? t / c : 0;
  }

  function valorInventario() {
    return productos.filter(p => !p.archivado).reduce((a, p) => {
      return a + lotes.filter(l => l.productoId === p.id)
        .reduce((b, l) => b + Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)) * n(l.costo), 0);
    }, 0);
  }

  let saldoCaja = $derived(() => {
    const cap = n(app.cfg?.capitalInicial);
    const ap = movsCaja.filter(m => m.tipo === 'aporte').reduce((a, m) => a + n(m.monto), 0);
    const re = movsCaja.filter(m => m.tipo === 'retiro').reduce((a, m) => a + n(m.monto), 0);
    const vt = ventas.filter(v => v.estado === 'activa').reduce((a, v) => a + n(v.total), 0);
    const co = compras.reduce((a, c) => a + n(c.total), 0);
    const arq = movsCaja.filter(m => m.tipo === 'sobrante' || m.tipo === 'faltante')
      .reduce((a, m) => a + (m.tipo === 'sobrante' ? n(m.monto) : -n(m.monto)), 0);
    return cap + ap + vt - co - re + arq;
  });

  let periodoInicio = $derived(() => n(app.cfg?.periodoInicio) || 0);

  let ventasPeriodo = $derived(() => ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.total), 0));
  let comprasPeriodo = $derived(() => compras.filter(c => n(c.fecha) >= periodoInicio()).reduce((a, c) => a + n(c.total), 0));
  let gananciaNetaPeriodo = $derived(() => ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.ganancia), 0));
  let margenPeriodo = $derived(() => {
    const v = ventasPeriodo();
    return v > 0 ? Math.round((gananciaNetaPeriodo() / v) * 100) : 0;
  });

  let productosAgotados = $derived(() => productos.filter(p => !p.archivado && stock(p.id) <= 0));
  let productosBajoStock = $derived(() => productos.filter(p => !p.archivado && stock(p.id) > 0 && stock(p.id) <= 5));

  let topRentables = $derived(() => {
    const mapa = {};
    ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).forEach(v => {
      v.items.forEach(it => {
        if (!mapa[it.productoId]) mapa[it.productoId] = { nombre: it.nombre, gan: 0 };
        mapa[it.productoId].gan += (n(it.precio) - n(it.costo)) * n(it.cant);
      });
    });
    return Object.values(mapa).sort((a, b) => b.gan - a.gan).slice(0, 5);
  });

  let ultimaActividad = $derived(() => {
    const todas = [
      ...ventas.map(v => n(v.fecha)),
      ...compras.map(c => n(c.fecha)),
      ...ajustesInv.map(a => n(a.fecha)),
      ...movsCaja.map(m => n(m.fecha))
    ].filter(x => x > 0);
    return todas.length ? fmtFH(Math.max(...todas)) : 'Sin actividad';
  });

  async function cargarChart() {
    try {
      const mod = await import('chart.js/auto');
      Chart = mod.default || mod;
    } catch (e) {
      console.warn('Chart.js no disponible', e);
    }
  }

  function renderChart() {
    if (!Chart || !canvas) return;
    if (chartInstance) chartInstance.destroy();
    const ctx = canvas.getContext('2d');
    const meses = [];
    const datosVentas = [];
    const datosGanancia = [];
    const ahora = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const inicio = d.getTime();
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
      meses.push(d.toLocaleDateString('es', { month: 'short' }));
      const vs = ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= inicio && n(v.fecha) <= fin);
      datosVentas.push(vs.reduce((a, v) => a + n(v.total), 0));
      datosGanancia.push(vs.reduce((a, v) => a + n(v.ganancia), 0));
    }
    const pri = getComputedStyle(document.documentElement).getPropertyValue('--pri').trim() || '#2196F3';
    const ok = getComputedStyle(document.documentElement).getPropertyValue('--ok').trim() || '#16a34a';
    const txm = getComputedStyle(document.documentElement).getPropertyValue('--txm').trim() || '#666';
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [
          { label: 'Ventas', data: datosVentas, backgroundColor: pri, borderRadius: 6 },
          { label: 'Ganancia', data: datosGanancia, backgroundColor: ok, borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: txm } } },
        scales: {
          x: { ticks: { color: txm }, grid: { display: false } },
          y: { ticks: { color: txm }, grid: { color: txm + '22' } }
        }
      }
    });
  }

  function irA(id) { ui.activo = id; }

  onMount(async () => {
    await cargar();
    await cargarChart();
    renderChart();
  });

  bus.on('venta:registrada', cargar);
  bus.on('venta:anulada', cargar);
  bus.on('compra:registrada', cargar);
  bus.on('compra:editada', cargar);
  bus.on('merma:registrada', cargar);
  bus.on('arqueo:registrado', cargar);
  bus.on('cfg', () => { cargar(); setTimeout(renderChart, 100); });

  onDestroy(() => { if (chartInstance) chartInstance.destroy(); });
</script>

<div class="modulo">
  {(productosAgotados.length > 0 || productosBajoStock.length > 0) && (
    <div class="card" style="border-color:var(--wn)">
      <div class="tit" style="color:var(--wn)">
        <Icono nombre="alert" size={18} /> Alertas de stock
      </div>
      <div class="mut">
        {productosAgotados.length} agotado(s) · {productosBajoStock.length} bajo(s)
      </div>
    </div>
  )}

  <div class="card">
    <div class="tit">Resumen del período</div>
    <div class="mut" style="margin-bottom:0.5rem">Desde {fmtFecha(periodoInicio())}</div>
    <div class="row" style="gap:0.75rem;flex-wrap:wrap">
      <div style="flex:1;min-width:120px">
        <div class="mut">Ventas</div>
        <div class="big pos">{dinero(ventasPeriodo())}</div>
      </div>
      <div style="flex:1;min-width:120px">
        <div class="mut">Ganancia</div>
        <div class="big pos">{dinero(gananciaNetaPeriodo())}</div>
      </div>
      <div style="flex:1;min-width:120px">
        <div class="mut">Compras</div>
        <div class="big neg">{dinero(comprasPeriodo())}</div>
      </div>
      <div style="flex:1;min-width:120px">
        <div class="mut">Margen</div>
        <div class="big">{margenPeriodo()}%</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="tit">Efectivo en Caja</div>
    <div class="big" class:pos={saldoCaja() >= 0} class:neg={saldoCaja() < 0}>
      {dinero(saldoCaja())}
    </div>
    <div class="mut">Inventario: {dinero(valorInventario())}</div>
  </div>

  <div class="card">
    <div class="tit">Ventas vs Ganancia (6 meses)</div>
    <div style="height:220px;position:relative">
      {#if Chart}
        <canvas bind:this={canvas}></canvas>
      {:else}
        <div class="empty" style="padding:2rem"><div class="mut">Cargando gráfica...</div></div>
      {/if}
    </div>
  </div>

  <div class="card">
    <div class="tit">Top rentables del mes</div>
    {#if topRentables.length === 0}
      <div class="empty"><div class="mut">Sin ventas este mes</div></div>
    {:else}
      <div class="list">
        {#each topRentables as p, i}
          <div class="item">
            <div class="t">{i + 1}. {p.nombre}</div>
            <div class="pos" style="font-weight:600">{dinero(p.gan)}</div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="card">
    <div class="tit">Accesos rápidos</div>
    <div class="row" style="flex-wrap:wrap;gap:0.5rem">
      <button class="btn ok sm" on:click={() => irA('ventas')}>
        <Icono nombre="cash" size={16} /> Nueva Venta
      </button>
      <button class="btn sec sm" on:click={() => irA('compras')}>
        <Icono nombre="cart" size={16} /> Registrar Compra
      </button>
      <button class="btn sec sm" on:click={() => irA('caja')}>
        <Icono nombre="check" size={16} /> Arqueo de Caja
      </button>
      <button class="btn sec sm" on:click={() => irA('inventario')}>
        <Icono nombre="layers" size={16} /> Ver Inventario
      </button>
    </div>
    <div class="mut" style="margin-top:0.75rem;font-size:0.85rem">
      Última actividad: {ultimaActividad()}
    </div>
  </div>
</div>

<style>
  .big.pos { color: var(--ok); }
  .big.neg { color: var(--dg); }
</style>
