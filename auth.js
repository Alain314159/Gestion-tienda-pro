// ================================================================
// AUTH.JS - Autenticación, Roles, Gestión de Empleados (Fase 2)
// ================================================================

const SUPABASE_URL = 'https://chstqhjoizljlpgehdkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoc3RxaGpvaXpsamxwZ2VoZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTczNDgsImV4cCI6MjEwMDgzMzM0OH0.SzSOCiBH4S89UjF0rwvNSg36PHANjLzYSyTy8GN3q9o';

// ⚠️ Cliente: 'sb' para no chocar con window.supabase de la UMD
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const Auth = {
  usuario: null,
  perfil: null,
  tienda: null,
  sb: sb
};
window.Auth = Auth;
window.sb = sb;

// === Sesión ===
async function restaurarSesion() {
  try {
    const { data } = await sb.auth.getSession();
    if (data?.session?.user) {
      Auth.usuario = data.session.user;
      return await cargarPerfil(data.session.user.id);
    }
    // Fallback local si el usuario inició sesión previamente pero está offline o sin sesión remota activa
    if (localStorage.getItem('tienda_logged_in') === 'true') {
      const perfilesLocales = await db.perfiles.toArray();
      if (perfilesLocales.length > 0) {
        const perf = perfilesLocales[0];
        const tienda = await db.tiendas.get(perf.tienda_id);
        Auth.usuario = { id: perf.id, email: perf.username + '@local' };
        Auth.perfil = perf;
        Auth.tienda = tienda || { id: perf.tienda_id, nombre: 'Mi Tienda' };
        return perf;
      }
    }
    return null;
  } catch (e) {
    console.warn('restaurarSesion:', e);
    return null;
  }
}

