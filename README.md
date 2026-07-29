# Tienda Pro — PWA POS (Fase 2)

Sistema de Punto de Venta y gestión de tienda. Funciona 100% offline y sincroniza con Supabase cuando hay internet.

## Stack
- **Vue 3** (CDN, sin build step)
- **Dexie.js** (IndexedDB)
- **Supabase** (Auth + Postgres)
- **Chart.js** (gráficos)
- **GitHub Pages** (hosting)

## Estructura
```
├── index.html          # Template + carga de librerías y módulos
├── style.css           # Todos los estilos (tema oscuro, responsive, sidebar)
├── db.js               # Dexie + motor matemático blindado (centavos)
├── auth.js             # Login, registro, roles, empleados, bitácora
├── sync.js             # Push/pull a Supabase + resolución de conflictos
├── core.js             # Vue app (dashboard, ventas, compras, etc.)
├── modules/
│   └── loader.js       # Sistema de plugins cerrado
├── modules.json        # Registro de plugins
├── sw.js               # Service Worker offline
├── manifest.json       # PWA manifest
└── icon-*.png          # Iconos
```

## Roles
- **admin**: ve todo, puede anular ventas, gestionar empleados, ver reportes
- **cajero**: solo ve Ventas y Caja

## Sistema de plugins
Para agregar un módulo, crea `modules/mi-modulo.js` con este formato:
```js
window.miModulo = async function(api) {
  api.log('cargado');
  api.registerComponent('mi-componente', { ... });
};
```
Y agrégalo a `modules.json`:
```json
{ "id": "mi-modulo", "version": "1.0.0", "entry": "./modules/mi-modulo.js", "exportName": "miModulo", "enabled": true }
```

## Seguridad
**Importante**: Activar Row Level Security (RLS) en Supabase en TODAS las tablas. Las políticas deben limitar lectura/escritura al `tienda_id` del usuario autenticado.
