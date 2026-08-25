<script>
  import { onMount } from 'svelte';
  import { getDB } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, confirmar, pedirPIN } from '../../core/store.svelte.js';
  import { dinero, actualizarCfg, app } from '../../core/appstate.svelte.js';
  import { n, fmt, fmtFecha } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  export const manifiesto = {
    id: 'patrimonio',
    nombre: 'Patrimonio',
    icono: 'chart',
    grupo: 'negocio',
    orden: 6,
    tablas: {
      patrimonioMov: '++id, fecha, tipo',
      cierresPeriodo: '++id, periodo, fechaCierre'
    }
  };

  let movs = $state([]);
  let cierres = $state([]);
  let ventas = $state([]);
  let compras = $state([]);
  let ajustesInv = $state([]);
  let movsCaja = $state([]);
  let lotes = $state([]);
  let productos = $state([]);
  let modalAbierto = $state(null); // 'retiro' | 'aporte' | 'capital'
  let formMov = $state({ tipo: '', monto: '', nota: '' });
  let nuevoCapital = $state('');

  async function cargar() {
    const db = getDB();
    movs = (await db.patrimonioMov.toArray()).sort((a, b) => b.fecha - a.fecha);
    cierres = (await db.cierresPeriodo.toArray()).sort((a, b) => b.fechaCierre - a.fechaCierre);
    ventas = await db.ventas.toArray();
    compras = await db.compras.toArray();
    ajustesInv = await db.ajustesInv.toArray();
    movsCaja = await db.movsCaja.toArray();
    lotes = await db.lotes.toArray();
    productos = await db.productos.toArray();
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
  let gananciaBrutaPeriodo = $derived(() => ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.ganancia), 0));
  let gananciaNetaPeriodo = $derived(() => ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.ganancia), 0));
  let gastosOpPeriodo = $derived(() => movs.filter(m => m.tipo === 'Retiro' && n(m.fecha) >= periodoInicio()).reduce((a, m) => a + n(m.monto), 0) + ajustesInv.filter(a => n(a.fecha) >= periodoInicio() && n(a.costoPerdida) > 0).reduce((a, x) => a + n(x.costoPerdida), 0));
  let gananciasAcumuladas = $derived(() => movs.filter(m => m.tipo === 'Ganancia').reduce((a, m) => a + n(m.monto), 0) - movs.filter(m => m.tipo === 'Retiro').reduce((a, m) => a + n(m.monto), 0));
  let capitalInicial = $derived(() => n(app.cfg?.capitalInicial));
  let aportesPatrimonio = $derived(() => movs.filter(m => m.tipo === 'Aporte').reduce((a, m) => a + n(m.monto), 0));
  let capitalTotal = $derived(() => capitalInicial() + aportesPatrimonio());
  let patrimonioTotal = $derived(() => capitalTotal() + gananciasAcumuladas());
  let gananciaDisponible = $derived(() => Math.max(0, gananciaNetaPeriodo() - gastosOpPeriodo()));

  function abrirModal(tipo) {
    if (tipo === 'capital') {
      nuevoCapital = String(capitalInicial());
    } else {
      formMov = { tipo, monto: '', nota: '' };
    }
    modalAbierto = tipo;
  }

  async function guardarMov() {
    if (n(formMov.monto) <= 0) { avisar('Monto inválido', 'dg'); return; }
    const ok = await pedirPIN();
    if (!ok) { avisar('PIN incorrecto', 'dg'); return; }
    const db = getDB();
    await db.patrimonioMov.add({
      fecha: Date.now(),
      tipo: formMov.tipo,
      monto: n(formMov.monto),
      nota: formMov.nota.trim()
    });
    if (formMov.tipo === 'Retiro') {
      await db.movsCaja.add({
        fecha: Date.now(),
        tipo: 'retiro',
        concepto: 'Retiro de ganancia' + (formMov.nota ? ': ' + formMov.nota : ''),
        monto: n(formMov.monto)
      });
    }
    bus.emitir('patrimonio:movimiento', { tipo: formMov.tipo });
    avisar('Movimiento registrado', 'ok');
    modalAbierto = null;
    await cargar();
  }

  async function guardarCapital() {
    const v = parseFloat(nuevoCapital);
    if (isNaN(v) || v < 0) { avisar('Capital inválido', 'dg'); return; }
    await actualizarCfg({ capitalInicial: v });
    avisar('Capital inicial actualizado', 'ok');
    modalAbierto = null;
    await cargar();
  }

  async function cerrarPeriodo() {
    const ok = await confirmar(
      'Cerrar Período',
      `Se registrará el período actual (ventas: ${dinero(ventasPeriodo())}, ganancia: ${dinero(gananciaNetaPeriodo())}) y se reiniciará el contador. El historial se conserva.`
    );
    if (!ok) return;
    const pin = await pedirPIN();
    if (!pin) { avisar('PIN incorrecto', 'dg'); return; }
    const db = getDB();
    const fechaInicio = new Date(periodoInicio());
    const periodo = fechaInicio.toLocaleDateString('es', { month: 'short', year: '2-digit' });
    await db.cierresPeriodo.add({
      periodo,
      fechaCierre: Date.now(),
      totalVentas: ventasPeriodo(),
      ganancia: gananciaNetaPeriodo()
    });
    await db.patrimonioMov.add({
      fecha: Date.now(),
      tipo: 'Ganancia',
      monto: gananciaNetaPeriodo(),
      nota: `Cierre de período ${periodo}`
    });
    await actualizarCfg({ periodoInicio: Date.now() });
    bus.emitir('periodo:cerrado', { periodo });
    avisar('Período cerrado', 'ok');
    await cargar();
  }

  onMount(cargar);
  bus.on('venta:registrada', cargar);
  bus.on('venta:anulada', cargar);
  bus.on('compra:registrada', cargar);
  bus.on('compra:editada', cargar);
  bus.on('merma:registrada', cargar);
  bus.on('arqueo:registrado', cargar);
