import { mount } from 'svelte';
import App from './App.svelte';
import './style.css';
import { ui, avisar, aplicarTema } from './core/store.svelte.js';
import { registerSW } from 'virtual:pwa-register';

aplicarTema();
ui._updateSW = registerSW({
  onNeedRefresh() { ui.actualizar = true; },
  onOfflineReady() { avisar('Lista para usar sin conexión', 'ok'); }
});

mount(App, { target: document.getElementById('app') });
