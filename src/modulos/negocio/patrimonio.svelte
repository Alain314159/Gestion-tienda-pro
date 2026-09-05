<script module>
  export const manifiesto = {
    id: 'patrimonio',
    nombre: 'Patrimonio',
    icono: 'diamond',
    grupo: 'negocio',
    orden: 6,
    tablas: { capital: '++id, fecha', retiros: '++id, fecha' },
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { getDB, listar, guardar, leerConfig } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, pedirPIN } from '../../core/state.svelte.js';
  import {
    n,
    m,
    fmt,
    fmtFH,
    genId,
    saldoCaja,
    valorInventario,
    gananciaDisponible,
    clean,
    nowLocal,
    sum,
    sumWhere,
  } from '../../core/util.js';
  import { toNumber, add, sub } from '../../core/Money.js';
  import { verificarPeriodoCerrado, obtenerPeriodosCerrados } from '../../core/periodos.js';
  import Icono from '../../core/Icono.svelte';
  let cfg = $state({});
  let capital = $state([]);
  let ventas = $state([]);
  let compras = $state([]);
  let retiros = $state([]);
  let movCaja = $state([]);
  let ajustes = $state([]);
  let cierres = $state([]);
  let lotes = $state([]);
  let periodosCerrados = $state([]);
  let retiroForm = $state({ monto: '', concepto: '' });
  let aporteForm = $state({ monto: '', nota: '' });
  let capInicialStr = $state('');
  let procesando = $state(false);
  let tabActivo = $state('resumen');
  const periodoInicio = $derived(cfg.periodoInicio || nowLocal().iso);
  const saldo = $derived(saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja }));
  const valInv = $derived(valorInventario(lotes));
  const capTotal = $derived(toNumber(add(n(cfg.capitalInicial || 0), sum(capital, 'monto'))));
  const ventasArr = $derived(ventas.filter((v) => !v.anulada && isoToLocal(v.fecha) >= isoToLocal(periodoInicio)));
  const ganBruta = $derived(toNumber(sum(ventasArr, 'ganancia')));
  const gastosOp = $derived(
    toNumber(
      sumWhere(ajustes, (a) => a.cantidad < 0 && isoToLocal(a.fecha) >= isoToLocal(periodoInicio), 'costoPerdida')
    )
  );
  const ganNeta = $derived(toNumber(sub(ganBruta, gastosOp)));
  const ganAcum = $derived(toNumber(sub(add(sum(cierres, 'neta'), ganNeta), sum(retiros, 'monto'))));
  const patrimonio = $derived(toNumber(add(capTotal, ganAcum)));
  const disp = $derived(
    gananciaDisponible({ cfg, capital, ventas, compras, retiros, movCaja, ajustes, cierres, lotes, periodoInicio })
  );
  const movs = $derived(
    (() => {
      const arr = [];
      if (n(cfg.capitalInicial) > 0)
        arr.push({
          id: 'ci',
          fecha: cfg.periodoInicio,
          tipo: 'Capital inicial',
          monto: n(cfg.capitalInicial),
          nota: '',
        });
      capital.forEach((c) => arr.push({ id: c.id, fecha: c.fecha, tipo: 'Aporte', monto: n(c.monto), nota: c.nota }));
      retiros.forEach((r) =>
        arr.push({ id: r.id, fecha: r.fecha, tipo: 'Retiro', monto: n(r.monto), nota: r.concepto })
      );
      return arr.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    })()
  );
  async function recargar() {
    [capital, ventas, compras, retiros, movCaja, ajustes, cierres, lotes] = await Promise.all([
      listar('capital'),
      listar('ventas'),
      listar('compras'),
      listar('retiros'),
      listar('movCaja'),
      listar('ajustes'),
      listar('cierres'),
      listar('lotes'),
    ]);
    cfg = (await leerConfig('cfg')) || { capitalInicial: 0, periodoInicio: nowLocal().iso };
    periodosCerrados = await obtenerPeriodosCerrados();
  }
  function esCerrado(fechaIso) {
    const f = isoToLocal(fechaIso);
    return periodosCerrados.some((p) => isoToLocal(p.inicio) <= f && f <= isoToLocal(p.fin));
  }
  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });
  async function registrarRetiro() {
    if (procesando) return;
    try {
      await verificarPeriodoCerrado(nowLocal().iso);
    } catch (e) {
      return avisar(e.message, 'bad');
    }
    const monto = n(retiroForm.monto);
    const c = (retiroForm.concepto || '').trim();
    if (monto <= 0) return avisar('Monto invalido', 'bad');
    if (!c) return avisar('Concepto obligatorio', 'bad');
    if (monto > disp + 0.01) return avisar('Maximo ' + fmt(disp), 'bad');
    const pinOk = await pedirPIN();
    if (!pinOk) return;
    procesando = true;
    try {
      await guardar('retiros', {
        id: genId('r'),
        fecha: nowLocal().iso,
        fechaLocal: nowLocal().local,
        monto,
        concepto: c,
      });
      await recargar();
      bus.emit('recargar');
      retiroForm = { monto: '', concepto: '' };
      avisar('Retiro registrado');
    } finally {
      procesando = false;
    }
  }
  async function registrarAporte() {
    if (procesando) return;
    try {
      await verificarPeriodoCerrado(nowLocal().iso);
    } catch (e) {
      return avisar(e.message, 'bad');
    }
    const monto = n(aporteForm.monto);
    if (monto <= 0) return avisar('Monto invalido', 'bad');
    procesando = true;
    try {
      await guardar('capital', {
        id: genId('k'),
        fecha: nowLocal().iso,
        fechaLocal: nowLocal().local,
        monto,
        nota: aporteForm.nota || '',
      });
      await recargar();
      bus.emit('recargar');
      aporteForm = { monto: '', nota: '' };
      avisar('Aporte registrado');
    } finally {
      procesando = false;
    }
  }
  async function guardarCapInicial() {
    if (procesando) return;
    try {
      await verificarPeriodoCerrado(nowLocal().iso);
    } catch (e) {
      return avisar(e.message, 'bad');
    }
    const val = n(capInicialStr);
    cfg.capitalInicial = val;
    procesando = true;
    try {
      await guardar('config', { key: 'cfg', value: clean(cfg) });
      capInicialStr = '';
      await recargar();
      bus.emit('recargar');
      avisar('Capital inicial guardado');
    } finally {
      procesando = false;
    }
  }
