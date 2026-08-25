<script>
  import { onMount } from 'svelte';
  import { getDB } from '../../core/db.js';
  import { avisar } from '../../core/store.svelte.js';
  import { dinero } from '../../core/appstate.svelte.js';
  import { n, fmt, fmtFecha } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  export const manifiesto = {
    id: 'reportes',
    nombre: 'Reportes',
    icono: 'chart',
    grupo: 'utilidades',
    orden: 10,
    tablas: {}
  };

  let ventas = $state([]);
  let compras = $state([]);
  let ajustesInv = $state([]);
  let fechaDesde = $state('');
  let fechaHasta = $state('');
  let resultado = $state(null);

  async function cargar() {
    const db = getDB();
    ventas = await db.ventas.toArray();
    compras = await db.compras.toArray();
    ajustesInv = await db.ajustesInv.toArray();
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    fechaDesde = inicioMes.toISOString().slice(0, 10);
    fechaHasta = ahora.toISOString().slice(0, 10);
  }

  function generarReporte() {
    const desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00').getTime() : 0;
    const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59').getTime() : Date.now();

    const vs = ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= desde && n(v.fecha) <= hasta);
    const cs = compras.filter(c => n(c.fecha) >= desde && n(c.fecha) <= hasta);
    const ms = ajustesInv.filter(a => n(a.fecha) >= desde && n(a.fecha) <= hasta && n(a.costoPerdida) > 0);

    const ingresos = vs.reduce((a, v) => a + n(v.total), 0);
    const cogs = cs.reduce((a, c) => a + n(c.total), 0);
    const bruta = ingresos - cogs;
    const mermas = ms.reduce((a, m) => a + n(m.costoPerdida), 0);
    const neta = bruta - mermas;
    const margenB = ingresos > 0 ? Math.round((bruta / ingresos) * 100) : 0;
    const margenN = ingresos > 0 ? Math.round((neta / ingresos) * 100) : 0;

    resultado = {
      desde, hasta,
      ingresos, cogs, bruta, mermas, neta, margenB, margenN,
      numVentas: vs.length,
      ventas: vs,
      compras: cs,
      mermasDetalle: ms
    };
    avisar('Reporte generado', 'ok');
  }

  function exportarCSV() {
    if (!resultado) return;
    let csv = 'TIENDA PRO - REPORTE\n';
    csv += `Desde,${fmtFecha(resultado.desde)}\n`;
    csv += `Hasta,${fmtFecha(resultado.hasta)}\n\n`;
    csv += 'RESUMEN\n';
    csv += `Ingresos,${resultado.ingresos}\n`;
    csv += `Costos (COGS),${resultado.cogs}\n`;
    csv += `Ganancia bruta,${resultado.bruta}\n`;
    csv += `Margen bruto,${resultado.margenB}%\n`;
    csv += `Mermas,${resultado.mermas}\n`;
    csv += `Ganancia neta,${resultado.neta}\n`;
    csv += `Margen neto,${resultado.margenN}%\n`;
    csv += `Número de ventas,${resultado.numVentas}\n\n`;

    csv += 'VENTAS\n';
    csv += 'Fecha,Total,Ganancia,Items\n';
    resultado.ventas.forEach(v => {
      const items = v.items.map(i => `${i.nombre} x${i.cant}`).join('; ');
      csv += `${new Date(v.fecha).toLocaleString('es')},${v.total},${v.ganancia},"${items}"\n`;
    });

    csv += '\nCOMPRAS\n';
    csv += 'Fecha,Producto,Cantidad,Costo,Total\n';
    resultado.compras.forEach(c => {
      csv += `${new Date(c.fecha).toLocaleString('es')},"${c.productoNombre}",${c.cantidad},${c.costo},${c.total}\n`;
    });

    csv += '\nMERMAS\n';
    csv += 'Fecha,Producto,Motivo,Cantidad,Costo pérdida\n';
    resultado.mermasDetalle.forEach(m => {
      csv += `${new Date(m.fecha).toLocaleString('es')},"${m.productoNombre}","${m.motivo}",${m.cantidad},${m.costoPerdida}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${fechaDesde}-a-${fechaHasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    avisar('CSV exportado', 'ok');
  }

  async function compartir() {
    if (!resultado) return;
    const txt = `REPORTE ${fmtFecha(resultado.desde)} - ${fmtFecha(resultado.hoja)}
Ingresos: ${dinero(resultado.ingresos)}
Costos: ${dinero(resultado.cogs)}
Ganancia bruta: ${dinero(resultado.bruta)} (${resultado.margenB}%)
Mermas: ${dinero(resultado.mermas)}
Ganancia neta: ${dinero(resultado.neta)} (${resultado.margenN}%)
Ventas: ${resultado.numVentas}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Reporte Tienda Pro', text: txt });
      } catch (e) {
        if (e.name !== 'AbortError') avisar('Error al compartir', 'dg');
      }
    } else {
      await navigator.clipboard.writeText(txt);
      avisar('Copiado al portapapeles', 'ok');
    }
  }

  onMount(cargar);
</script>

<div class="modulo">
  <div class="card">
    <div class="tit">Reporte por Período</div>
    <div class="row" style="gap:0.5rem">
      <label class="lbl" style="flex:1">
        Desde
        <input class="inp" type="date" bind:value={fechaDesde} />
      </label>
      <label class="lbl" style="flex:1">
        Hasta
        <input class="inp" type="date" bind:value={fechaHasta} />
      </label>
    </div>
    <button class="btn ok" style="width:100%;margin-top:0.75rem" on:click={generarReporte}>
      <Icono nombre="search" size={16} /> Generar Reporte
    </button>
  </div>

  {#if resultado}
    <div class="card">
      <div class="tit">Resultado</div>
      <div class="list">
        <div class="item"><div class="t">Ingresos</div><div class="pos">{dinero(resultado.ingresos)}</div></div>
        <div class="item"><div class="t">Costos (COGS)</div><div class="neg">-{dinero(resultado.cogs)}</div></div>
        <div class="item" style="font-weight:600"><div class="t">Ganancia bruta</div><div>{dinero(resultado.bruta)} ({resultado.margenB}%)</div></div>
        <div class="item"><div class="t">Mermas</div><div class="neg">-{dinero(resultado.mermas)}</div></div>
        <div class="item" style="font-weight:700;background:var(--sf)">
          <div class="t">Ganancia neta</div>
          <div class="pos">{dinero(resultado.neta)} ({resultado.margenN}%)</div>
        </div>
        <div class="item"><div class="t">Ventas realizadas</div><div>{resultado.numVentas}</div></div>
      </div>
      <div class="row" style="margin-top:0.75rem;gap:0.5rem">
        <button class="btn sec sm" style="flex:1" on:click={exportarCSV}>
          <Icono nombre="download" size={16} /> CSV
        </button>
        <button class="btn sec sm" style="flex:1" on:click={compartir}>
          <Icono nombre="share" size={16} /> Compartir
        </button>
      </div>
    </div>
  {/if}
</div>
