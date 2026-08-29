<script>
import { onMount } from 'svelte';
import { getDB } from '../../core/db.js';
import { dinero, fmtCant, fmtFH } from '../../core/appstate.js';
import { n } from '../../core/util.js';
import { avisar, preguntar, pedirPIN } from '../../core/store.js';

let productos = [];
let lotes = [];
let mostrarArchivados = false;
let busqueda = '';
let sheetAbierto = false;
let editando = null;
let form = { nombre: '', codigo: '', unidad: 'u', precio: 0 };

onMount(() => {
    cargarDatos();
});

async function cargarDatos() {
    try {
        const db = getDB();
        productos = await db.productos.toArray();
        lotes = await db.lotes.toArray();
    } catch (err) {
        console.error('Error cargando datos:', err);
        avisar('Error al cargar productos', 'error');
    }
}

function productosFiltrados() {
    let list = productos;
    if (!mostrarArchivados) {
        list = list.filter(p => !p.archivado);
    }
    if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        list = list.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            (p.codigo && p.codigo.toLowerCase().includes(q))
        );
    }
    return list;
}

function lotesActivosDe(id) {
    return lotes.filter(l => l.productoId === id && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0);
}

function stock(id) {
    return lotesActivosDe(id).reduce((sum, l) => sum + n(l.cantidadInicial) - n(l.cantidadVendida), 0);
}

function valorLotes(id) {
    return lotesActivosDe(id).reduce((sum, l) => {
        const restante = n(l.cantidadInicial) - n(l.cantidadVendida);
        return sum + restante * n(l.costo);
    }, 0);
}

function valorInventario() {
    const ids = new Set(productos.map(p => p.id));
    let total = 0;
    for (const id of ids) {
        total += valorLotes(id);
    }
    return total;
}

function unidadesTotal() {
    const ids = new Set(productos.map(p => p.id));
    let total = 0;
    for (const id of ids) {
        total += stock(id);
    }
    return total;
}