</script>

<div class="modulo">
  <div class="card">
    <div class="tit">Patrimonio Total</div>
    <div class="big pos">{dinero(patrimonioTotal())}</div>
    <div class="mut">Capital {dinero(capitalTotal())} · Gan. acum. {dinero(gananciasAcumuladas())}</div>
  </div>

  <div class="card">
    <div class="tit">Resumen contable</div>
    <div class="list">
      <div class="item"><div class="t">Capital inicial</div><div>{dinero(capitalInicial())}</div></div>
      <div class="item"><div class="t">Aportes</div><div class="pos">+{dinero(aportesPatrimonio())}</div></div>
      <div class="item" style="font-weight:700"><div class="t">= CAPITAL</div><div>{dinero(capitalTotal())}</div></div>
      <hr class="sep" />
      <div class="item"><div class="t">Caja</div><div>{dinero(saldoCaja())}</div></div>
      <div class="item"><div class="t">Inventario</div><div>{dinero(valorInventario())}</div></div>
      <div class="item" style="font-weight:700"><div class="t">= ACTIVOS</div><div>{dinero(saldoCaja() + valorInventario())}</div></div>
      <hr class="sep" />
      <div class="item"><div class="t">Ganancia bruta</div><div>{dinero(ventasPeriodo())}</div></div>
      <div class="item"><div class="t">Gastos operativos</div><div class="neg">-{dinero(gastosOpPeriodo())}</div></div>
      <div class="item" style="font-weight:700"><div class="t">= Ganancia neta (período)</div><div class="pos">{dinero(gananciaNetaPeriodo())}</div></div>
      <hr class="sep" />
      <div class="item" style="background:var(--sf);font-weight:700">
        <div class="t">DISPONIBLE PARA RETIRO</div>
        <div class="pos">{dinero(gananciaDisponible())}</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="tit">Acciones</div>
    <div class="row" style="flex-wrap:wrap;gap:0.5rem">
      <button class="btn dgr sm" on:click={() => abrirModal('Retiro')}>
        <Icono nombre="minus" size={16} /> Retirar Ganancia
      </button>
      <button class="btn ok sm" on:click={() => abrirModal('Aporte')}>
        <Icono nombre="plus" size={16} /> Aportar Capital
      </button>
      <button class="btn sec sm" on:click={() => abrirModal('capital')}>
        <Icono nombre="edit" size={16} /> Capital Inicial
      </button>
    </div>
  </div>

  <div class="card">
    <div class="tit">Cerrar Período</div>
    <div class="mut" style="margin-bottom:0.5rem">
      Al cerrar, los contadores del inicio se reinician. El historial se conserva y la ganancia se acumula.
    </div>
    <div class="mut">Período actual: desde {fmtFecha(periodoInicio())}</div>
    <div class="mut" style="margin-top:0.25rem">
      Ventas {dinero(ventasPeriodo())} · Compras {dinero(comprasPeriodo())} · Ganancia {dinero(gananciaNetaPeriodo())}
    </div>
    <button class="btn dgr" style="margin-top:0.75rem;width:100%" on:click={cerrarPeriodo}>
      <Icono nombre="check" size={16} /> Cerrar Período y Empezar Nuevo
    </button>
  </div>

  <div class="card">
    <div class="tit">Historial de Cierres</div>
    {#if cierres.length === 0}
      <div class="empty"><Icono nombre="archive" size={48} /><p>Sin cierres</p></div>
    {:else}
      <div class="list">
        {#each cierres as c}
          <div class="item">
            <div class="t">{c.periodo}</div>
            <div class="s">Cerrado {fmtFecha(c.fechaCierre)} · Vtas {dinero(c.totalVentas)} · Gan {dinero(c.ganancia)}</div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="card">
    <div class="tit">Historial de Movimientos</div>
    {#if movs.length === 0}
      <div class="empty"><Icono nombre="archive" size={48} /><p>Sin movimientos</p></div>
    {:else}
      <div class="list">
        {#each movs.slice(0, 30) as m}
          <div class="item">
            <div>
              <div class="t">{m.tipo}</div>
              <div class="s">{fmtFecha(m.fecha)}{m.nota ? ' · ' + m.nota : ''}</div>
            </div>
            <div class={m.tipo === 'Retiro' ? 'neg' : 'pos'} style="font-weight:600">
              {m.tipo === 'Retiro' ? '-' : '+'}{dinero(m.monto)}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if modalAbierto === 'retiro' || modalAbierto === 'aporte'}
    <div class="mask cent" on:click={() => modalAbierto = null} on:keydown={(e) => e.key === 'Escape' && (modalAbierto = null)} role="dialog">
      <div class="modal" on:click={(e) => e.stopPropagation()} role="dialog">
        <div class="tit">
          <Icono nombre={formMov.tipo === 'Retiro' ? 'minus' : 'plus'} size={20} />
          {formMov.tipo === 'Retiro' ? 'Retirar Ganancia' : 'Aportar Capital'}
        </div>
        <label class="lbl">
          Monto
          <input class="inp" type="number" step="0.01" bind:value={formMov.monto} placeholder="0.00" />
        </label>
        <label class="lbl" style="margin-top:0.5rem">
          Nota (opcional)
          <input class="inp" type="text" bind:value={formMov.nota} placeholder="Ej: Retiro para gastos personales" />
        </label>
        <div class="row" style="margin-top:1rem">
          <button class="btn sec" on:click={() => modalAbierto = null}>Cancelar</button>
          <button class="btn ok" style="flex:1" on:click={guardarMov}>
            <Icono nombre="save" size={16} /> Guardar
          </button>
        </div>
      </div>
    </div>
  {:else if modalAbierto === 'capital'}
    <div class="mask cent" on:click={() => modalAbierto = null} on:keydown={(e) => e.key === 'Escape' && (modalAbierto = null)} role="dialog">
      <div class="modal" on:click={(e) => e.stopPropagation()} role="dialog">
        <div class="tit"><Icono nombre="edit" size={20} /> Capital Inicial</div>
        <div class="mut">Actual: {dinero(capitalInicial())}</div>
        <label class="lbl" style="margin-top:0.5rem">
          Nuevo capital inicial
          <input class="inp" type="number" step="0.01" bind:value={nuevoCapital} placeholder="0.00" />
        </label>
        <div class="row" style="margin-top:1rem">
          <button class="btn sec" on:click={() => modalAbierto = null}>Cancelar</button>
          <button class="btn ok" style="flex:1" on:click={guardarCapital}>
            <Icono nombre="save" size={16} /> Guardar
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .big.pos { color: var(--ok); }
</style>
