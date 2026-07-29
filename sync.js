// ================================================================
// SYNC.JS - Sincronización Offline-First con Supabase (Fase 2)
// Resolución de conflictos: gana el updated_at más reciente (Punto 43)
// ================================================================

const SyncEngine = {
  isSyncing: false,
  lastPush: null,
  lastPull: null,
  online: navigator.onLine,

  // === SUBIR: registros locales con sync_flag=0 ===
  async pushChanges() {
    if (!Auth.usuario || !Auth.perfil || this.isSyncing) return;
    if (!navigator.onLine) return;
    this.isSyncing = true;
    try {
      const tables = ['productos','variantes','lotes','ventas','compras','ajustes','arqueos','mov_caja','cierres','capital','retiros','gastos'];
      const tiendaId = Auth.perfil.tienda_id;
      let totalPushed = 0;

      for (const t of tables) {
        const pending = await db.table(t).where('tienda_id').equals(tiendaId).filter(r => r.sync_flag === 0 || r.sync_flag === undefined).toArray();
        if (pending.length === 0) continue;

        const recordsToPush = pending.map(r => {
          const { sync_flag, ...rest } = r;
          // Garantizar que el registro tiene tienda_id
          return { ...rest, tienda_id: tiendaId, usuario_id: Auth.perfil.id };
        });

        const { error } = await Auth.sb.from(t).upsert(recordsToPush, { onConflict: 'id' });
        if (error) {
          console.warn(`[sync] push ${t} error:`, error.message);
          continue;
        }
        // Marcar como sincronizados
        await db.table(t).bulkPut(pending.map(r => ({ ...r, sync_flag: 1 })));
        totalPushed += pending.length;
      }

      // Configuración de tienda
      const cfgRow = await db.config.get('cfg');
      if (cfgRow) {
        const { data: tienda } = await Auth.sb.from('tiendas').select('id').eq('id', tiendaId).single();
        if (tienda) {
          await Auth.sb.from('tiendas').update({ cfg: cfgRow.value, updated_at: new Date().toISOString() }).eq('id', tiendaId);
        }
      }

      this.lastPush = new Date().toISOString();
      if (totalPushed > 0) {
        console.log(`[sync] ↑ ${totalPushed} registros subidos`);
      }
    } catch (e) {
      console.error('[sync] push error:', e);
    } finally {
      this.isSyncing = false;
    }
  },

  // === BAJAR: traer cambios remotos a local (Punto 5/49) ===
  async pullChanges() {
    if (!Auth.usuario || !Auth.perfil) return;
    if (!navigator.onLine) return;
    try {
      const tiendaId = Auth.perfil.tienda_id;
      const tables = ['productos','variantes','lotes','ventas','compras','ajustes','arqueos','mov_caja','capital','retiros','gastos','perfiles'];
      let totalPulled = 0;

      for (const t of tables) {
        const { data, error } = await Auth.sb.from(t).select('*').eq('tienda_id', tiendaId);
        if (error) { console.warn(`[sync] pull ${t}:`, error.message); continue; }
        if (!data || data.length === 0) continue;

        // Resolución de conflictos: updated_at más reciente gana
        const remotos = await Promise.all(data.map(async r => {
          const local = await db.table(t).get(r.id);
          if (!local) return { ...r, sync_flag: 1 };
          // Si local tiene cambios pendientes (sync_flag=0), no pisar
          if (local.sync_flag === 0) return null;
          // Si el remoto es más nuevo, gana
          const localTs = new Date(local.updated_at || 0).getTime();
          const remoteTs = new Date(r.updated_at || 0).getTime();
          if (remoteTs > localTs) return { ...r, sync_flag: 1 };
          return null;
        }));
        const paraGuardar = remotos.filter(x => x !== null);
        if (paraGuardar.length > 0) {
          await db.table(t).bulkPut(paraGuardar);
          totalPulled += paraGuardar.length;
        }
      }

      this.lastPull = new Date().toISOString();
      if (totalPulled > 0) {
        console.log(`[sync] ↓ ${totalPulled} registros descargados`);
      }
    } catch (e) {
      console.error('[sync] pull error:', e);
    }
  },

  // === Sync completo (push + pull) ===
  async syncNow() {
    if (!navigator.onLine) return false;
    await this.pushChanges();
    await this.pullChanges();
    return true;
  },

  // === Init: engancha online/offline y auto-sync cada 30s ===
  init() {
    window.addEventListener('online', () => {
      this.online = true;
      this.syncNow();
    });
    window.addEventListener('offline', () => { this.online = false; });

    setInterval(() => {
      if (navigator.onLine && Auth.usuario) {
        this.pushChanges();
      }
    }, 30000);

    // Sincronización inicial al cargar (silenciosa)
    if (navigator.onLine && Auth.usuario) {
      setTimeout(() => this.syncNow(), 2000);
    }
  }
};

window.SyncEngine = SyncEngine;
