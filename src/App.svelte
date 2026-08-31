<script>
  import { onMount } from 'svelte';
  import { ui, alternarTema, cerrarConfirm, cerrarPrompt } from './core/state.svelte.js';
  import { cargarModulos, navMods, modulos } from './core/registro.js';
  import Icono from './core/Icono.svelte';

  let cargando = $state(true);
  let activo = $state(null);

  onMount(async () => {
    await cargarModulos();
    cargando = false;
    // Activar inicio por defecto
    const inicio = modulos.find(m => m.id === 'inicio');
    if (inicio) activo = inicio;
  });

  function irA(mod) {
    activo = mod;
    ui.masAbierto = false;
    try { history.pushState({ sec: mod.id }, '', '#' + mod.id); } catch (e) {}
  }

  function esActivo(id) {
    return activo?.id === id;
  }

  $effect(() => {
    if (ui.confirm || ui.prompt) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });
</script>

{#if ui.offline}
  <div class="fixed top-0 left-0 right-0 z-[120] bg-danger text-white text-center text-xs font-bold py-1.5 no-print">
    Sin conexion — los datos se guardan localmente
  </div>
{/if}

{#if cargando}
  <div class="flex items-center justify-center h-screen text-muted">
    <div class="flex flex-col items-center gap-3">
      <Icono nombre="store" size={48} color="#2196F3" />
      <p class="font-bold">Cargando Tienda Pro...</p>
    </div>
  </div>
{:else}
  <header class="sticky top-0 z-50 mx-2.5 bg-primary text-white rounded-b-[var(--radius-lg)] px-4 py-3.5 flex justify-between items-center shadow-[0_4px_14px_rgba(33,150,243,0.35)] no-print">
    <h1 class="text-lg font-extrabold flex items-center gap-1.5">
      <Icono nombre="store" size={20} color="#fff" />
      Tienda Pro
    </h1>
    <div class="flex gap-1.5">
      <button class="flex items-center gap-1.5 bg-white/0 hover:bg-white/20 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors" onclick={alternarTema}>
        <Icono nombre={ui.tema === 'dark' ? 'sun' : 'moon'} size={18} color="#fff" />
        <span class="hidden sm:inline">{ui.tema === 'dark' ? 'Claro' : 'Oscuro'}</span>
      </button>
    </div>
  </header>

  <main class="px-4 pt-5 pb-32 max-w-2xl mx-auto">
    {#if activo}
      <div class="animate-fade-up">
        <activo.Componente />
      </div>
    {:else}
      <div class="text-center text-muted py-12">No hay modulos registrados.</div>
    {/if}
  </main>

  <!-- Navegacion inferior -->
  <nav class="fixed left-2.5 right-2.5 bottom-2.5 z-50 bg-card rounded-[var(--radius-lg)] shadow-[0_-2px_16px_rgba(0,0,0,0.12)] flex p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] no-print">
    {#each navMods as m}
      <button
        class="flex-1 flex flex-col items-center justify-center gap-0.5 bg-transparent border-none cursor-pointer py-2 rounded-xl font-bold text-xs transition-all min-w-0 {esActivo(m.id) ? 'text-primary bg-primary/10' : 'text-muted'}"
        onclick={() => irA(m)}
      >
        <Icono nombre={m.icono} size={22} />
        <span class="block text-[0.68rem] leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{m.nombre}</span>
      </button>
    {/each}
    <button
      class="flex-1 flex flex-col items-center justify-center gap-0.5 bg-transparent border-none cursor-pointer py-2 rounded-xl font-bold text-xs transition-all min-w-0 {ui.masAbierto ? 'text-primary bg-primary/10' : 'text-muted'}"
      onclick={() => ui.masAbierto = true}
    >
      <Icono nombre="grid" size={22} />
      <span class="block text-[0.68rem] leading-tight">Mas</span>
    </button>
  </nav>

  <!-- Sheet "Mas" -->
  {#if ui.masAbierto}
    <div class="fixed inset-0 bg-black/50 z-[90] no-print" onclick={() => ui.masAbierto = false}></div>
    <div class="fixed left-0 right-0 bottom-0 z-[95] bg-card rounded-t-[var(--radius-lg)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] animate-slide-up no-print">
      <div class="w-10 h-1 bg-border rounded-full mx-auto mb-3"></div>
      <div class="grid grid-cols-2 gap-3">
        {#each modulos as m}
          <button
            class="flex items-center gap-3 bg-background border-none rounded-[var(--radius-md)] p-3.5 cursor-pointer text-text font-bold text-sm hover:bg-border/50 transition-colors"
            onclick={() => irA(m)}
          >
            <Icono nombre={m.icono} size={22} />
            {m.nombre}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Modal Confirm -->
  {#if ui.confirm}
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 no-print" onclick={() => cerrarConfirm(false)} role="dialog" tabindex="-1">
      <div class="bg-card rounded-[var(--radius-lg)] p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-pop" onclick={(e) => e.stopPropagation()}>
        <h3 class="font-extrabold text-primary text-lg mb-2">{ui.confirm.titulo}</h3>
        <p class="text-sm mb-4">{ui.confirm.msg}</p>
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-bold text-sm" onclick={() => cerrarConfirm(false)}>Cancelar</button>
          <button class="flex-1 py-2.5 rounded-[var(--radius-md)] bg-danger text-white font-bold text-sm" onclick={() => cerrarConfirm(true)}>Confirmar</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Modal Prompt -->
  {#if ui.prompt}
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 no-print" onclick={() => cerrarPrompt(false)} role="dialog" tabindex="-1">
      <div class="bg-card rounded-[var(--radius-lg)] p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-pop" onclick={(e) => e.stopPropagation()}>
        <h3 class="font-extrabold text-primary text-lg mb-1">{ui.prompt.titulo}</h3>
        {#if ui.prompt.msg}
          <p class="text-xs text-muted mb-3">{ui.prompt.msg}</p>
        {/if}
        <input
          type="text"
          class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text text-base outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(33,150,243,0.15)] mb-3"
          bind:value={ui.prompt.valor}
          onkeydown={(e) => e.key === 'Enter' && cerrarPrompt(true)}
        />
        <div class="flex gap-2">
          <button class="flex-1 py-2.5 rounded-[var(--radius-md)] border border-border bg-transparent text-text font-bold text-sm" onclick={() => cerrarPrompt(false)}>Cancelar</button>
          <button class="flex-1 py-2.5 rounded-[var(--radius-md)] bg-primary text-white font-bold text-sm" onclick={() => cerrarPrompt(true)}>Aceptar</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Toast -->
  {#if ui.toast}
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-full text-white text-sm font-bold shadow-[0_4px_14px_rgba(0,0,0,0.3)] flex items-center gap-2 max-w-[90%] animate-fade-up no-print
      {ui.toast.tipo === 'ok' ? 'bg-success' : ui.toast.tipo === 'bad' ? 'bg-danger' : ui.toast.tipo === 'warn' ? 'bg-warning' : 'bg-gray-900'}">
      {ui.toast.msg}
    </div>
  {/if}
{/if}
