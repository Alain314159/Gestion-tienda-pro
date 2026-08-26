import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import App from '../../src/App.svelte';

// Mock de registro.js
vi.mock('../../src/core/registro.js', () => ({
  modulos: [
    { id: 'inicio', nombre: 'Inicio', icono: 'home', grupo: 'negocio', orden: 0, Componente: vi.fn() },
    { id: 'ventas', nombre: 'Ventas', icono: 'cash', grupo: 'negocio', orden: 1, Componente: vi.fn() },
  ],
  grupos: ['negocio'],
}));

vi.mock('../../src/core/appstate.svelte.js', () => ({
  app: { cfg: { nombre: 'Tienda Pro', tema: 'light' } },
  iniciarCfg: vi.fn(),
}));

describe('App.svelte', () => {
  it('se renderiza sin errores', () => {
    const { container } = render(App);
    expect(container).toBeDefined();
  });
});
