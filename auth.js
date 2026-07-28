// ================================================================
// AUTH.JS - Autenticación, Sesiones, Roles y Registro
// ================================================================

const SUPABASE_URL = 'https://chstqhjoizljlpegehdkn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoc3RxaGpvaXpsamxwZ2VoZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTczNDgsImV4cCI6MjEwMDgzMzM0OH0.SzSOCiBH4S89UjF0rwvNSg36PHANjLzYSyTy8GN3q9o';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const Auth = {
  usuario: null,
  perfil: null,
  tienda: null,
  supabase: supabase
};

// FUNCIÓN DE INICIAR SESIÓN
async function iniciarSesion(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Correo o contraseña incorrectos.");
    
    Auth.usuario = data.user;
    
    const { data: perfilData, error: perfilError } = await supabase
      .from('perfiles')
      .select('*, tiendas(*)')
      .eq('id', data.user.id)
      .single();

    if (perfilError || !perfilData) throw new Error("No tienes perfil asignado en ninguna tienda.");
    if (!perfilData.activo) throw new Error("Usuario bloqueado remotamente.");

    Auth.perfil = perfilData;
    Auth.tienda = perfilData.tiendas;
    
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// FUNCIÓN DE REGISTRAR NUEVA TIENDA Y ADMIN
async function registrarTienda(email, password, nombreTienda) {
  try {
    // 1. Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const userId = data.user.id;

    // 2. Crear la Tienda en la base de datos
    const { data: tiendaData, error: tiendaError } = await supabase
      .from('tiendas')
      .insert([{ nombre: nombreTienda, cfg: { tema: 'light', moneda: '$', nombre: nombreTienda } }])
      .select()
      .single();
    if (tiendaError) throw tiendaError;

    // 3. Crear el Perfil de Admin vinculado a esa tienda
    const { error: perfilError } = await supabase
      .from('perfiles')
      .insert([{ id: userId, tienda_id: tiendaData.id, username: 'admin', rol: 'admin', activo: true }]);
    if (perfilError) throw perfilError;

    // 4. Iniciar sesión automáticamente
    return await iniciarSesion(email, password);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function cerrarSesion() {
  await supabase.auth.signOut();
  Auth.usuario = null;
  Auth.perfil = null;
  Auth.tienda = null;
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    Auth.usuario = null;
    Auth.perfil = null;
    Auth.tienda = null;
  }
});
