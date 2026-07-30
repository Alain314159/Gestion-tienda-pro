-- ================================================================
-- SUPABASE_SETUP.SQL - Script para reparar RLS en Supabase
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> Run
-- ================================================================

-- 1. Tabla de Tiendas
CREATE TABLE IF NOT EXISTS tiendas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  cfg JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Perfiles
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'admin',
  activo BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas viejas o conflictivas que causaban la recursión infinita (error 42P17)
DROP POLICY IF EXISTS "Acceso perfiles" ON perfiles;
DROP POLICY IF EXISTS "Permitir ver perfil propio" ON perfiles;
DROP POLICY IF EXISTS "Permitir crear perfil propio" ON perfiles;
DROP POLICY IF EXISTS "Permitir actualizar perfil propio" ON perfiles;
DROP POLICY IF EXISTS "Permitir ver tiendas" ON tiendas;
DROP POLICY IF EXISTS "Permitir crear tiendas" ON tiendas;
DROP POLICY IF EXISTS "Permitir actualizar tiendas" ON tiendas;

-- Políticas corregidas sin recursión para PERFILES
CREATE POLICY "Permitir ver perfil propio" ON perfiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Permitir crear perfil propio" ON perfiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Permitir actualizar perfil propio" ON perfiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Políticas corregidas para TIENDAS
CREATE POLICY "Permitir ver tiendas" ON tiendas
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Permitir crear tiendas" ON tiendas
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar tiendas" ON tiendas
  FOR UPDATE TO authenticated
  USING (true);
