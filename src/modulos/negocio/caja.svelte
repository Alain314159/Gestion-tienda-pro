<script module>
  export const manifiesto = {
    id: 'caja',
    nombre: 'Caja',
    icono: 'wallet',
    grupo: 'negocio',
    orden: 5,
    tablas: { arqueos: '++id, fecha', movCaja: '++id, fecha, tipo' }
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { getDB, listar, leerConfig } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar } from '../../core/state.svelte.js';
  import { n, m, fmt, fmtFH, saldoCaja, movimientosCaja } from '../../core/util.js';
  import { CajaService } from '../../services/CajaService.js';
  import Icono from '../../core/Icono.svelte';

  let cfg = $state({});
  let capital = $state([]);
  let ventas = $state([]);
  let compras = $state([]);
  let retiros = $state([]);
  let movCaja = $state([]);
  let arqueos = $state([]);

  let arqueoForm = $state({ monto: '', nota: '' });
  let paginaMovs = $state(1);
  const itemsPorPagina = 20;

  let saldo = $derived(saldoCaja({ cfg, capital, ventas, compras, retiros, movCaja }));
  let aportesTotal = $derived(m(capital.reduce((s, c) => s + n(c.monto), 0)));
  let ventasTotal = $derived(m(ventas.filter(v => !v.anulada).reduce((s, v) => s + n(v.total), 0)));
  let comprasTotal = $derived(m(compras.filter(c => !c.anulada).reduce((s, c) => s + n(c.total), 0)));
  let retirosTotal = $derived(m(retiros.reduce((s, r) => s + n(r.monto), 0)));
  let arqueoNeto = $derived(m(movCaja.filter(mv => mv.concepto && mv.concepto.toLowerCase().includes('arqueo')).reduce((s, mv) => mv.tipo === 'ingreso' ? s + n(mv.monto) : s - n(mv.monto), 0)));
  let movs = $derived(movimientosCaja({ cfg, capital, ventas, compras, retiros, movCaja }));
  let movsPaginados = $derived(movs.slice((paginaMovs - 1) * itemsPorPagina, paginaMovs * itemsPorPagina));
  let totalPaginasMovs = $derived(Math.max(1, Math.ceil(movs.length / itemsPorPagina)));
  let arqueoPreview = $derived((() => {
    if (arqueoForm.monto === '' || arqueoForm.monto === null || arqueoForm.monto === undefined) return null;
    const monto = n(arqueoForm.monto);
    const sys = saldo;
    const diff = monto - sys;
    const tipo = Math.abs(diff) < 0.01 ? 'cuadre' : (diff > 0 ? 'sobrante' : 'faltante');
    return { fisico: monto, sistema: sys, diff: Math.abs(diff), tipo };
  })());

  async function recargar() {
    [capital, ventas, compras, retiros, movCaja, arqueos] = await Promise.all([
      listar('capital'), listar('ventas'), listar('compras'), listar('retiros'), listar('movCaja'), listar('arqueos')
    ]);
    cfg = await leerConfig('cfg') || { capitalInicial: 0 };
  }

  onMount(() => {
    recargar();
    const off = bus.on('recargar', recargar);
    return () => off();
  });

  async function registrarArqueo() {
    const monto = n(arqueoForm.monto);
    if (monto < 0 || arqueoForm.monto === '') return avisar('Monto invalido', 'bad');

    try {
      const { diff } = await CajaService.registrarArqueo({
        montoFisico: monto, saldoSistema: saldo, nota: arqueoForm.nota
      });
      arqueoForm = { monto: '', nota: '' };
      await recargar();
      bus.emit('recargar');
      if (Math.abs(diff) < 0.01) {
        avisar('Cuadre perfecto');
      } else {
        avisar((diff > 0 ? 'Sobrante ' : 'Faltante ') + fmt(Math.abs(diff)), diff > 0 ? 'warn' : 'bad');
      }
    } catch (e) {
      avisar(e.message, 'bad');
    }
  }
</script>

