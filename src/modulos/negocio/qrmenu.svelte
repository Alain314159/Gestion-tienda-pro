<script module>
  export const manifiesto = {
    id: 'qrmenu',
    nombre: 'Menu QR',
    icono: 'scan',
    grupo: 'utilidades',
    orden: 12,
    tablas: {}
  };
</script>

<script>
  import { onMount } from 'svelte';
  import { listar } from '../../core/db.js';
  import { fmt } from '../../core/util.js';
  import Icono from '../../core/Icono.svelte';

  let productos = $state([]);

  onMount(async () => { productos = await listar('productos'); });

  let menuURL = $derived(() => {
    const prods = productos.filter(p => !p.archivado).map(p => ({ n: p.nombre, p: p.precio, u: p.unidad }));
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Menu</title><style>body{font-family:system-ui,sans-serif;padding:1rem;max-width:400px;margin:0 auto;background:#f8fafc}h1{color:#2196F3;text-align:center}.item{display:flex;justify-content:space-between;padding:.8rem 0;border-bottom:1px solid #e2e8f0}.price{color:#16a34a;font-weight:800}</style></head><body><h1>🍽️ Nuestro Menu</h1>${prods.map(p => `<div class="item"><span>${p.n}</span><span class="price">$${p.p.toFixed(2)}${p.u ? ' /' + p.u : ''}</span></div>`).join('')}</body></html>`;
    return `data:text/html;base64,${btoa(html)}`;
  });
</script>

<div class="modulo">
  <div class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] text-center">
    <Icono nombre="scan" size={48} class="mx-auto mb-3 text-primary" />
    <h2 class="font-extrabold text-lg mb-2">Menu para clientes</h2>
    <p class="text-sm text-muted mb-4">Comparte este enlace o QR para que vean precios sin entrar al sistema.</p>

    <div class="bg-white p-4 rounded-xl inline-block mb-4">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encodeURIComponent(menuURL())}" alt="QR" class="w-48 h-48" />
    </div>

    <div class="text-xs text-muted break-all mb-4">{menuURL().slice(0, 80)}...</div>

    <button class="w-full py-3 rounded-[var(--radius-md)] bg-primary text-white font-extrabold text-sm" onclick={() => { navigator.clipboard.writeText(menuURL()); }}>
      Copiar enlace del menu
    </button>
  </div>
</div>
