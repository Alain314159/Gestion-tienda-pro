import { describe, it, expect, vi } from 'vitest';
import { bus } from '../../src/core/bus.js';

describe('Event Bus', () => {
  it('emite eventos a suscriptores', () => {
    const handler = vi.fn();
    bus.on('test:evento', handler);
    bus.emitir('test:evento', { data: 123 });
    expect(handler).toHaveBeenCalledWith({ data: 123 });
  });

  it('permite desuscribirse', () => {
    const handler = vi.fn();
    const unsub = bus.on('test:unsubscribe', handler);
    unsub();
    bus.emitir('test:unsubscribe', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('no falla al emitir evento sin suscriptores', () => {
    expect(() => bus.emitir('no:existe', {})).not.toThrow();
  });

  it('soporta múltiples suscriptores', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('test:multi', h1);
    bus.on('test:multi', h2);
    bus.emitir('test:multi', 'data');
    expect(h1).toHaveBeenCalledWith('data');
    expect(h2).toHaveBeenCalledWith('data');
  });
});
