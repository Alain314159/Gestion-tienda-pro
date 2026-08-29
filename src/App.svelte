<script>
import { get } from 'svelte/store';
import { ui, setActivo, cerrarConfirm, cerrarPrompt } from './core/store.js';
import { app } from './core/appstate.js';
import { bus } from './core/bus.js';
import { onMount } from 'svelte';

export let modulos = [];
export let navMods = [];

let activo = null;
let masAbierto = false;
let offline = false;

onMount(() => {
    const unsubscribe = ui.subscribe(value => {
        activo = value.activo;
        masAbierto = value.masAbierto;
        offline = value.offline;
    });
    return unsubscribe;
});

function irA(id) {
    setActivo(id);
    masAbierto = false;
}

function cerrarMas() {
    masAbierto = false;
    ui.update(u => ({ ...u, masAbierto: false }));
}
</script>

{#if offline}
    <div class="offline-banner">Sin conexión · trabajando con datos locales</div>
{/if}

{#if activo}
    {@const Activo = activo?.Componente}
    {#if Activo}
        <svelte:component this={Activo} />
    {/if}
{:else}
    <div class="empty-state">No hay módulos registrados.</div>
{/if}

<nav class="main-nav">
    {#each navMods as m}
        <button class="nav-btn" on:click={() => irA(m.id)}>{m.nombre}</button>
    {/each}
    <button class="nav-btn more-btn" on:click={() => { masAbierto = !masAbierto; ui.update(u => ({ ...u, masAbierto })); }}>
        ⋮
    </button>
</nav>

{#if masAbierto}
    <div class="modal-overlay" on:click={cerrarMas} on:keydown={(e) => e.key === 'Escape' && cerrarMas()} role="dialog" tabindex="-1">
        <div class="modal-content" on:click|stopPropagation>
            <h3>Más opciones</h3>
            {#each modulos as m}
                <button class="modal-item" on:click={() => irA(m.id)}>
                    {m.nombre}
                    <span class="badge">{m.grupo || 'negocio'}</span>
                </button>
            {/each}
        </div>
    </div>
{/if}

{#if $ui.confirm}
    <div class="modal-overlay" on:click={() => cerrarConfirm(false)} on:keydown={(e) => e.key === 'Escape' && cerrarConfirm(false)} role="dialog" tabindex="-1">
        <div class="modal-content confirm-dialog" on:click|stopPropagation>
            <h3>{$ui.confirm.titulo}</h3>
            <p>{$ui.confirm.msg}</p>
            <div class="dialog-actions">
                <button class="btn-secondary" on:click={() => cerrarConfirm(false)}>Cancelar</button>
                <button class="btn-primary" on:click={() => cerrarConfirm(true)}>Confirmar</button>
            </div>
        </div>
    </div>
{/if}

{#if $ui.prompt}
    <div class="modal-overlay" on:click={() => cerrarPrompt(false)} on:keydown={(e) => e.key === 'Escape' && cerrarPrompt(false)} role="dialog" tabindex="-1">
        <div class="modal-content prompt-dialog" on:click|stopPropagation>
            <h3>{$ui.prompt.titulo}</h3>
            <p>{$ui.prompt.msg}</p>
            <input type="text" bind:value={$ui.prompt.valor} on:keydown={(e) => e.key === 'Enter' && cerrarPrompt(true)} />
            <div class="dialog-actions">
                <button class="btn-secondary" on:click={() => cerrarPrompt(false)}>Cancelar</button>
                <button class="btn-primary" on:click={() => cerrarPrompt(true)}>Aceptar</button>
            </div>
        </div>
    </div>
{/if}

{#if $ui.toast}
    <div class="toast { $ui.toast.tipo }">
        {$ui.toast.msg}
    </div>
{/if}

<style>
.offline-banner { background: #f59e0b; color: #fff; padding: 8px; text-align: center; font-size: 14px; }
.empty-state { padding: 40px; text-align: center; color: #6b7280; }
.main-nav { display: flex; gap: 4px; padding: 8px; background: #f3f4f6; overflow-x: auto; border-bottom: 1px solid #e5e7eb; }
.nav-btn { padding: 8px 16px; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; }
.nav-btn:hover { background: #e5e7eb; }
.more-btn { margin-left: auto; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: #fff; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto; }
.modal-item { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 10px 12px; border: none; background: transparent; border-radius: 6px; cursor: pointer; }
.modal-item:hover { background: #f3f4f6; }
.badge { font-size: 11px; background: #e5e7eb; padding: 2px 10px; border-radius: 12px; color: #4b5563; }
.dialog-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.btn-primary { background: #3b82f6; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.btn-secondary { background: #e5e7eb; color: #1f2937; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; color: #fff; z-index: 2000; animation: slideUp 0.3s ease; }
.toast.info { background: #3b82f6; }
.toast.ok { background: #10b981; }
.toast.error { background: #ef4444; }
@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
.dark .offline-banner { background: #d97706; }
.dark .main-nav { background: #1f2937; border-bottom-color: #374151; }
.dark .nav-btn:hover { background: #374151; }
.dark .modal-content { background: #1f2937; color: #e5e7eb; }
.dark .modal-item:hover { background: #374151; }
.dark .badge { background: #374151; color: #9ca3af; }
.dark .btn-secondary { background: #374151; color: #e5e7eb; }
.dark .toast.info { background: #2563eb; }
.dark .toast.ok { background: #059669; }
.dark .toast.error { background: #dc2626; }
</style>
