// ================================================================
// AUTH.JS - Autenticación, Roles, Gestión de Empleados (Fase 2)
// ================================================================

const SUPABASE_URL = 'https://chstqhjoizljlpegehdkn.supabase.co';
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
    if (!data.session) return null;
    Auth.usuario = data.session.user;
    return await cargarPerfil(data.session.user.id);
  } catch (e) {
    console.warn('restaurarSesion:', e);
    return null;
  }
}

async function cargarPerfil(userId) {
  try {
    const { data: perf, error } = await sb
      .from('perfiles')
      .select('*, tiendas(*)')
      .eq('id', userId)
      .single();
    if (error || !perf) {
      console.warn('No se pudo cargar perfil:', error?.message);
      return null;
    }
    if (!perf.activo) {
      // Punto 46: Borrado remoto
      await sb.auth.signOut();
      Auth.usuario = null;
      Auth.perfil = null;
      Auth.tienda = null;
      return { bloqueado: true };
    }
    Auth.perfil = perf;
    Auth.tienda = perf.tiendas;
    return perf;
  } catch (e) {
    console.warn('cargarPerfil:', e);
    return null;
  }
}

async function iniciarSesion(email, password) {
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Correo o contraseña incorrectos.');
    Auth.usuario = data.user;
    const perf = await cargarPerfil(data.user.id);
    if (!perf) throw new Error('No tienes perfil asignado en ninguna tienda.');
    if (perf.bloqueado) throw new Error('Tu usuario fue desactivado remotamente. Contacta al administrador.');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function registrarTienda(email, password, nombreTienda) {
  try {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    const userId = data.user.id;

    // 1. Crear tienda
    const cfgDefecto = { tema:'light', colorPri:'azul', moneda:'$', nombre:nombreTienda, pinActivo:false, pin:'', periodoInicio:new Date().toISOString(), capitalInicial:0, ultimoExport:null };
    const { data: tiendaData, error: tiendaError } = await sb
      .from('tiendas')
      .insert([{ nombre: nombreTienda, cfg: cfgDefecto }])
      .select()
      .single();
    if (tiendaError) throw tiendaError;

    // 2. Crear perfil admin
    const { error: perfilError } = await sb
      .from('perfiles')
      .insert([{ id: userId, tienda_id: tiendaData.id, username: 'admin', rol: 'admin', activo: true }]);
    if (perfilError) throw perfilError;

    // 3. Auto-login
    return await iniciarSesion(email, password);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function cerrarSesion() {
  try { await sb.auth.signOut(); } catch(e) {}
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