<div class="modulo">
  <div class="{saldo < 0 ? 'bg-gradient-to-br from-danger to-[#7f1d1d]' : 'bg-gradient-to-br from-primary to-[#1e3a8a]'} text-white rounded-[var(--radius-lg)] p-5 text-center mb-3 shadow-[var(--color-shadow)]">
    <div class="flex items-center justify-center gap-1.5 text-xs opacity-90 mb-1">
      <Icono nombre="wallet" size={14} color="#fff" />
      Saldo en Caja
    </div>
    <div class="text-3xl font-extrabold my-0.5">{fmt(saldo)}</div>
    {#if saldo < 0}<div class="text-xs opacity-85">Caja en negativo</div>{/if}
  </div>

  <div class="bg-primary/10 border-l-4 border-primary rounded-[var(--radius-md)] p-3 mb-3 text-sm text-primary">
    El saldo de caja es <b>acumulativo</b> (incluye todo el historial). El cierre de periodo solo reinicia los contadores de ventas, compras y ganancia del dashboard.
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="chart" size={18} />
      Desglose
    </div>
    <div class="flex justify-between gap-2 py-2 border-b border-border text-sm">
      <span>Capital inicial</span><span class="text-success">+{fmt(cfg.capitalInicial || 0)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2 border-b border-border text-sm">
      <span>Aportes</span><span class="text-success">+{fmt(aportesTotal)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2 border-b border-border text-sm">
      <span>Ventas contado</span><span class="text-success">+{fmt(ventasTotal)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2 border-b border-border text-sm">
      <span>Compras</span><span class="text-danger">-{fmt(comprasTotal)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2 border-b border-border text-sm">
      <span>Retiros</span><span class="text-danger">-{fmt(retirosTotal)}</span>
    </div>
    <div class="flex justify-between gap-2 py-2 border-b border-border text-sm">
      <span>Ajustes arqueo</span><span class={arqueoNeto >= 0 ? 'text-success' : 'text-danger'}>{arqueoNeto >= 0 ? '+' : ''}{fmt(arqueoNeto)}</span>
    </div>
    <div class="flex justify-between gap-2 py-3 border-t-2 border-text font-extrabold text-base">
      <span>= SALDO</span><span class="text-primary">{fmt(saldo)}</span>
    </div>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="search" size={18} />
      Arqueo de Caja
    </div>
    <div class="bg-primary/10 border-l-4 border-primary rounded-[var(--radius-md)] p-3 mb-3 text-sm text-primary">
      Cuenta el dinero fisico y escribe lo que tienes. Si es MENOR que el sistema = faltante; si es MAYOR = sobrante.
    </div>
    <div class="flex justify-between gap-2 py-1 text-sm mb-2">
      <span>El sistema dice:</span><b class="text-primary">{fmt(saldo)}</b>
    </div>
    <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2" type="number" inputmode="decimal" step="0.01" placeholder="Monto que contaste fisicamente" bind:value={arqueoForm.monto} />
    {#if arqueoPreview}
      <div class="rounded-[var(--radius-md)] p-3 mb-2 font-extrabold text-sm {arqueoPreview.tipo === 'cuadre' ? 'bg-success/10 text-success' : arqueoPreview.tipo === 'sobrante' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}">
        Tu cuentas: {fmt(arqueoPreview.fisico)} · Diferencia:
        {#if arqueoPreview.tipo === 'cuadre'}Cuadre perfecto ✓
        {:else if arqueoPreview.tipo === 'sobrante'}SOBRANTE +{fmt(arqueoPreview.diff)}
        {:else}FALTANTE -{fmt(arqueoPreview.diff)}{/if}
      </div>
    {/if}
    <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-2" type="text" placeholder="Nota (opcional)" bind:value={arqueoForm.nota} />
    <button class="w-full py-3 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm active:scale-[0.97] transition-transform" onclick={registrarArqueo}>
      <Icono nombre="check" size={16} color="#fff" />
      Registrar Arqueo
    </button>
  </div>

  <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)]">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-3">
      <Icono nombre="history" size={18} />
      Movimientos recientes
    </div>
    {#if movsPaginados.length === 0}
      <div class="text-center text-muted py-6 text-sm">Sin movimientos</div>
    {:else}
      {#each movsPaginados as mv}
        <div class="flex justify-between items-center gap-2 py-2.5 border-b border-border">
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm">{mv.concepto}</div>
            <div class="text-xs text-muted">{fmtFH(mv.fecha)}</div>
          </div>
          <b class="flex-shrink-0 {mv.tipo === 'ingreso' ? 'text-success' : 'text-danger'}">{mv.tipo === 'ingreso' ? '+' : '-'}{fmt(mv.monto)}</b>
        </div>
      {/each}
      {#if totalPaginasMovs > 1}
        <div class="flex justify-center items-center gap-2 mt-3 text-sm">
          <button class="px-3 py-1 rounded-md border border-border bg-card disabled:opacity-30" onclick={() => paginaMovs--} disabled={paginaMovs <= 1}>←</button>
          <span class="text-muted">{paginaMovs} / {totalPaginasMovs}</span>
          <button class="px-3 py-1 rounded-md border border-border bg-card disabled:opacity-30" onclick={() => paginaMovs++} disabled={paginaMovs >= totalPaginasMovs}>→</button>
        </div>
      {/if}
    {/if}
  </div>
</div>
