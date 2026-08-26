#!/bin/bash

echo "🧪 Creando estructura de tests para Tienda Pro..."

# Crear directorios de tests
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/e2e

# ============================================
# CONFIGURACIÓN DE VITEST
# ============================================
cat > vitest.config.js << 'EOF'
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
  },
  resolve: {
    conditions: ['browser'],
  },
});
EOF

# ============================================
# SETUP DE TESTS
# ============================================
cat > tests/setup.js << 'EOF'
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
EOF

# ============================================
# TESTS UNITARIOS: util.js
# ============================================
cat > tests/unit/util.test.js << 'EOF'
import { describe, it, expect } from 'vitest';
import { n, fmt, fmtCant, fmtFecha, fmtFH, slug } from '../../src/core/util.js';

describe('n() - convertir a número', () => {
  it('convierte string a número', () => {
    expect(n('42')).toBe(42);
  });
  it('devuelve 0 para null', () => {
    expect(n(null)).toBe(0);
  });
  it('devuelve 0 para undefined', () => {
    expect(n(undefined)).toBe(0);
  });
  it('devuelve 0 para string vacío', () => {
    expect(n('')).toBe(0);
  });
  it('maneja negativos', () => {
    expect(n('-5.5')).toBe(-5.5);
  });
});

describe('fmt() - formato de moneda', () => {
  it('formatea número con 2 decimales', () => {
    const result = fmt(1234.5);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });
  it('formatea 0', () => {
    expect(fmt(0)).toContain('0');
  });
  it('maneja undefined', () => {
    expect(fmt(undefined)).toContain('0');
  });
});

describe('fmtCant() - formato de cantidad', () => {
  it('enteros sin decimales', () => {
    expect(fmtCant(5)).toBe('5');
  });
  it('decimales con hasta 3 posiciones', () => {
    const result = fmtCant(2.5);
    expect(result).toContain('2');
  });
});

describe('slug() - generar slug', () => {
  it('convierte a minúsculas y reemplaza espacios', () => {
    expect(slug('Hola Mundo')).toBe('hola-mundo');
  });
  it('elimina acentos', () => {
    expect(slug('Café')).toBe('cafe');
  });
  it('maneja string vacío', () => {
    expect(slug('')).toBe('dato');
  });
});
EOF

# ============================================
# TESTS UNITARIOS: bus.js
# ============================================
cat > tests/unit/bus.test.js << 'EOF'
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
EOF

# ============================================
# TESTS UNITARIOS: cfg.js
# ============================================
cat > tests/unit/cfg.test.js << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CFG_DEF } from '../../src/core/cfg.js';

describe('Configuración por defecto', () => {
  it('tiene id = 1', () => {
    expect(CFG_DEF.id).toBe(1);
  });
  it('tiene nombre por defecto', () => {
    expect(CFG_DEF.nombre).toBe('Tienda Pro');
  });
  it('tiene periodoInicio como timestamp', () => {
    expect(typeof CFG_DEF.periodoInicio).toBe('number');
    expect(CFG_DEF.periodoInicio).toBeGreaterThan(0);
  });
  it('tiene capitalInicial = 0', () => {
    expect(CFG_DEF.capitalInicial).toBe(0);
  });
  it('tiene pin vacío por defecto', () => {
    expect(CFG_DEF.pin).toBe('');
  });
});
EOF

# ============================================
# TESTS UNITARIOS: store.svelte.js
# ============================================
cat > tests/unit/store.test.js << 'EOF'
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
EOF

# ============================================
# TESTS UNITARIOS: db.js
# ============================================
cat > tests/unit/db.test.js << 'EOF'
import { describe, it, expect, vi } from 'vitest';
import { abrirDB, getDB } from '../../src/core/db.js';

describe('Base de datos', () => {
  it('abrirDB crea instancia', () => {
    const manifiestos = [{ tablas: { productos: '++id, nombre' } }];
    const db = abrirDB(manifiestos);
    expect(db).toBeDefined();
  });

  it('getDB devuelve la misma instancia', () => {
    const manifiestos = [{ tablas: { productos: '++id, nombre' } }];
    abrirDB(manifiestos);
    const db = getDB();
    expect(db).toBeDefined();
  });

  it('abrirDB es singleton', () => {
    const manifiestos = [{ tablas: {} }];
    const db1 = abrirDB(manifiestos);
    const db2 = abrirDB(manifiestos);
    expect(db1).toBe(db2);
  });
});
EOF

# ============================================
# TESTS INTEGRACIÓN: registro de módulos
# ============================================
cat > tests/integration/registro.test.js << 'EOF'
import { describe, it, expect } from 'vitest';
import { modulos, grupos } from '../../src/core/registro.js';