function lotesActivosCount() {
    return lotes.filter(l => (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0).length;
}

function badgeInfo(id) {
    const s = stock(id);
    if (s <= 0) return { texto: 'Sin stock', clase: 'danger' };
    if (s < 5) return { texto: 'Stock bajo', clase: 'warning' };
    return { texto: 'OK', clase: 'success' };
}

function abrirSheet(p) {
    if (p) {
        editando = p.id;
        form = { ...p };
    } else {
        editando = null;
        form = { nombre: '', codigo: '', unidad: 'u', precio: 0 };
    }
    sheetAbierto = true;
}

async function guardarProducto() {
    if (!form.nombre.trim()) {
        avisar('El nombre es obligatorio', 'error');
        return;
    }
    if (!form.precio || form.precio <= 0) {
        avisar('El precio debe ser mayor a 0', 'error');
        return;
    }
    try {
        const db = getDB();
        const data = { ...form, precio: n(form.precio) };
        if (editando) {
            await db.productos.update(editando, data);
            avisar('Producto actualizado', 'ok');
        } else {
            data.id = Date.now();
            await db.productos.add(data);
            avisar('Producto creado', 'ok');
        }
        await cargarDatos();
        sheetAbierto = false;
    } catch (err) {
        console.error('Error guardando producto:', err);
        avisar('Error al guardar', 'error');
    }
}

async function archivar(p) {
    if (!await pedirPIN()) return;
    try {
        const db = getDB();
        await db.productos.update(p.id, { archivado: true });
        await cargarDatos();
        avisar('Producto archivado', 'ok');
    } catch (err) {
        console.error('Error archivando:', err);
        avisar('Error al archivar', 'error');
    }
}

async function restaurar(p) {
    try {
        const db = getDB();
        await db.productos.update(p.id, { archivado: false });
        await cargarDatos();
        avisar('Producto restaurado', 'ok');
    } catch (err) {
        console.error('Error restaurando:', err);
        avisar('Error al restaurar', 'error');
    }
}
</script>

<div class="productos-module">
    <div class="header">
        <h2>Productos</h2>
        <div class="stats">
            <span>Valor del Inventario: {dinero(valorInventario())}</span>
            <span>{fmtCant(unidadesTotal())} unidades · {lotesActivosCount()} lotes</span>
        </div>
    </div>

    <div class="toolbar">
        <input type="text" placeholder="Buscar productos..." bind:value={busqueda} />
        <button class="btn-primary" on:click={() => abrirSheet(null)}>+ Agregar</button>
        <button class="btn-secondary" on:click={() => mostrarArchivados = !mostrarArchivados}>
            {mostrarArchivados ? 'Ocultar archivados' : 'Ver archivados'}
        </button>
    </div>

    <div class="product-list">
        {#if productosFiltrados().length === 0}
            <div class="empty">
                {mostrarArchivados ? 'No hay productos archivados' :
                 busqueda ? 'Sin resultados para la búsqueda' :
                 'No hay productos registrados. Agrega el primero.'}
            </div>
        {:else}
            {#each productosFiltrados() as p (p.id)}
                {@const b = badgeInfo(p.id)}
                {@const lotesAct = lotesActivosDe(p.id)}
                {@const s = stock(p.id)}
                <div class="product-card">
                    <div class="product-header">
                        <span class="name">{p.nombre}</span>
                        {#if p.codigo}<span class="code">({p.codigo})</span>{/if}
                        <span class="badge {b.clase}">{b.texto}</span>
                    </div>
                    <div class="product-body">
                        <span>Stock: {fmtCant(s)} {p.unidad || 'u'}</span>
                        <span>Precio: {dinero(p.precio || 0)}</span>
                    </div>
                    <div class="product-actions">
                        {#if !p.archivado}
                            <button class="btn-small" on:click={() => abrirSheet(p)}>✎ Editar</button>
                            <button class="btn-small danger" on:click={() => archivar(p)}>Archivar</button>
                        {:else}
                            <button class="btn-small" on:click={() => restaurar(p)}>↻ Restaurar</button>
                        {/if}
                    </div>
                    {#if lotesAct.length > 0}
                        <div class="lotes">
                            {#each lotesAct as l}
                                {@const restante = n(l.cantidadInicial) - n(l.cantidadVendida)}
                                <div class="lote">
                                    <span>{fmtFH(l.fecha)}</span>
                                    <span>Quedan {fmtCant(restante)} {p.unidad || 'u'}</span>
                                    <span>@ {dinero(n(l.costo))} = {dinero(restante * n(l.costo))}</span>
                                </div>
                            {/each}
                            <div class="lote-total">Valor total: {dinero(valorLotes(p.id))}</div>
                        </div>
                    {:else}
                        <div class="no-lotes">Sin lotes activos (stock 0)</div>
                    {/if}
                </div>
            {/each}
        {/if}
    </div>

    {#if sheetAbierto}
        <div class="modal-overlay" on:click={() => sheetAbierto = false}>
            <div class="modal-content" on:click|stopPropagation>
                <h3>{editando ? 'Editar producto' : 'Nuevo producto'}</h3>
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" bind:value={form.nombre} />
                </div>
                <div class="form-group">
                    <label>Código</label>
                    <input type="text" bind:value={form.codigo} />
                </div>
                <div class="form-group">
                    <label>Unidad</label>
                    <input type="text" bind:value={form.unidad} placeholder="kg, lb, gr, litro, u" />
                </div>
                <div class="form-group">
                    <label>Precio *</label>
                    <input type="number" bind:value={form.precio} step="0.01" />
                </div>
                <div class="dialog-actions">
                    <button class="btn-secondary" on:click={() => sheetAbierto = false}>Cancelar</button>
                    <button class="btn-primary" on:click={guardarProducto}>{editando ? 'Actualizar' : 'Guardar'}</button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
.productos-module { padding: 16px; max-width: 800px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
.stats { font-size: 14px; color: #6b7280; }
.toolbar { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
.toolbar input { flex: 1; min-width: 150px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.product-list { display: flex; flex-direction: column; gap: 12px; }
.product-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
.product-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.name { font-weight: 600; }
.code { color: #6b7280; font-size: 13px; }
.badge { font-size: 11px; padding: 2px 10px; border-radius: 12px; }
.badge.success { background: #d1fae5; color: #065f46; }
.badge.warning { background: #fef3c7; color: #92400e; }
.badge.danger { background: #fee2e2; color: #991b1b; }
.product-body { display: flex; gap: 16px; font-size: 14px; color: #4b5563; margin: 6px 0; }
.product-actions { display: flex; gap: 6px; margin: 6px 0; }
.btn-small { padding: 4px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; background: #e5e7eb; }
.btn-small.danger { background: #fee2e2; color: #991b1b; }
.lotes { margin-top: 8px; padding: 8px; background: #fff; border-radius: 4px; font-size: 13px; }
.lote { display: flex; gap: 12px; padding: 4px 0; border-bottom: 1px solid #f3f4f6; }
.lote-total { font-weight: 600; margin-top: 4px; }
.no-lotes { color: #9ca3af; font-size: 13px; padding: 6px 0; }
.empty { text-align: center; color: #9ca3af; padding: 40px 0; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.form-group input { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.btn-primary { background: #3b82f6; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.btn-secondary { background: #e5e7eb; color: #1f2937; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.dialog-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: #fff; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto; }
.dark .stats { color: #9ca3af; }
.dark .toolbar input { background: #1f2937; border-color: #374151; color: #e5e7eb; }
.dark .product-card { background: #1f2937; border-color: #374151; }
.dark .code { color: #9ca3af; }
.dark .product-body { color: #9ca3af; }
.dark .lotes { background: #111827; }
.dark .lote { border-bottom-color: #1f2937; }
.dark .btn-secondary { background: #374151; color: #e5e7eb; }
.dark .modal-content { background: #1f2937; color: #e5e7eb; }
.dark .form-group input { background: #1f2937; border-color: #374151; color: #e5e7eb; }
</style>
