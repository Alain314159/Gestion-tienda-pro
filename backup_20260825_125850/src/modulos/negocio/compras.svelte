<script>
  import { onMount } from 'svelte';
  import { getDB } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar } from '../../core/store.svelte.js';
  import { dinero } from '../../core/appstate.svelte.js';
  import { n, fmt, fmtCant, fmtFH } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  export const manifiesto = {
    id: 'compras',
    nombre: 'Compras',
    icono: 'cart',
    grupo: 'negocio',
    orden: 2,
    tablas: {
      compras: '++id, productoId, fecha',
      lotes: '++id, productoId, fecha'
    }
  };

  let productos = $state([]);
  let lotes = $state([]);
  let compras = $state([]);
  
  let busqueda = $state('');
  let formAbierto = $state(false);
  let esNuevo = $state(false);
  
  let form = $state({
    editId: null, productoId: null, productoNombre: '',
    cantidad: '', costo: '', unidad: '', fecha: Date.now()
  });
  
  let nuevo = $state({ nombre: '', codigo: '', unidad: '', precio: '' });

  async function cargarDatos() {
    const db = getDB();
    productos = await db.productos.toArray();
    lotes = await db.lotes.toArray();
    compras = (await db.compras.toArray()).sort((a, b) => b.fecha - a.fecha);
  }

  let productosFiltrados = $derived(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q || esNuevo) return [];
    return productos.filter(p => !p.archivado && (
      (p.nombre || '').toLowerCase().includes(q) || 
      (p.codigo || '').toLowerCase().includes(q)
    )).slice(0, 8);
  });

  function stock(productoId) {
    return lotes.filter(l => l.productoId === productoId)
      .reduce((acc, l) => acc + Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)), 0);
  }

  function toLocalISOString(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  function abrirForm(compra = null) {
    if (compra) {
      form.editId = compra.id;
      form.productoId = compra.productoId;
      form.productoNombre = compra.productoNombre;
      form.cantidad = String(compra.cantidad);
      form.costo = String(compra.costo);
      form.unidad = compra.unidad || '';
      form.fecha = compra.fecha;
      esNuevo = false;
    } else {
      form.editId = null;
      form.productoId = null;
      form.productoNombre = '';
      form.cantidad = '';
      form.costo = '';
      form.unidad = '';
      form.fecha = Date.now();
      esNuevo = false;
      nuevo = { nombre: '', codigo: '', unidad: '', precio: '' };
      busqueda = '';
    }
    formAbierto = true;
  }

  function cerrarForm() {
    formAbierto = false;
  }

  function seleccionarProducto(p) {
    form.productoId = p.id;
    form.productoNombre = p.nombre;
    form.unidad = p.unidad || '';
    busqueda = '';
  }

  async function guardar() {
    if (esNuevo) {
      if (!nuevo.nombre.trim()) { avisar('Nombre del producto es obligatorio', 'dg'); return; }
      const db = getDB();
      const prodId = await db.productos.add({
        nombre: nuevo.nombre.trim(),
        codigo: nuevo.codigo.trim(),
        unidad: nuevo.unidad.trim(),
        precio: n(nuevo.precio),
        archivado: false,
        creado: Date.now()
      });
      form.productoId = prodId;
      form.productoNombre = nuevo.nombre.trim();
      form.unidad = nuevo.unidad.trim();
    } else {
      if (!form.productoId) { avisar('Selecciona un producto o marca "Es nuevo"', 'dg'); return; }
    }

    if (n(form.cantidad) <= 0 || n(form.costo) < 0) {
      avisar('Cantidad y costo deben ser válidos', 'dg');
      return;
    }

    const db = getDB();
    const total = n(form.cantidad) * n(form.costo);
    const fecha = n(form.fecha) || Date.now();

    if (form.editId) {
      const compra = await db.compras.get(form.editId);
      await db.compras.update(form.editId, {
        productoId: form.productoId,
        productoNombre: form.productoNombre,
        fecha, cantidad: n(form.cantidad), costo: n(form.costo),
        unidad: form.unidad, total
      });
      if (compra.loteId) {
        await db.lotes.update(compra.loteId, {
          cantidadInicial: n(form.cantidad),
          costo: n(form.costo),
          fecha
        });
      }
      bus.emitir('compra:editada', { id: form.editId });
      avisar('Compra actualizada', 'ok');
    } else {
      const loteId = await db.lotes.add({
        productoId: form.productoId,
        fecha,
        cantidadInicial: n(form.cantidad),
        cantidadVendida: 0,
        costo: n(form.costo)
      });
      await db.compras.add({
        productoId: form.productoId,
        productoNombre: form.productoNombre,
        fecha, cantidad: n(form.cantidad), costo: n(form.costo),
        unidad: form.unidad, total, loteId
      });
      bus.emitir('compra:registrada', { id: form.productoId });
      avisar('Compra registrada', 'ok');
    }
    cerrarForm();
    await cargarDatos();
  }

  onMount(cargarDatos);
</script>

<div class="modulo">
  <div class="card">
    <div class="tit">Registrar Compra</div>
    
    <div class="lbl">
      Buscar producto existente
      <div class="search">
        <Icono nombre="search" size={18} />
        <input class="inp" type="text" placeholder="Nombre o código..." bind:value={busqueda} disabled={esNuevo} />
      </div>
    </div>

    {#if busqueda.trim() && !esNuevo}
      <div class="mut" style="text-align:right;font-size:0.85rem;margin-top:0.25rem">{productosFiltrados().length} resultado(s)</div>
    {/if}
    {#if productosFiltrados().length > 0 && !esNuevo}
      <div class="list" style="margin-bottom: 1rem; max-height: 150px; overflow-y: auto;">
        {#each productosFiltrados() as p}
          <button class="item" on:click={() => seleccionarProducto(p)}>
            <div class="t">{p.nombre}</div>
            <div class="s">Stock: {fmtCant(stock(p.id))} {p.unidad||'u'} · {dinero(p.precio)}</div>
          </button>
        {/each}
      </div>
    {/if}

    <label class="switch" style="margin: 0.5rem 0;">
      <input type="checkbox" bind:checked={esNuevo} />
      <i></i> Es un producto nuevo (no está en el catálogo)
    </label>

    {#if esNuevo}
      <div class="row" style="flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem;">
        <input class="inp" type="text" bind:value={nuevo.nombre} placeholder="Nombre del producto *" />
        <input class="inp" type="text" bind:value={nuevo.codigo} placeholder="Código (opcional)" />
        <input class="inp" type="text" list="unidades-list" bind:value={nuevo.unidad} placeholder="Unidad (kg, lb, u, etc)" />
        <input class="inp" type="number" step="0.01" bind:value={nuevo.precio} placeholder="Precio de venta sugerido" />
      </div>
    {:else}
      {#if form.productoId}
        <div class="mut" style="margin-bottom: 0.5rem;">
          Seleccionado: <strong>{form.productoNombre}</strong> ({form.unidad || 'u'})
        </div>
      {/if}
    {/if}

    <div class="row" style="gap: 0.5rem;">
      <div class="lbl" style="flex: 1;">
        Cantidad *
        <input class="inp" type="number" step="0.01" bind:value={form.cantidad} />
      </div>
      <div class="lbl" style="flex: 1;">
        Costo unitario *
        <input class="inp" type="number" step="0.01" bind:value={form.costo} />
      </div>
    </div>
    
    <div class="lbl" style="margin-top: 0.5rem;">
      Fecha
      <input class="inp" type="datetime-local" 
        value={toLocalISOString(form.fecha)} 
        on:input={(e) => form.fecha = new Date(e.target.value).getTime()} 
      />
    </div>

    <div class="mut" style="margin: 0.5rem 0; text-align: right; font-weight: 600;">
      Total: {dinero(n(form.cantidad) * n(form.costo))}
    </div>

    <div class="row">
      <button class="btn sec" on:click={cerrarForm}>Cancelar</button>
      <button class="btn ok" on:click={guardar}>
        <Icono nombre="save" size={16} /> {form.editId ? 'Actualizar' : 'Registrar Compra'}
      </button>
    </div>
  </div>

  <div class="card">
    <div class="tit">Historial de Compras</div>
    {#if compras.length === 0}
      <div class="empty">
        <Icono nombre="archive" size={48} />
        <p>Sin compras registradas</p>
      </div>
    {:else}
      <div class="list">
        {#each compras as c (c.id)}
          <div class="item blk">
            <div class="item-row">
              <div class="item-info">
                <div class="t">{c.productoNombre}</div>
                <div class="s">{fmtFH(c.fecha)} · {fmtCant(c.cantidad)} {c.unidad||'u'} × {dinero(c.costo)}</div>
              </div>
              <div class="item-acciones">
                <button class="mini" title="Editar" on:click={() => abrirForm(c)}>
                  <Icono nombre="edit" size={16} />
                </button>
              </div>
            </div>
            <div class="pos" style="text-align: right; font-weight: 600; margin-top: 0.25rem;">
              Total: {dinero(c.total)}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <datalist id="unidades-list">
    <option value="kg" /><option value="lb" /><option value="gr" />
    <option value="litro" /><option value="u" />
  </datalist>

  <style>
    .item.blk { display: block; }
    .item-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap; }
    .item-info { flex: 1; }
    .item-acciones { display: flex; gap: 0.35rem; }
    .mini { background: none; border: 1px solid var(--bd); border-radius: 10px; padding: 6px; color: var(--txm); cursor: pointer; }
    .mini:hover { color: var(--tx); }
  </style>
</div>
