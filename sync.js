// ================================================================
// SYNC.JS - Sincronización Offline-First con Supabase
// ================================================================

const SyncEngine = {
  isSyncing: false,

  async pushChanges() {
    if (!Auth.usuario || this.isSyncing) return;
    this.isSyncing = true;

    try {
      const tables = ['ventas', 'compras', 'ajustes', 'arqueos', 'mov_caja', 'cierres', 'capital', 'retiros', 'gastos', 'productos', 'lotes'];
      
      for (const t of tables) {
        const pending = await db.table(t).where('sync_flag').equals(0).toArray();
        if (pending.length === 0) continue;

        const recordsToPush = pending.map(r => {
          const { sync_flag, ...rest } = r;
          return { ...rest, tienda_id: Auth.perfil.tienda_id, usuario_id: Auth.perfil.id };
        });

        const { error } = await Auth.supabase.from(t).upsert(recordsToPush);
        
        if (!error) {
          const ids = pending.map(r => r.id);
          await db.table(t).bulkPut(pending.map(r => ({ ...r, sync_flag: 1 })));
        }
      }
    } catch (e) {
      console.error("Error sincronizando:", e.message);
    } finally {
      this.isSyncing = false;
    }
  },

  async pullChanges() {
    if (!Auth.usuario) return;
    try {
      const tables = ['productos', 'ventas', 'compras', 'lotes'];
      for (const t of tables) {
        const { data, error } = await Auth.supabase.from(t).select('*').eq('tienda_id', Auth.perfil.tienda_id);
        if (data && data.length > 0) {
          const mapped = data.map(r => ({ ...r, sync_flag: 1 }));
          await db.table(t).bulkPut(mapped);
        }
      }
    } catch (e) {
      console.error("Error descargando datos:", e.message);
    }
  },

  init() {
    window.addEventListener('online', () => {
      this.pushChanges();
      this.pullChanges();
    });
    setInterval(() => {
      if (navigator.onLine) {
        this.pushChanges();
      }
    }, 30000); // Intenta subir cada 30 segundos si hay internet
  }
};