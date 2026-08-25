# 🛒 Tienda Pro v6

**Punto de venta offline-first, instalable como PWA.**

App web para gestionar ventas, compras, inventario y caja de un negocio. Funciona sin internet, se instala en el dispositivo como app nativa (Android/iOS/PC) y sincroniza datos localmente con Dexie (IndexedDB).

Publicada automáticamente en **GitHub Pages** vía GitHub Actions.

---

## 📱 Características

- **Offline-first**: toda la data vive en el navegador (IndexedDB con Dexie).
- **PWA instalable**: manifiesto + service worker (vite-plugin-pwa).
- **Modo oscuro** con un toque.
- **PIN de seguridad** para operaciones sensibles.
- **Respaldo / restauración** en JSON.
- **Multi-módulo**: cada sección del negocio es un módulo independiente.
- **Cero backend**: GitHub Pages sirve archivos estáticos, sin servidor.

---

## 🏗️ Arquitectura modular

El corazón de la app es el **core** (
