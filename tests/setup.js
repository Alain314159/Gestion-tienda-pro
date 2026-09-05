import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// Mock matchMedia
global.matchMedia = global.matchMedia || function() {
  return { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
};

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', { value: true, writable: true });

// Mock crypto.randomUUID - jsdom tiene crypto como read-only
if (!global.crypto?.randomUUID) {
  vi.stubGlobal('crypto', {
    ...global.crypto,
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2)
  });
}

// Mock crypto.subtle para hashing de PIN
if (!global.crypto?.subtle) {
  vi.stubGlobal('crypto', {
    ...global.crypto,
    subtle: {
      digest: async (algo, data) => {
        // Hash simple para tests (no usar en produccion)
        const arr = new Uint8Array(data);
        let hash = 0;
        for (let i = 0; i < arr.length; i++) {
          hash = ((hash << 5) - hash) + arr[i];
          hash = hash & hash;
        }
        const buf = new ArrayBuffer(32);
        const view = new Uint8Array(buf);
        for (let i = 0; i < 32; i++) view[i] = (hash + i) & 0xff;
        return buf;
      }
    }
  });
}
