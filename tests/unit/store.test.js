import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ui, avisar, confirmar, cerrarConfirm, preguntar, cerrarPrompt } from '../../src/core/store.svelte.js';

describe('Store global (ui)', () => {
  it('ui tiene tema definido', () => {
    expect(['light', 'dark']).toContain(ui.tema);
  });

  it('ui.toast inicia como null', () => {
    expect(ui.toast).toBeNull();
  });

  it('avisar() muestra toast', () => {
    avisar('Test message', 'ok');
    expect(ui.toast).not.toBeNull();
    expect(ui.toast.msg).toBe('Test message');
    expect(ui.toast.tipo).toBe('ok');
  });

  it('confirmar() devuelve promesa', () => {
    const promise = confirmar('Título', 'Mensaje');
    expect(promise).toBeInstanceOf(Promise);
    cerrarConfirm(true);
  });

  it('preguntar() devuelve promesa', () => {
    const promise = preguntar('Título', 'Mensaje');
    expect(promise).toBeInstanceOf(Promise);
    cerrarPrompt(true);
  });
});
