import { mount } from 'svelte';
import App from './App.svelte';
import './style.css';
import { aplicarTema } from './core/state.svelte.js';

aplicarTema();

mount(App, { target: document.getElementById('app') });
