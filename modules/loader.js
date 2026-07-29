// ================================================================
// MODULES/LOADER.JS - Sistema de Plugins Cerrado (Fase 2)
// Lee modules.json y carga los JS extras listados. Cada módulo
// puede registrar componentes Vue, métodos o ampliar la UI.
// ================================================================

const ModuleLoader = {
  loaded: [],
  failed: [],
  manifest: null,

  async init(app, Auth, db) {
    try {
      const res = await fetch('modules.json', { cache: 'no-store' });
      if (!res.ok) {
        console.log('[modules] modules.json no encontrado o no accesible (offline?). Modo sin plugins.');
        return;
      }
      this.manifest = await res.json();
      if (!this.manifest || !Array.isArray(this.manifest.modules)) {
        console.warn('[modules] modules.json inválido');
        return;
      }
      for (const m of this.manifest.modules) {
        if (!m.enabled) continue;
        await this.load(m, app, Auth, db);
      }
    } catch (e) {
      console.warn('[modules] init error:', e.message);
    }
  },

  async load(mod, app, Auth, db) {
    const moduleAPI = {
      app,
      Auth,
      db,
      Vue,
      h,
      registerComponent(name, def) { app.component(name, def); },
      addMethod(name, fn) {
        if (app._context && app._context.config) {
          // Los métodos se inyectan a través de un mixin global
          const mixin = {
            methods: { [name]: fn }
          };
          app.mixin(mixin);
        }
      },
      log: (...args) => console.log(`[module:${mod.id}]`, ...args)
    };

    try {
      // Cargar script dinámicamente
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = mod.entry;
        s.onload = resolve;
        s.onerror = () => reject(new Error('No se pudo cargar ' + mod.entry));
        document.head.appendChild(s);
      });
      // Esperar a que la función register esté disponible
      if (typeof window[mod.exportName] === 'function') {
        await window[mod.exportName](moduleAPI);
        this.loaded.push(mod.id);
        console.log(`[modules] ✓ ${mod.id} v${mod.version || '?'} cargado`);
      } else {
        throw new Error(`Función ${mod.exportName} no encontrada después de cargar ${mod.entry}`);
      }
    } catch (e) {
      this.failed.push({ id: mod.id, error: e.message });
      console.warn(`[modules] ✗ ${mod.id} falló:`, e.message);
    }
  },

  list() { return this.loaded; },
  errors() { return this.failed; }
};

window.ModuleLoader = ModuleLoader;

// Auto-inicializar cuando el núcleo esté listo
window.addEventListener('app:ready', () => {
  // Espera un tick para que la app de Vue esté montada
  setTimeout(() => {
    ModuleLoader.init(window.__vueApp || null, window.Auth, window.db).then(() => {
      // Exponer la app para los módulos
      if (!window.__vueApp) {
        const root = document.getElementById('app');
        if (root && root.__vue_app__) window.__vueApp = root.__vue_app__;
      }
    });
  }, 100);
});
