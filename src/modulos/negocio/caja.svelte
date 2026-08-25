<script>
  import { onMount } from 'svelte';
  import { getDB } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, confirmar, pedirPIN } from '../../core/store.svelte.js';
  import { dinero, app } from '../../core/appstate.svelte.js';
  import { n, fmtCant, fmtFH, fmtFecha } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  export const manifiesto = {
    id: 'caja',
    nombre: 'Caja',
    icono: 'wallet',
    grupo: 'negocio',
    orden: 3,
    tablas: {
      movsCaja: '++id, fecha, tipo',
      arqueos: '++id, fecha'
    }
  };

  let movs = $state([]);
  let arqueos = $state([]);
  let ventas = $state([]);
  let compras = $state([]);
  let arqueoAbierto = $state(false);
  let fisico = $state('');
  let movAbierto = $state(false);
  let movForm = $state({ tipo: 'aporte', concepto: '', monto: '' });

  async function cargar() {
    const db = getDB();
    movs = (await db.movsCaja.toArray()).sort((a, b) => b.fecha - a.fecha);
    arqueos = (await db.arqueos.toArray()).sort((a, b) => b.fecha - a.fecha);
    ventas = await db.ventas.toArray();
    compras = await db.compras.toArray();
  }

  let capitalInicial = $derived(() => n(app.cfg?.capitalInicial));
  let aportesTotal = $derived(() => movs.filter(m => m.tipo === 'aporte').reduce((a, m) => a + n(m.monto), 0));
  let retirosTotal = $derived(() => movs.filter(m => m.tipo === 'retiro').reduce((a, m) => a + n(m.monto), 0));
  let ventasContadoTotal = $derived(() => ventas.filter(v => v.estado === 'activa').reduce((a, v) => a + n(v.total), 0));
  let comprasTotal = $derived(() => compras.reduce((a, c) => a + n(c.total), 0));
  let arqueoNeto = $derived(() => arqueos.reduce((a, ar) => a + n(ar.diferencia), 0));
  let saldoCaja = $derived(() =>
    capitalInicial() + aportesTotal() + ventasContadoTotal() - comprasTotal() - retirosTotal() + arqueoNeto()
  );

  function abrirArqueo() {
    fisico = '';
    arqueoAbierto = true;
  }

  let diffArqueo = $derived(() => n(fisico) - saldoCaja());

  async function registrarArqueo() {
    if (fisico === '' || isNaN(n(fisico))) { avisar('Monto físico inválido', 'dg'); return; }
    const ok = await pedirPIN();
    if (!ok) { avisar('PIN incorrecto', 'dg'); return; }
    const db = getDB();
    const diff = diffArqueo();
    await db.arqueos.add({
      fecha: Date.now(),
      sistema: saldoCaja(),
      fisico: n(fisico),
      diferencia: diff
    });
    if (diff !== 0) {
      await db.movsCaja.add({
        fecha: Date.now(),
        tipo: diff > 0 ? 'sobrante' : 'faltante',
        concepto: 'Arqueo de caja',
        monto: Math.abs(diff)
      });
    }
    bus.emitir('arqueo:registrado', {});
    avisar(diff === 0 ? 'Arqueo cuadrado' : `Arqueo registrado (${diff > 0 ? 'sobrante' : 'faltante'})`, diff === 0 ? 'ok' : 'wn');
    arqueoAbierto = false;
    await cargar();
  }

  function abrirMov(tipo) {
    movForm = { tipo, concepto: '', monto: '' };
    movAbierto = true;
  }

  async function guardarMov() {
    if (n(movForm.monto) <= 0) { avisar('Monto inválido', 'dg'); return; }
    if (!movForm.concepto.trim()) { avisar('Concepto requerido', 'dg'); return; }
    const db = getDB();
    await db.movsCaja.add({
      fecha: Date.now(),
      tipo: movForm.tipo,
      concepto: movForm.concepto.trim(),
      monto: n(movForm.monto)
    });
    avisar('Movimiento registrado', 'ok');
    movAbierto = false;
    await cargar();
  }

  onMount(cargar);

  bus.on('venta:registrada', cargar);
  bus.on('venta:anulada', cargar);
  bus.on('compra:registrada', cargar);
  bus.on('compra:editada', cargar);
</script>