async function cargarPerfil(userId) {
  try {
    let perf = null;

    // 1. Intentar desde Supabase si hay red
    if (navigator.onLine) {
      try {
        const { data, error } = await sb
          .from('perfiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) {
          perf = data;
          if (perf.tienda_id) {
            const { data: tData } = await sb.from('tiendas').select('*').eq('id', perf.tienda_id).maybeSingle();
            if (tData) perf.tiendas = tData;
          }
          if (perf.tiendas) {
            Auth.tienda = perf.tiendas;
            await P(db.tiendas, perf.tiendas);
          }
          await P(db.perfiles, perf);
        } else if (error) {
          console.warn('No se pudo cargar perfil de Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Error conectando a Supabase al cargar perfil:', e);
      }
    }

    // 2. Fallback a IndexedDB local
    if (!perf) {
      perf = await db.perfiles.get(userId);
      if (perf) {
        const tienda = await db.tiendas.get(perf.tienda_id);
        if (tienda) {
          perf.tiendas = tienda;
          Auth.tienda = tienda;
        }
      }
    }

    if (!perf) {
      console.warn('Perfil no encontrado ni en Supabase ni en IndexedDB para:', userId);
      return null;
    }

    if (!perf.activo) {
      try { await sb.auth.signOut(); } catch(e) {}
      localStorage.removeItem('tienda_logged_in');
      Auth.usuario = null;
      Auth.perfil = null;
      Auth.tienda = null;
      return { bloqueado: true };
    }

    Auth.perfil = perf;
    if (!Auth.tienda && perf.tiendas) {
      Auth.tienda = perf.tiendas;
    }
    localStorage.setItem('tienda_logged_in', 'true');
    return perf;
  } catch (e) {
    console.warn('cargarPerfil:', e);
    return null;
  }
}

async function iniciarSesion(email, password) {
  try {
    let user = null;

    if (navigator.onLine) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        console.warn('signInWithPassword error:', error.message);
      } else {
        user = data.user;
      }
    } else {
      const sessionRes = await sb.auth.getSession();
      if (sessionRes?.data?.session?.user) {
        user = sessionRes.data.session.user;
      }
    }

    // Si tenemos usuario remoto
    if (user) {
      Auth.usuario = user;
      const perf = await cargarPerfil(user.id);
      if (perf?.bloqueado) throw new Error('Tu usuario fue desactivado remotamente. Contacta al administrador.');
      if (perf) {
        localStorage.setItem('tienda_logged_in', 'true');
        return { success: true };
      }
    }

    // Intentar login con datos locales si offline o si no encontró perfil en Supabase
    const perfilesLocales = await db.perfiles.toArray();
    if (perfilesLocales.length > 0) {
      const perf = perfilesLocales[0];
      const tienda = await db.tiendas.get(perf.tienda_id);
      Auth.usuario = { id: perf.id, email: email };
      Auth.perfil = perf;
      Auth.tienda = tienda || { id: perf.tienda_id, nombre: 'Mi Tienda' };
      localStorage.setItem('tienda_logged_in', 'true');
      return { success: true };
    }

    throw new Error('Correo o contraseña incorrectos, o no existe la tienda asignada.');
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function registrarTienda(email, password, nombreTienda) {
  try {
    let userId = null;
    let supabaseErrorMsg = null;

    if (navigator.onLine) {
      try {
        const { data, error } = await sb.auth.signUp({ email, password });

        if (error) {
          const errorMsg = (error.message || '').toLowerCase();
          if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || error.status === 400) {
            const loginRes = await sb.auth.signInWithPassword({ email, password });
            if (!loginRes.error && loginRes.data?.user) {
              userId = loginRes.data.user.id;
              const perfExist = await cargarPerfil(userId);
              if (perfExist && perfExist.tienda_id) {
                Auth.usuario = loginRes.data.user;
                localStorage.setItem('tienda_logged_in', 'true');
                return { success: true };
              }
            } else {
              supabaseErrorMsg = 'El correo ya existe en Supabase o la contraseña no coincide.';
            }
          } else {
            supabaseErrorMsg = error.message;
          }
        } else if (data?.user) {
          userId = data.user.id;
        }
      } catch (e) {
        supabaseErrorMsg = e.message;
      }
    }

    // Si no se obtuvo userId de Supabase (por offline o por error de Supabase), usar ID local
    if (!userId) {
      userId = genId('u_');
    }

    // 1. Crear Objeto Tienda
    const tiendaId = genId('t_');
    const cfgDefecto = {
      tema: 'light',
      colorPri: 'azul',
      moneda: '$',
      nombre: nombreTienda,
      pinActivo: false,
      pin: '',
      periodoInicio: new Date().toISOString(),
      capitalInicial: 0,
      ultimoExport: null
    };
    const tiendaObj = {
      id: tiendaId,
      nombre: nombreTienda,
      cfg: cfgDefecto,
      updated_at: new Date().toISOString()
    };

    // Guardar en Dexie IndexedDB (Garantía Local Offline-First)
    await P(db.tiendas, tiendaObj);
    await db.config.put({ key: 'cfg', value: cfgDefecto });

    // Intentar guardar en Supabase si hay red y userId remoto
    if (navigator.onLine && userId && !userId.startsWith('u_')) {
      try {
        await sb.from('tiendas').insert([{ id: tiendaId, nombre: nombreTienda, cfg: cfgDefecto }]);
      } catch (e) { console.warn('Supabase tiendas insert:', e); }
    }

    // 2. Crear Objeto Perfil Admin
    const perfilObj = {
      id: userId,
      tienda_id: tiendaId,
      username: 'admin',
      rol: 'admin',
      activo: true,
      updated_at: new Date().toISOString()
    };

    // Guardar en Dexie IndexedDB (Garantía Local Offline-First)
    await P(db.perfiles, perfilObj);

    // Intentar guardar en Supabase si hay red y userId remoto
    if (navigator.onLine && userId && !userId.startsWith('u_')) {
      try {
        await sb.from('perfiles').insert([perfilObj]);
      } catch (e) { console.warn('Supabase perfiles insert:', e); }
    }

    // 3. Establecer sesión activa en la aplicación
    Auth.usuario = { id: userId, email: email };
    Auth.perfil = perfilObj;
    Auth.tienda = tiendaObj;
    localStorage.setItem('tienda_logged_in', 'true');

    if (supabaseErrorMsg) {
      console.warn('Nota de Supabase al registrar tienda:', supabaseErrorMsg);
    }

    return { success: true };
  } catch (e) {
    console.error('Error en registrarTienda, ejecutando fallback local:', e);
    try {
      const uId = genId('u_');
      const tId = genId('t_');
      const cfgDefecto = { tema:'light', colorPri:'azul', moneda:'$', nombre:nombreTienda, pinActivo:false, pin:'', periodoInicio:new Date().toISOString(), capitalInicial:0, ultimoExport:null };
      const tObj = { id: tId, nombre: nombreTienda, cfg: cfgDefecto, updated_at: new Date().toISOString() };
      const pObj = { id: uId, tienda_id: tId, username: 'admin', rol: 'admin', activo: true, updated_at: new Date().toISOString() };
      await P(db.tiendas, tObj);
      await P(db.perfiles, pObj);
      await db.config.put({ key: 'cfg', value: cfgDefecto });
      Auth.usuario = { id: uId, email: email };
      Auth.perfil = pObj;
      Auth.tienda = tObj;
      localStorage.setItem('tienda_logged_in', 'true');
      return { success: true };
    } catch (errLocal) {
      return { success: false, error: errLocal.message };
    }
  }
}

