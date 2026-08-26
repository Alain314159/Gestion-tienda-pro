import { vi } from 'vitest';

// Mock de IndexedDB
const mockDB = {
  config: { get: vi.fn(), put: vi.fn(), toArray: vi.fn().mockResolvedValue([]) },
  productos: { toArray: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn() },
  ventas: { toArray: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn() },
  compras: { toArray: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn() },
  lotes: { toArray: vi.fn().mockResolvedValue([]), add: vi.fn(), update: vi.fn() },
  movsCaja: { toArray: vi.fn().mockResolvedValue([]), add: vi.fn() },
  arqueos: { toArray: vi.fn().mockResolvedValue([]), add: vi.fn() },
  ajustesInv: { toArray: vi.fn().mockResolvedValue([]), add: vi.fn() },
  movsPatrimonio: { toArray: vi.fn().mockResolvedValue([]), add: vi.fn() },
  cierres: { toArray: vi.fn().mockResolvedValue([]), add: vi.fn() },
};

vi.mock('dexie', () => ({
  default: class MockDexie {
    constructor() { return mockDB; }
    version() { return { stores: vi.fn() }; }
  }
}));

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock de matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

// Mock de navigator.share
Object.defineProperty(navigator, 'share', { value: vi.fn(), writable: true });
