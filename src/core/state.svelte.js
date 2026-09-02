// Barrel file: re-exporta todo desde los modulos especializados
// para mantener compatibilidad con todos los imports existentes.

// UI: tema, toast, confirm, prompt, offline
export {
  ui, aplicarTema, alternarTema,
  avisar, confirmar, cerrarConfirm,
  preguntar, cerrarPrompt
} from './ui.svelte.js';

// Auth: PIN, PBKDF2, rate limiting, config
export { pedirPIN, guardarCfg, cargarCfg } from './auth.svelte.js';

// Sync: online/offline handlers, webhook queue (auto-inicializado al importar)
import './sync.svelte.js';