async function cerrarSesion() {
  try { await sb.auth.signOut(); } catch(e) {}
  localStorage.removeItem('tienda_logged_in');
  Auth.usuario = null;
  Auth.perfil = null;
  Auth.tienda = null;
}

// === Gestión de empleados (solo admin) ===
async function listarEmpleados() {
  if (!Auth.perfil) return [];
  const { data, error } = await sb
    .from('perfiles')
    .select('*')
    .eq('tienda_id', Auth.perfil.tienda_id)
    .order('rol', { ascending: true });
  if (error) { console.warn(error); return []; }
  return data || [];
}

async function crearEmpleado(username, password, rol) {
  if (!Auth.perfil || Auth.perfil.rol !== 'admin') {
    return { success: false, error: 'Solo el admin puede crear empleados' };
  }
  try {
    // Crea el usuario en Supabase Auth usando un cliente temporal con anon key
    // NOTA: la mejor práctica es usar una función serverless o el SDK admin,
    // pero aquí simplificamos creando el perfil y delegando al admin que pase la contraseña.
    // En esta versión, la contraseña la establece el admin en Supabase Dashboard
    // o usa signUp (que requiere email confirmation si está activado en Supabase).
    const email = `${username}@${Auth.tienda.nombre.replace(/\s+/g, '').toLowerCase()}.local`;
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    const userId = data.user?.id;
    if (!userId) throw new Error('No se pudo crear el usuario');
    const { error: perfilError } = await sb
      .from('perfiles')
      .insert([{ id: userId, tienda_id: Auth.perfil.tienda_id, username, rol, activo: true }]);
    if (perfilError) throw perfilError;
    return { success: true, email, tempPassword: password };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function toggleEmpleadoActivo(perfilId, activo) {
  if (!Auth.perfil || Auth.perfil.rol !== 'admin') {
    return { success: false, error: 'Sin permisos' };
  }
  if (perfilId === Auth.perfil.id) {
    return { success: false, error: 'No puedes desactivarte a ti mismo' };
  }
  try {
    const { error } = await sb
      .from('perfiles')
      .update({ activo, updated_at: new Date().toISOString() })
      .eq('id', perfilId);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function eliminarEmpleado(perfilId) {
  if (!Auth.perfil || Auth.perfil.rol !== 'admin') {
    return { success: false, error: 'Sin permisos' };
  }
  if (perfilId === Auth.perfil.id) {
    return { success: false, error: 'No puedes eliminarte a ti mismo' };
  }
  try {
    const { error } = await sb.from('perfiles').delete().eq('id', perfilId);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// === Bitácora de auditoría (Punto 47) ===
async function bitacora(accion, detalle = {}) {
  if (!Auth.perfil) return;
  try {
    const reg = {
      id: genId('b'),
      tienda_id: Auth.perfil.tienda_id,
      usuario_id: Auth.perfil.id,
      usuario_nombre: Auth.perfil.username,
      accion,
      detalle: JSON.stringify(detalle),
      fecha: new Date().toISOString()
    };
    await P(db.bitacora, reg);
    // Subir a Supabase (no bloqueante)
    sb.from('bitacora').insert([reg]).then(() => {}).catch(() => {});
  } catch (e) { console.warn('bitacora:', e); }
}

// === Verificar si el usuario sigue activo (polling cada 60s, Punto 46) ===
let _bloqueoPollInterval = null;
function iniciarChequeoRemoto() {
  if (_bloqueoPollInterval) clearInterval(_bloqueoPollInterval);
  _bloqueoPollInterval = setInterval(async () => {
    if (!Auth.usuario) return;
    try {
      const { data } = await sb.from('perfiles').select('activo').eq('id', Auth.usuario.id).single();
      if (data && data.activo === false) {
        clearInterval(_bloqueoPollInterval);
        Auth.usuario = null;
        Auth.perfil = null;
        Auth.tienda = null;
        try { await sb.auth.signOut(); } catch(e) {}
        alert('Tu cuenta fue desactivada remotamente. La sesión se cerrará.');
        location.reload();
      }
    } catch (e) { /* silencioso */ }
  }, 60000);
}

// === Listeners de auth ===
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    Auth.usuario = null;
    Auth.perfil = null;
    Auth.tienda = null;
  }
});

// Exponer funciones globales
window.iniciarSesion = iniciarSesion;
window.registrarTienda = registrarTienda;
window.cerrarSesion = cerrarSesion;
window.restaurarSesion = restaurarSesion;
window.listarEmpleados = listarEmpleados;
window.crearEmpleado = crearEmpleado;
window.toggleEmpleadoActivo = toggleEmpleadoActivo;
window.eliminarEmpleado = eliminarEmpleado;
window.bitacora = bitacora;
window.iniciarChequeoRemoto = iniciarChequeoRemoto;