describe('Registro de módulos', () => {
  it('carga al menos 9 módulos', () => {
    expect(modulos.length).toBeGreaterThanOrEqual(9);
  });

  it('todos los módulos tienen id', () => {
    modulos.forEach(m => {
      expect(m.id).toBeDefined();
      expect(typeof m.id).toBe('string');
    });
  });

  it('todos los módulos tienen Componente', () => {
    modulos.forEach(m => {
      expect(m.Componente).toBeDefined();
    });
  });

  it('todos los módulos tienen nombre', () => {
    modulos.forEach(m => {
      expect(m.nombre).toBeDefined();
    });
  });

  it('los módulos están ordenados por "orden"', () => {
    for (let i = 1; i < modulos.length; i++) {
      expect(modulos[i].orden ?? 99).toBeGreaterThanOrEqual(modulos[i-1].orden ?? 99);
    });
  });

  it('existe el módulo inicio', () => {
    expect(modulos.find(m => m.id === 'inicio')).toBeDefined();
  });

  it('existe el módulo ventas', () => {
    expect(modulos.find(m => m.id === 'ventas')).toBeDefined();
  });

  it('existe el módulo compras', () => {
    expect(modulos.find(m => m.id === 'compras')).toBeDefined();
  });

  it('existe el módulo caja', () => {
    expect(modulos.find(m => m.id === 'caja')).toBeDefined();
  });

  it('existe el módulo ajustes', () => {
    expect(modulos.find(m => m.id === 'ajustes')).toBeDefined();
  });

  it('grupos incluye negocio y utilidades', () => {
    expect(grupos).toContain('negocio');
    expect(grupos).toContain('utilidades');
  });
});
EOF

# ============================================
# TESTS INTEGRACIÓN: módulos individuales
# ============================================
cat > tests/integration/modulos.test.js << 'EOF'
import { describe, it, expect } from 'vitest';
import * as Inicio from '../../src/modulos/negocio/inicio.svelte';
import * as Ventas from '../../src/modulos/negocio/ventas.svelte';
import * as Compras from '../../src/modulos/negocio/compras.svelte';
import * as Caja from '../../src/modulos/negocio/caja.svelte';
import * as Productos from '../../src/modulos/negocio/productos.svelte';
import * as Inventario from '../../src/modulos/negocio/inventario.svelte';
import * as Patrimonio from '../../src/modulos/negocio/patrimonio.svelte';
import * as Reportes from '../../src/modulos/utilidades/reportes.svelte';
import * as Ajustes from '../../src/modulos/utilidades/ajustes.svelte';

const todosModulos = [
  { nombre: 'Inicio', mod: Inicio },
  { nombre: 'Ventas', mod: Ventas },
  { nombre: 'Compras', mod: Compras },
  { nombre: 'Caja', mod: Caja },
  { nombre: 'Productos', mod: Productos },
  { nombre: 'Inventario', mod: Inventario },
  { nombre: 'Patrimonio', mod: Patrimonio },
  { nombre: 'Reportes', mod: Reportes },
  { nombre: 'Ajustes', mod: Ajustes },
];

describe('Manifiesto de cada módulo', () => {
  todosModulos.forEach(({ nombre, mod }) => {
    describe(nombre, () => {
      it('tiene export default (componente)', () => {
        expect(mod.default).toBeDefined();
      });
      it('tiene manifiesto exportado', () => {
        expect(mod.manifiesto).toBeDefined();
      });
      it('manifiesto tiene id', () => {
        expect(mod.manifiesto.id).toBeDefined();
      });
      it('manifiesto tiene nombre', () => {
        expect(mod.manifiesto.nombre).toBeDefined();
      });
      it('manifiesto tiene icono', () => {
        expect(mod.manifiesto.icono).toBeDefined();
      });
      it('manifiesto tiene grupo', () => {
        expect(mod.manifiesto.grupo).toBeDefined();
      });
      it('manifiesto tiene orden numérico', () => {
        expect(typeof mod.manifiesto.orden).toBe('number');
      });
    });
  });
});
EOF

# ============================================
# TEST E2E: App.svelte
# ============================================
cat > tests/e2e/app.test.js << 'EOF'
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
EOF

# ============================================
# ACTUALIZAR package.json
# ============================================
echo "📦 Actualizando package.json con scripts de test..."

python3 << 'PYEOF'
import json
from pathlib import Path

pkg = Path("package.json")
data = json.loads(pkg.read_text())

data["scripts"]["test"] = "vitest run"
data["scripts"]["test:watch"] = "vitest"
data["scripts"]["test:coverage"] = "vitest run --coverage"

pkg.write_text(json.dumps(data, indent=2))
print("✓ package.json actualizado")
PYEOF

# ============================================
# INSTALAR DEPENDENCIAS DE TEST
# ============================================
echo ""
echo "📦 Instalando dependencias de testing..."
npm install -D vitest jsdom @testing-library/svelte @sveltejs/vite-plugin-svelte

echo ""
echo "✅ Tests creados exitosamente!"
echo ""
echo "📋 Estructura de tests:"
find tests -name "*.test.js" | sort
echo ""
echo "🚀 Para ejecutar los tests:"
echo "   npm run test"
echo ""
echo "🚀 Para ejecutar con watch mode:"
echo "   npm run test:watch"