<div class="modulo">
  <div class="card">
    <div class="tit">Saldo en Caja</div>
    <div class="big" class:neg={saldoCaja() < 0} class:pos={saldoCaja() >= 0}>
      {dinero(saldoCaja())}
    </div>
    {#if saldoCaja() < 0}
      <div class="mut" style="color:var(--dg);margin-top:0.25rem">⚠ Caja en negativo</div>
    {/if}
    <div class="mut" style="margin-top:0.5rem;font-size:0.85rem">
      El saldo es acumulativo (incluye todo el historial).
    </div>
  </div>

  <div class="card">
    <div class="tit">Desglose</div>
    <div class="list">
      <div class="item"><div class="t">Capital inicial</div><div class="pos">+{dinero(capitalInicial())}</div></div>
      <div class="item"><div class="t">Aportes</div><div class="pos">+{dinero(aportesTotal())}</div></div>
      <div class="item"><div class="t">Ventas</div><div class="pos">+{dinero(ventasContadoTotal())}</div></div>
      <div class="item"><div class="t">Compras</div><div class="neg">-{dinero(comprasTotal())}</div></div>
      <div class="item"><div class="t">Retiros</div><div class="neg">-{dinero(retirosTotal())}</div></div>
      <div class="item"><div class="t">Ajustes de arqueo</div><div class={arqueoNeto() >= 0 ? 'pos' : 'neg'}>{arqueoNeto() >= 0 ? '+' : ''}{dinero(arqueoNeto())}</div></div>
    </div>
    <hr class="sep" />
    <div class="row" style="justify-content:space-between;font-weight:700;font-size:1.05rem">
      <span>= SALDO</span>
      <span class={saldoCaja() >= 0 ? 'pos' : 'neg'}>{dinero(saldoCaja())}</span>
    </div>
  </div>

  <div class="card">
    <div class="tit">Acciones</div>
    <div class="row">
      <button class="btn ok sm" on:click={() => abrirMov('aporte')}>
        <Icono nombre="plus" size={16} /> Aporte
      </button>
      <button class="btn dgr sm" on:click={() => abrirMov('retiro')}>
        <Icono nombre="minus" size={16} /> Retiro
      </button>
      <button class="btn sec sm" on:click={abrirArqueo}>
        <Icono nombre="check" size={16} /> Arqueo
      </button>
    </div>
  </div>

  <div class="card">
    <div class="tit">Movimientos recientes</div>
    {#if movs.length === 0}
      <div class="empty"><Icono nombre="archive" size={48} /><p>Sin movimientos</p></div>
    {:else}
      <div class="list">
        {#each movs.slice(0, 20) as m}
          <div class="item">
            <div>
              <div class="t">{m.concepto}</div>
              <div class="s">{fmtFH(m.fecha)} · {m.tipo}</div>
            </div>
            <div class={m.tipo === 'aporte' || m.tipo === 'sobrante' ? 'pos' : 'neg'} style="font-weight:600">
              {m.tipo === 'aporte' || m.tipo === 'sobrante' ? '+' : '-'}{dinero(m.monto)}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if arqueoAbierto}
    <div class="mask cent" on:click={() => arqueoAbierto = false} on:keydown={(e) => e.key === 'Escape' && (arqueoAbierto = false)} role="dialog">
      <div class="modal" on:click={(e) => e.stopPropagation()} role="dialog">
        <div class="tit"><Icono nombre="check" size={20} /> Arqueo de Caja</div>
        <p class="mut">Cuenta el dinero físico. Si es menor al sistema = faltante; si es mayor = sobrante.</p>
        <div class="lbl">
          El sistema dice: <strong>{dinero(saldoCaja())}</strong>
        </div>
        <label class="lbl">
          Tú cuentas (físico)
          <input class="inp" type="number" step="0.01" bind:value={fisico} placeholder="0.00" />
        </label>
        {#if fisico !== '' && !isNaN(n(fisico))}
          <div class="row" style="justify-content:space-between;margin-top:0.5rem;font-weight:600">
            <span>Diferencia</span>
            <span class={diffArqueo() === 0 ? 'pos' : diffArqueo() > 0 ? 'pos' : 'neg'}>
              {diffArqueo() === 0 ? '✓ Cuadre perfecto' : diffArqueo() > 0 ? `SOBRANTE +${dinero(diffArqueo())}` : `FALTANTE ${dinero(diffArqueo())}`}
            </span>
          </div>
        {/if}
        <div class="row" style="margin-top:1rem">
          <button class="btn sec" on:click={() => arqueoAbierto = false}>Cancelar</button>
          <button class="btn ok" style="flex:1" on:click={registrarArqueo}>
            <Icono nombre="save" size={16} /> Registrar Arqueo
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if movAbierto}
    <div class="mask cent" on:click={() => movAbierto = false} on:keydown={(e) => e.key === 'Escape' && (movAbierto = false)} role="dialog">
      <div class="modal" on:click={(e) => e.stopPropagation()} role="dialog">
        <div class="tit">
          <Icono nombre={movForm.tipo === 'aporte' ? 'plus' : 'minus'} size={20} />
          {movForm.tipo === 'aporte' ? 'Aportar Capital' : 'Retirar'}
        </div>
        <label class="lbl">
          Concepto
          <input class="inp" type="text" bind:value={movForm.concepto} placeholder="Ej: Aporte de socio / Pago proveedor" />
        </label>
        <label class="lbl">
          Monto
          <input class="inp" type="number" step="0.01" bind:value={movForm.monto} placeholder="0.00" />
        </label>
        <div class="row" style="margin-top:1rem">
          <button class="btn sec" on:click={() => movAbierto = false}>Cancelar</button>
          <button class="btn ok" style="flex:1" on:click={guardarMov}>
            <Icono nombre="save" size={16} /> Guardar
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .big.neg { color: var(--dg); }
  .big.pos { color: var(--ok); }
</style>
