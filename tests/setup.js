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
