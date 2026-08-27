import { mount } from 'svelte';
import App from './App.svelte';
import './style.css';
import { ui, avisar, aplicarTema } from './core/store.js';
import { registerSW } from 'virtual:pwa-register';

aplicarTema();
const _updateSW = registerSW({
  onNeedRefresh() { ui.update(u => ({ ...u, actualizar: true })); },
  onOfflineReady() { avisar('Lista para usar sin conexión', 'ok'); }
});

mount(App, { target: document.getElementById('app') });
