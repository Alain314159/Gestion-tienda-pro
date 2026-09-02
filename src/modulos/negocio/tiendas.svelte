<script module>
  export const manifiesto = {
    id: 'tiendas',
    nombre: 'Tiendas',
    icono: 'store',
    grupo: 'negocio',
    orden: -1,
    tablas: { tiendas: '++id, nombre' }
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { getDB, listar, guardar, leerConfig } from '../../core/db.js';
  import { avisar, preguntar } from '../../core/state.svelte.js';
  import { genId, nowLocal } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  let tiendas = $state([]);
  let tiendaActiva = $state(null);
  let form = $state({ nombre: '', clave: '' });

  async function recargar() {
    tiendas = await listar('tiendas');
    tiendaActiva = await leerConfig('tiendaActiva');
  }

  onMount(() => { recargar(); });

  async function crearTienda() {
    if (!form.nombre.trim()) return avisar('Nombre obligatorio', 'bad');
    const t = { id: genId('t'), nombre: form.nombre.trim(), clave: form.clave.trim(), creada: nowLocal().iso, fechaLocal: nowLocal().local };
    await guardar('tiendas', t);
    await activarTienda(t);
    form = { nombre: '', clave: '' };
    await recargar();
    avisar('Tienda creada');
  }

  async function activarTienda(t) {
    await guardar('config', { key: 'tiendaActiva', value: t.id });
    tiendaActiva = t.id;
    avisar(`Activada: ${t.nombre}`);
  }

  async function accederTienda(t) {
    if (t.clave) {
      const pin = await preguntar('Clave de acceso', `Ingresa la clave de ${t.nombre}`);
      if (pin !== t.clave) return avisar('Clave incorrecta', 'bad');
    }
    await activarTienda(t);
  }
</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4">
    <div class="flex items-center gap-2 font-extrabold text-primary mb-4">
      <Icono nombre="store" size={20} />
      Mis Tiendas
    </div>
    <input class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text mb-3" placeholder="Nombre unico de la tienda" bind:value={form.nombre} />
    <input type="password" class="w-full px-3.5 py-3 border border-border rounded-[var(--radius-md)] bg-card text-text mb-3" placeholder="Clave de acceso (opcional)" bind:value={form.clave} />
    <button class="w-full py-3 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm btn-gradient" onclick={crearTienda}>
      Crear Tienda
    </button>
  </div>

  {#each tiendas as t}
    <div class="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--color-shadow)] mb-3 flex justify-between items-center card-depth">
      <div>
        <div class="font-bold">{t.nombre}</div>
        <div class="text-xs text-muted">{t.clave ? 'Protegida' : 'Publica'}</div>
      </div>
      <button
        class="px-4 py-2 rounded-lg text-sm font-bold {tiendaActiva === t.id ? 'bg-success text-white' : 'bg-background text-muted'}"
        onclick={() => accederTienda(t)}
      >
        {tiendaActiva === t.id ? 'Activa' : 'Activar'}
      </button>
    </div>
  {/each}
</div>
