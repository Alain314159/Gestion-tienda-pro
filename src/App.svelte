<script>
  import { onMount, onDestroy } from 'svelte';
  import Icono from './core/Icono.svelte';
  import { modulos } from './core/registro.js';
  import {
    ui, avisar, aplicarTema, alternarTema, cerrarConfirm, cerrarPrompt
  } from './core/store.svelte.js';
  import { iniciarCfg, app } from './core/appstate.svelte.js';

  let masAbierto = $state(false);

  onMount(async () => {
    aplicarTema();
    await iniciarCfg();
    if (!ui.activo && modulos.length) ui.activo = modulos[0].id;
  });

  $effect(() => {
    const tit = (app.cfg?.nombre || 'Tienda Pro') + (ui.activo ? ' · ' + (modulos.find(m => m.id === ui.activo)?.nombre || '') : '');
    document.title = tit;
  });

  let activo = $derived(modulos.find(m => m.id === ui.activo) || modulos[0] || null);
  let navMods = $derived(modulos.filter(m => m.grupo !== 'utilidades' || m.id === 'ajustes'));

  async function actualizar() {
    if (typeof ui._updateSW === 'function') {
      ui.actualizar = false;
      ui._updateSW(true);
    }
  }

  async function abrirMas() { masAbierto = true; }
  function cerrarMas() { masAbierto = false; }
  function irA(id) {
    ui.activo = id;
    masAbierto = false;
  }
</script>

<svelte:head>
  <title>{app.cfg?.nombre || 'Tienda Pro'}</title>
</svelte:head>

<header class="hdr">
  <div class="hdr-in">
    <Icono nombre={activo?.icono || 'home'} size={22} />
    <h1>{activo?.nombre || app.cfg?.nombre || 'Tienda Pro'}</h1>
    <button class="hbtn" onclick={alternarTema} aria-label="Tema">
      <Icono nombre={ui.tema === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
    <button class="hbtn" onclick={abrirMas} aria-label="Más">
      <Icono nombre="mas2" size={18} />
    </button>
  </div>
</header>

{#if ui.offline}
  <div class="banner off">Sin conexión · trabajando con datos locales</div>
{/if}
{#if ui.actualizar}
  <button class="banner upd" onclick={actualizar}>Nueva versión disponible · tocar para actualizar</button>
{/if}

<main>
  {#if activo}
    {@const Activo = activo?.Componente}
    {#if Activo}
      <Activo />
    {/if}
  {:else}
    <div class="empty">No hay módulos registrados.</div>
  {/if}
</main>

<nav class="nav">
  {#each navMods as m}
    <button class:on={ui.activo === m.id} onclick={() => irA(m.id)}>
      <Icono nombre={m.icono || 'home'} size={22} />
      <span>{m.nombre}</span>
    </button>
  {/each}
</nav>

{#if masAbierto}
  <div class="mask" onclick={cerrarMas} onkeydown={(e) => e.key === 'Escape' && cerrarMas()} role="dialog">
    <div class="sheet" onclick={(e) = onkeydown={(e) => (e.key === "Enter" || e.key === " ") && e.currentTarget.click()}> e.stopPropagation()} role="document">
      <div class="tit">Más opciones</div>
      <div class="list">
        {#each modulos as m}
          <button class="item" onclick={() => irA(m.id)}>
            <Icono nombre={m.icono || 'home'} size={20} />
            <div>
              <div class="t">{m.nombre}</div>
              <div class="s">{m.grupo || 'negocio'}</div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

{#if ui.confirm}
  <div class="mask cent" onclick={() => cerrarConfirm(false)} onkeydown={(e) => e.key === 'Escape' && cerrarConfirm(false)} role="dialog">
    <div class="modal" onclick={(e) = onkeydown={(e) => (e.key === "Enter" || e.key === " ") && e.currentTarget.click()}> e.stopPropagation()} role="alertdialog">
      <div class="tit"><Icono nombre="alert" size={20} /> {ui.confirm.titulo}</div>
      <p class="mut" style="margin-bottom:16px">{ui.confirm.msg}</p>
      <div class="row">
        <button class="btn sec" onclick={() => cerrarConfirm(false)}>Cancelar</button>
        <button class="btn dgr" onclick={() => cerrarConfirm(true)}>Confirmar</button>
      </div>
    </div>
  </div>
{/if}

{#if ui.prompt}
  <div class="mask cent" onclick={() => cerrarPrompt(false)} onkeydown={(e) => e.key === 'Escape' && cerrarPrompt(false)} role="dialog">
    <div class="modal" onclick={(e) = onkeydown={(e) => (e.key === "Enter" || e.key === " ") && e.currentTarget.click()}> e.stopPropagation()} role="dialog">
      <div class="tit"><Icono nombre="lock" size={20} /> {ui.prompt.titulo}</div>
      <p class="mut">{ui.prompt.msg}</p>
      <input
        class="inp"
        type={ui.prompt.titulo.toLowerCase().includes('pin') ? 'password' : 'text'}
        bind:value={ui.prompt.valor}
        onkeydown={(e) => e.key === 'Enter' && cerrarPrompt(true)}
        style="margin:12px 0"
      />
      <div class="row">
        <button class="btn sec" onclick={() => cerrarPrompt(false)}>Cancelar</button>
        <button class="btn ok" onclick={() => cerrarPrompt(true)}>Aceptar</button>
      </div>
    </div>
  </div>
{/if}

{#if ui.toast}
  <div class="toast" class:ok={ui.toast.tipo === 'ok'} class:dg={ui.toast.tipo === 'dg'}>{ui.toast.msg}</div>
{/if}
