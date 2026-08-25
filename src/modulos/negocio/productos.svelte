<!-- src/modulos/negocio/productos.svelte -->
<script>
  import { onMount } from 'svelte';
  import { getDB } from '../../core/db.js';
  import { bus } from '../../core/bus.js';
  import { avisar, confirmar } from '../../core/store.svelte.js';
  import { dinero } from '../../core/appstate.svelte.js';
  import { fmtCant, fmtFH, n } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  export const manifiesto = {
    id: 'productos',
    nombre: 'Productos',
    icono: 'box',
    grupo: 'negocio',
    orden: 5,
    tablas: {
      productos: '++id, nombre, codigo, archivado',
      lotes: '++id, productoId, fecha'
    }
  };

  let productos = $state([]);
  let lotes = $state([]);
  let busqueda = $state('');
  let mostrarArchivados = $state(false);
  let sheetAbierto = $state(false);
  let editando = $state(null);

  let formNombre = $state('');
  let formCodigo = $state('');
  let formUnidad = $state('');
  let formPrecio = $state('');

  async function cargarDatos() {
    const db = getDB();
    productos = await db.productos.toArray();
    lotes = await db.lotes.toArray();
  }

  function stock(productoId) {
    let total = 0;
    const lotesProd = lotes
      .filter(l => l.productoId === productoId)
      .sort((a, b) => n(a.fecha) - n(b.fecha));
    for (const l of lotesProd) {
      const restante = n(l.cantidadInicial) - n(l.cantidadVendida);
      if (restante > 0) total += restante;
    }
    return total;
  }

  function badgeInfo(productoId) {
    const s = stock(productoId);
    if (s <= 0) return { texto: 'Agotado', clase: 'dg' };
    if (s <= 5) return { texto: 'Bajo', clase: 'wn' };
    return { texto: 'OK', clase: 'ok' };
  }

  function valorLotes(productoId) {
    return lotes
      .filter(l => l.productoId === productoId)
      .reduce((acc, l) => {
        const restante = n(l.cantidadInicial) - n(l.cantidadVendida);
        return restante > 0 ? acc + restante * n(l.costo) : acc;
      }, 0);
  }

  function lotesActivosDe(productoId) {
    return lotes
      .filter(l => l.productoId === productoId)
      .filter(l => (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0)
      .sort((a, b) => n(a.fecha) - n(b.fecha));
  }

  function productosFiltrados() {
    const q = busqueda.trim().toLowerCase();
    return productos
      .filter(p => (p.archivado ? mostrarArchivados : !mostrarArchivados))
      .filter(p => {
        if (!q) return true;
        return (p.nombre || '').toLowerCase().includes(q) ||
               (p.codigo || '').toLowerCase().includes(q);
      })
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  function valorInventario() {
    return productos
      .filter(p => !p.archivado)
      .reduce((acc, p) => acc + valorLotes(p.id), 0);
  }

  function unidadesTotal() {
    return productos
      .filter(p => !p.archivado)
      .reduce((acc, p) => acc + stock(p.id), 0);
  }

  function lotesActivosCount() {
    return lotes.filter(l => {
      const prod = productos.find(p => p.id === l.productoId);
      if (!prod || prod.archivado) return false;
      return (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0;
    }).length;
  }

  function abrirSheet(producto) {
    if (producto) {
      editando = producto;
      formNombre = producto.nombre || '';
      formCodigo = producto.codigo || '';
      formUnidad = producto.unidad || '';
      formPrecio = producto.precio != null ? String(producto.precio) : '';
    } else {
      editando = null;
      formNombre = '';
      formCodigo = '';
      formUnidad = '';
      formPrecio = '';
    }
    sheetAbierto = true;
  }

  function cerrarSheet() {
    sheetAbierto = false;
    editando = null;
    formNombre = '';
    formCodigo = '';
    formUnidad = '';
    formPrecio = '';
  }

  async function guardar() {
    const nombre = formNombre.trim();
    const precio = parseFloat(formPrecio);
    if (!nombre) { avisar('El nombre es obligatorio', 'dg'); return; }
    if (isNaN(precio) || precio < 0) { avisar('Precio inválido', 'dg'); return; }

    const db = getDB();
    if (editando) {
      await db.productos.update(editando.id, {
        nombre,
        codigo: formCodigo.trim(),
        unidad: formUnidad.trim(),
        precio
      });
      bus.emitir('producto:actualizado', { id: editando.id });
      avisar('Producto actualizado', 'ok');
    } else {
      const id = await db.productos.add({
        nombre,
        codigo: formCodigo.trim(),
        unidad: formUnidad.trim(),
        precio,
        archivado: false,
        creado: Date.now()
      });
      bus.emitir('producto:creado', { id });
      avisar('Producto creado', 'ok');
    }
    cerrarSheet();
    await cargarDatos();
  }

  async function archivar(p) {
    const ok = await confirmar('Archivar producto', `¿Archivar "${p.nombre}"? No aparecerá en la lista principal.`);
    if (!ok) return;
    const db = getDB();
    await db.productos.update(p.id, { archivado: true });
    bus.emitir('producto:archivado', { id: p.id });
    avisar('Producto archivado', 'info');
    await cargarDatos();
  }

  async function restaurar(p) {
    const db = getDB();
    await db.productos.update(p.id, { archivado: false });
    bus.emitir('producto:restaurado', { id: p.id });
    avisar('Producto restaurado', 'ok');
    await cargarDatos();
  }

  onMount(cargarDatos);
</script>

<div class="modulo">
  <div class="search">
    <Icono nombre="search" size={18}/>
    <input class="inp" type="text" placeholder="Buscar por nombre o código..." bind:value={busqueda} />
  </div>

  <div class="card">
    <div class="tit">Valor del Inventario</div>
    <div class="big">{dinero(valorInventario())}</div>
    <div class="mut">{fmtCant(unidadesTotal())} unidades · {lotesActivosCount()} lotes</div>
  </div>

  <div class="row">
    <button class="btn ok" onclick={() => abrirSheet(null)}>
      <Icono nombre="plus" size={16} /> Agregar
    </button>
    <button class="btn sec" onclick={() => (mostrarArchivados = !mostrarArchivados)}>
      <Icono nombre={mostrarArchivados ? 'x' : 'archive'} size={16} />
      {mostrarArchivados ? 'Ocultar archivados' : 'Ver archivados'}
    </button>
  </div>

  {#if productosFiltrados().length === 0}
    <div class="empty">
      <Icono nombre="box" size={48} />
      <p>
        {mostrarArchivados
          ? 'No hay productos archivados'
          : busqueda
            ? 'Sin resultados para la búsqueda'
            : 'No hay productos registrados. Agrega el primero.'}
      </p>
    </div>
  {:else}
    <div class="list">
      {#each productosFiltrados() as p (p.id)}
        {@const b = badgeInfo(p.id)}
        {@const lotesAct = lotesActivosDe(p.id)}
        {@const s = stock(p.id)}
        <div class="item blk" class:archivado-item={p.archivado}>
          <div class="item-row">
            <div class="item-info">
              <div class="t">
                {p.nombre}
                {#if p.codigo}<span class="s">({p.codigo})</span>{/if}
                <span class="badge {b.clase}">{b.texto}</span>
              </div>
              <div class="s">Stock: {fmtCant(s)} {p.unidad || 'u'} · {dinero(p.precio || 0)}</div>
            </div>
            <div class="item-acciones">
              {#if !p.archivado}
                <button class="mini" title="Editar" onclick={() => abrirSheet(p)}>
                  <Icono nombre="edit" size={16} />
                </button>
                <button class="mini dg" title="Archivar" onclick={() => archivar(p)}>
                  <Icono nombre="archive" size={16} />
                </button>
              {:else}
                <button class="mini ok" title="Restaurar" onclick={() => restaurar(p)}>
                  <Icono nombre="refresh" size={16} />
                </button>
              {/if}
            </div>
          </div>
          <div class="item-lotes">
            {#if lotesAct.length > 0}
              {#each lotesAct as l}
                {@const restante = n(l.cantidadInicial) - n(l.cantidadVendida)}
                <div class="mut">
                  {fmtFH(l.fecha)} · Quedan {fmtCant(restante)} {p.unidad || 'u'}
                  @{dinero(n(l.costo))} = {dinero(restante * n(l.costo))}
                </div>
              {/each}
              <div class="pos">
                Valor total: {dinero(valorLotes(p.id))}
              </div>
            {:else}
              <div class="mut">Sin lotes activos (stock 0)</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if sheetAbierto}
    <div class="mask" onclick={cerrarSheet} role="presentation" onkeydown={(e) => (e.key === "Enter" || e.key === " ") && e.currentTarget.click()}>
    <div class="sheet" onclick={(e) = onkeydown={(e) => (e.key === "Enter" || e.key === " ") && e.currentTarget.click()}> e.stopPropagation()} role="dialog">
      <div class="sheet-head">
        <div class="t">{editando ? 'Editar producto' : 'Nuevo producto'}</div>
        <button class="mini" onclick={cerrarSheet}>
          <Icono nombre="x" size={18} />
        </button>
      </div>
      <div class="sheet-body">
        <label class="lbl">
          Nombre *
          <input class="inp" type="text" bind:value={formNombre} placeholder="Nombre del producto" />
        </label>
        <label class="lbl">
          Código
          <input class="inp" type="text" bind:value={formCodigo} placeholder="Código o SKU" />
        </label>
        <label class="lbl">
          Unidad
          <input class="inp" type="text" list="unidades-list" bind:value={formUnidad} placeholder="Selecciona o escribe" />
          <datalist id="unidades-list">
            <option value="kg" ></option>
            <option value="lb" ></option>
            <option value="gr" ></option>
            <option value="litro" ></option>
            <option value="u" ></option>
          </datalist>
          <small class="mut">Unidad de medida para mostrar en ventas y stock (kg, lb, gr, litro, u).</small>
        </label>
        <label class="lbl">
          Precio *
          <input class="inp" type="number" min="0" step="0.01" bind:value={formPrecio} placeholder="0.00" />
        </label>
      </div>
      <div class="sheet-foot">
        <div class="row">
          <button class="btn sec" onclick={cerrarSheet}>Cancelar</button>
          <button class="btn ok" onclick={guardar}>
            <Icono nombre="save" size={16} />
            {editando ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
    </div>
  {/if}
</div>

<style>
  .item.blk {
    display: block;
  }
  .item.archivado-item {
    opacity: 0.6;
    border-style: dashed;
  }
  .item-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .item-info {
    flex: 1;
  }
  .item-acciones {
    display: flex;
    gap: 0.35rem;
  }
  .item-lotes {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--bd);
  }
  .mini {
    background: none;
    border: 1px solid var(--bd);
    border-radius: 10px;
    padding: 6px;
    color: var(--txm);
    cursor: pointer;
  }
  .mini.ok {
    color: var(--ok);
  }
  .mini.dg {
    color: var(--dg);
  }
  .sheet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  .sheet-foot{margin-top:14px}
</style>
