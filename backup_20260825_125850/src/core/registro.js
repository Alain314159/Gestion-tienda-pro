import { abrirDB } from './db.js';

const bruto = import.meta.glob('../modulos/**/*.svelte', { eager: true });

export const modulos = Object.entries(bruto)
  .map(([ruta, mod]) => ({ ...(mod.manifiesto || {}), ruta, Componente: mod.default }))
  .filter(m => m.id)
  .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));

export const grupos = [...new Set(modulos.map(m => m.grupo || 'negocio'))];
abrirDB(modulos);