</script>

<div class="modulo">
  <!-- Patrimonio total -->
  <div
    class="bg-gradient-to-br from-purple to-[#5b21b6] text-white rounded-[var(--radius-lg)] p-5 text-center mb-3 shadow-[var(--color-shadow)] relative overflow-hidden"
  >
    <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
    <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
    <div class="relative">
      <div class="flex items-center justify-center gap-1.5 text-xs opacity-90 mb-1">
        <Icono nombre="diamond" size={14} color="#fff" /> Patrimonio Total
      </div>
      <div class="text-3xl font-extrabold my-1">{fmt(patrimonio)}</div>
      <div class="text-xs opacity-85">Capital {fmt(capTotal)} · Gan. acum. {fmt(ganAcum)}</div>
    </div>
  </div>
  <!-- Tabs -->
  <div class="flex gap-1 bg-background rounded-xl p-1 mb-3">
    <button
      class="flex-1 py-2 rounded-lg text-xs font-bold transition-all {tabActivo === 'resumen'
        ? 'bg-card text-primary shadow-sm'
        : 'text-muted'}"
      onclick={() => (tabActivo = 'resumen')}>Resumen</button
    >
    <button
      class="flex-1 py-2 rounded-lg text-xs font-bold transition-all {tabActivo === 'movimientos'
        ? 'bg-card text-primary shadow-sm'
        : 'text-muted'}"
      onclick={() => (tabActivo = 'movimientos')}>Movimientos</button
    >
    <button
      class="flex-1 py-2 rounded-lg text-xs font-bold transition-all {tabActivo === 'config'
        ? 'bg-card text-primary shadow-sm'
        : 'text-muted'}"
      onclick={() => (tabActivo = 'config')}>Config</button
    >
  </div>
  {#if tabActivo === 'resumen'}
    <!-- Resumen contable -->
    <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
      <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
        <Icono nombre="chart" size={18} /> Resumen contable
      </div>
      <div class="space-y-0">
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border text-sm">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-primary"></div>
            <span>Capital inicial</span>
          </div>
          <span class="font-bold">{fmt(cfg.capitalInicial || 0)}</span>
        </div>
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border text-sm">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-success"></div>
            <span>Aportes</span>
          </div>
          <span class="text-success font-bold">+{fmt(toNumber(sum(capital, 'monto')))}</span>
        </div>
        <div
          class="flex justify-between items-center gap-2 py-2.5 border-t border-text text-sm font-bold bg-primary/5 rounded-lg px-3 mt-1"
        >
          <span>= CAPITAL</span> <span class="text-primary">{fmt(capTotal)}</span>
        </div>
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border text-sm mt-2">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-primary"></div>
            <span>Caja</span>
          </div>
          <span class="font-bold">{fmt(saldo)}</span>
        </div>
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border text-sm">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-purple"></div>
            <span>Inventario</span>
          </div>
          <span class="font-bold">{fmt(valInv)}</span>
        </div>
        <div
          class="flex justify-between items-center gap-2 py-2.5 border-t border-text text-sm font-bold bg-primary/5 rounded-lg px-3 mt-1"
        >
          <span>= ACTIVOS</span> <span class="text-primary">{fmt(toNumber(add(saldo, valInv)))}</span>
        </div>
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border text-sm mt-2">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-success"></div>
            <span>Ganancia bruta</span>
          </div>
          <span class="text-success font-bold">{fmt(ganBruta)}</span>
        </div>
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border text-sm">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-danger"></div>
            <span>Gastos operativos</span>
          </div>
          <span class="text-danger font-bold">-{fmt(gastosOp)}</span>
        </div>
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border text-sm">
          <span>= Ganancia neta (periodo)</span> <span class="font-bold">{fmt(ganNeta)}</span>
        </div>
        <div
          class="flex justify-between items-center gap-2 py-3 bg-success/10 rounded-xl px-3 mt-2 text-sm font-extrabold"
        >
          <span>DISPONIBLE PARA RETIRO</span> <span class="text-success text-base">{fmt(disp)}</span>
        </div>
      </div>
    </div>
    <!-- Retirar -->
    <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
      <div class="flex items-center gap-2 font-extrabold text-warning mb-3">
        <Icono nombre="dollar" size={18} /> Retirar Ganancia
      </div>
      <input
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2"
        type="number"
        inputmode="decimal"
        step="0.01"
        placeholder="Monto"
        bind:value={retiroForm.monto}
      />
      <input
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2"
        type="text"
        placeholder="Concepto"
        bind:value={retiroForm.concepto}
      />
      <button
        class="w-full py-3 rounded-[var(--radius-md)] bg-warning text-white font-extrabold text-sm active:scale-[0.97] transition-transform disabled:opacity-50"
        onclick={registrarRetiro}
        disabled={procesando}
      >
        <Icono nombre="dollar" size={16} color="#fff" />
        {procesando ? 'Procesando...' : 'Retirar Ganancia'}
      </button>
    </div>
    <!-- Aportar -->
    <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
      <div class="flex items-center gap-2 font-extrabold text-success mb-3">
        <Icono nombre="plus" size={18} /> Aportar Capital
      </div>
      <input
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2"
        type="number"
        inputmode="decimal"
        step="0.01"
        placeholder="Monto"
        bind:value={aporteForm.monto}
      />
      <input
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2"
        type="text"
        placeholder="Nota"
        bind:value={aporteForm.nota}
      />
      <button
        class="w-full py-3 rounded-[var(--radius-md)] bg-success text-white font-extrabold text-sm active:scale-[0.97] transition-transform disabled:opacity-50"
        onclick={registrarAporte}
        disabled={procesando}
      >
        <Icono nombre="plus" size={16} color="#fff" />
        {procesando ? 'Procesando...' : 'Registrar Aporte'}
      </button>
    </div>
  {:else if tabActivo === 'movimientos'}
    <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)]">
      <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
        <Icono nombre="history" size={18} /> Historial
      </div>
      {#if movs.length === 0}
        <div class="text-center text-muted py-8 text-sm">Sin movimientos</div>
      {:else}
        {#each movs as m}
          <div
            class="flex justify-between items-center gap-2 py-3 border-b border-border {esCerrado(m.fecha)
              ? 'opacity-60'
              : ''}"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full {m.tipo === 'Retiro' ? 'bg-danger' : 'bg-success'}"></div>
                <span class="font-bold text-sm">{m.tipo}</span>
              </div>
              <div class="text-xs text-muted ml-4">{fmtFH(m.fecha)} {m.nota ? '· ' + m.nota : ''}</div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              {#if esCerrado(m.fecha)}
                <span class="inline-block px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold text-white bg-warning"
                  >CERRADO</span
                >
              {:else}
                <b class={m.tipo === 'Retiro' ? 'text-danger' : 'text-success'}
                  >{m.tipo === 'Retiro' ? '-' : '+'}{fmt(m.monto)}</b
                >
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {:else}
    <!-- Capital inicial -->
    <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
      <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
        <Icono nombre="wallet" size={18} /> Capital Inicial
      </div>
      <div class="bg-primary/10 rounded-xl p-3 mb-3 text-center">
        <div class="text-xs text-muted">Capital inicial actual</div>
        <div class="text-2xl font-extrabold text-primary">{fmt(cfg.capitalInicial || 0)}</div>
      </div>
      <input
        class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2"
        type="number"
        inputmode="decimal"
        step="0.01"
        placeholder="Nuevo monto de capital inicial"
        bind:value={capInicialStr}
      />
      <button
        class="w-full py-3 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm active:scale-[0.97] transition-transform disabled:opacity-50"
        onclick={guardarCapInicial}
        disabled={procesando}
      >
        <Icono nombre="check" size={16} color="#fff" />
        {procesando ? 'Guardando...' : 'Guardar Capital Inicial'}
      </button>
    </div>
  {/if}
</div>
