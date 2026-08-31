<script module>
  export const manifiesto = {
    id: 'patrimonio',
    nombre: 'Patrimonio',
    icono: 'diamond',
    grupo: 'negocio',
    orden: 6,
    tablas: { capital: '++id, fecha', retiros: '++id, fecha' }
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { getDB, listar, guardar } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, pedirPIN } from '../../core/state.svelte.js';
  import { n, m, fmt, fmtFH, genId, saldoCaja, valorInventario, gananciaDisponible } from '../../core/util.js';
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

  let retiroForm = $state({ monto: '', concepto: '' });
  let aporteForm = $state({ monto: '', nota: '' });
  let capInicialStr = $state('');

  let periodoInicio = $derived(cfg.periodoInicio || new Date().toISOString());
  let saldo = $derived(saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja }));
  let valInv = $derived(valorInventario(lotes));
  let capTotal = $derived(m(n(cfg.capitalInicial || 0) + capital.reduce((s, c) => s + n(c.monto), 0)));
  let ventasArr = $derived(ventas.filter(v => !v.anulada && new Date(v.fecha) >= new Date(periodoInicio)));
  let ganBruta = $derived(m(ventasArr.reduce((s, v) => s + n(v.ganancia), 0)));
  let gastosOp = $derived(m(ajustes.filter(a => a.cantidad < 0 && new Date(a.fecha) >= new Date(periodoInicio)).reduce((s, a) => s + n(a.costoPerdida), 0)));
  let ganNeta = $derived(m(ganBruta - gastosOp));
  let ganAcum = $derived(m(cierres.reduce((s, x) => s + n(x.ganancia), 0) + ganNeta - retiros.reduce((s, r) => s + n(r.monto), 0)));
  let patrimonio = $derived(m(capTotal + ganAcum));
  let disp = $derived(gananciaDisponible({ cfg, capital, ventas, compras, retiros, movCaja, ajustes, cierres, lotes, periodoInicio }));
  let movs = $derived(() => {
    const arr = [];
    if (n(cfg.capitalInicial) > 0) arr.push({ id: 'ci', fecha: cfg.periodoInicio, tipo: 'Capital inicial', monto: n(cfg.capitalInicial), nota: '' });
    capital.forEach(c => arr.push({ id: c.id, fecha: c.fecha, tipo: 'Aporte', monto: n(c.monto), nota: c.nota }));
    retiros.forEach(r => arr.push({ id: r.id, fecha: r.fecha, tipo: 'Retiro', monto: n(r.monto), nota: r.concepto }));
    return arr.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  });

  async function recargar() {
    const db = getDB();
    [capital, ventas, compras, retiros, movCaja, ajustes, cierres, lotes] = await Promise.all([
      listar('capital'), listar('ventas'), listar('compras'), listar('retiros'),
      listar('movCaja'), listar('ajustes'), listar('cierres'), listar('lotes')
    ]);
    const c = await db.config.get('cfg');
    cfg = c?.value || { capitalInicial: 0, periodoInicio: new Date().toISOString() };
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  async function registrarRetiro() {
    const monto = n(retiroForm.monto);
    const c = (retiroForm.concepto || '').trim();
    if (monto <= 0) return avisar('Monto invalido', 'bad');
    if (!c) return avisar('Concepto obligatorio', 'bad');
    if (monto > disp + 0.01) return avisar('Maximo ' + fmt(disp), 'bad');
    const pinOk = await pedirPIN();
    if (!pinOk) return;
    await guardar('retiros', { id: genId('r'), fecha: new Date().toISOString(), monto, concepto: c });
    await recargar();
    bus.emit('recargar');
    retiroForm = { monto: '', concepto: '' };
    avisar('Retiro registrado');
  }

  async function registrarAporte() {
    const monto = n(aporteForm.monto);
    if (monto <= 0) return avisar('Monto invalido', 'bad');
    await guardar('capital', { id: genId('k'), fecha: new Date().toISOString(), monto, nota: aporteForm.nota || '' });
    await recargar();
    bus.emit('recargar');
    aporteForm = { monto: '', nota: '' };
    avisar('Aporte registrado');
  }

  async function guardarCapInicial() {
    const val = n(capInicialStr);
    cfg.capitalInicial = val;
    const db = getDB();
    await db.config.put({ key: 'cfg', value: JSON.parse(JSON.stringify(cfg)) });
    capInicialStr = '';
    await recargar();
    bus.emit('recargar');
    avisar('Capital inicial guardado');
  }
</script>

<div class="modulo">
  <div class="bg-gradient-to-br from-purple to-[#5b21b6] text-white rounded-[var(--radius-lg)] p-5 text-center mb-4 shadow-[var(--color-shadow)]">
    <div class="flex items-center justify-center gap-1.5 text-xs opacity-90 mb-1">
      <Icono nombre="diamond" size={14} color="#fff" />
      Patrimonio Total
    </div>
    <div class="text-3xl font-extrabold my-1">{fmt(patrimonio)}</div>
    <div class="text-xs opacity-85">Capital {fmt(capTotal)} · Gan. acum. {fmt(ganAcum)}</div>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="chart" size={18} />
      Resumen contable
    </div>
    <div class="flex justify-between gap-2 py-2.5 border-b border-border text-sm">
      <span>Capital inicial</span><span>{fmt(cfg.capitalInicial || 0)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2.5 border-b border-border text-sm">
      <span>Aportes</span><span class="text-success">+{fmt(capital.reduce((s, c) => s + n(c.monto), 0))}</span>
    </div>
    <div class="flex justify-between gap-2 py-2.5 border-t border-text text-sm font-bold">
      <span>= CAPITAL</span><span class="text-primary">{fmt(capTotal)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2.5 border-b border-border text-sm">
      <span>Caja</span><span>{fmt(saldo)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2.5 border-b border-border text-sm">
      <span>Inventario</span><span>{fmt(valInv)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2.5 border-t border-text text-sm font-bold">
      <span>= ACTIVOS</span><span class="text-primary">{fmt(saldo + valInv)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2.5 border-b border-border text-sm">
      <span>Ganancia bruta</span><span class="text-success">{fmt(ganBruta)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2.5 border-b border-border text-sm">
      <span>Gastos operativos</span><span class="text-danger">-{fmt(gastosOp)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2.5 border-b border-border text-sm">
      <span>= Ganancia neta (periodo)</span><span>{fmt(ganNeta)}</span>
    </div>
    <div class="flex justify-between gap-2 py-3.5 bg-success/10 rounded-[var(--radius-md)] px-3 mt-3 text-sm font-extrabold">
      <span>DISPONIBLE PARA RETIRO</span>
      <span class="text-success text-base">{fmt(disp)}</span>
    </div>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-warning mb-4">
      <Icono nombre="dollar" size={18} />
      Retirar Ganancia
    </div>
    <input class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3" type="number" inputmode="decimal" step="0.01" placeholder="Monto" bind:value={retiroForm.monto} />
    <input class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3" type="text" placeholder="Concepto" bind:value={retiroForm.concepto} />
    <button class="w-full py-3.5 rounded-[var(--radius-md)] bg-warning text-white font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={registrarRetiro}>
      <Icono nombre="dollar" size={16} color="#fff" />
      Retirar Ganancia
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-success mb-4">
      <Icono nombre="plus" size={18} />
      Aportar Capital
    </div>
    <input class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3" type="number" inputmode="decimal" step="0.01" placeholder="Monto" bind:value={aporteForm.monto} />
    <input class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3" type="text" placeholder="Nota" bind:value={aporteForm.nota} />
    <button class="w-full py-3.5 rounded-[var(--radius-md)] bg-success text-white font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={registrarAporte}>
      <Icono nombre="plus" size={16} color="#fff" />
      Registrar Aporte
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="wallet" size={18} />
      Capital Inicial
    </div>
    <div class="text-xs text-muted mb-3">Actual: {fmt(cfg.capitalInicial || 0)}</div>
    <input class="w-full px-3.5 py-3.5 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3" type="number" inputmode="decimal" step="0.01" placeholder="Monto de capital inicial" bind:value={capInicialStr} />
    <button class="w-full py-3.5 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={guardarCapInicial}>
      <Icono nombre="check" size={16} color="#fff" />
      Guardar Capital Inicial
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="history" size={18} />
      Historial
    </div>
    {#if movs().length === 0}
      <div class="text-center text-muted py-8 text-sm">Sin movimientos</div>
    {:else}
      {#each movs() as m}
        <div class="flex justify-between items-center gap-2 py-3 border-b border-border">
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm">{m.tipo}</div>
            <div class="text-xs text-muted">{fmtFH(m.fecha)} {m.nota ? '· ' + m.nota : ''}</div>
          </div>
          <b class="flex-shrink-0 {m.tipo === 'Retiro' ? 'text-danger' : 'text-success'}">{m.tipo === 'Retiro' ? '-' : '+'}{fmt(m.monto)}</b>
        </div>
      {/each}
    {/if}
  </div>
</div>
