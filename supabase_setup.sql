-- ================================================================
-- DOCUMENTO MAESTRO: FASE 2 APP "TIENDA PRO" - ESTRUCTURA SQL COMPLETA
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> Run
-- ================================================================

-- 1. Tiendas
CREATE TABLE IF NOT EXISTS tiendas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  cfg JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Perfiles
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'admin',
  activo BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sesiones
CREATE TABLE IF NOT EXISTS sesiones (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ DEFAULT NOW(),
  fin TIMESTAMPTZ
);

-- 4. Productos
CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  nombre TEXT NOT NULL,
  codigo TEXT,
  precio NUMERIC(12,2) DEFAULT 0,
  stock_min NUMERIC(12,3) DEFAULT 5,
  unidad TEXT DEFAULT '',
  archivado BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Variantes
CREATE TABLE IF NOT EXISTS variantes (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  producto_id TEXT REFERENCES productos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  codigo TEXT,
  precio NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Lotes (Inventario FIFO)
CREATE TABLE IF NOT EXISTS lotes (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  producto_id TEXT REFERENCES productos(id) ON DELETE CASCADE,
  compra_id TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  cantidad_inicial NUMERIC(12,3) DEFAULT 0,
  cantidad_vendida NUMERIC(12,3) DEFAULT 0,
  costo NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Ventas
CREATE TABLE IF NOT EXISTS ventas (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC(12,2) DEFAULT 0,
  ganancia NUMERIC(12,2) DEFAULT 0,
  nota TEXT DEFAULT '',
  anulada BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Compras
CREATE TABLE IF NOT EXISTS compras (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  producto_id TEXT REFERENCES productos(id) ON DELETE CASCADE,
  producto_nombre TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  cantidad NUMERIC(12,3) DEFAULT 0,
  costo NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  unidad TEXT DEFAULT '',
  anulada BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Ajustes (Mermas / Sobrantes)
CREATE TABLE IF NOT EXISTS ajustes (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  producto_id TEXT REFERENCES productos(id) ON DELETE CASCADE,
  producto_nombre TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  cantidad NUMERIC(12,3) DEFAULT 0,
  motivo TEXT DEFAULT '',
  costo_perdida NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Arqueos de Caja
CREATE TABLE IF NOT EXISTS arqueos (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  sistema NUMERIC(12,2) DEFAULT 0,
  fisico NUMERIC(12,2) DEFAULT 0,
  diferencia NUMERIC(12,2) DEFAULT 0,
  tipo TEXT DEFAULT '',
  nota TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Movimientos de Caja
CREATE TABLE IF NOT EXISTS mov_caja (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  concepto TEXT DEFAULT '',
  monto NUMERIC(12,2) DEFAULT 0,
  tipo TEXT DEFAULT 'ingreso',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Cierres de Período
CREATE TABLE IF NOT EXISTS cierres (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  periodo TEXT DEFAULT '',
  fecha_cierre TIMESTAMPTZ DEFAULT NOW(),
  total_ventas NUMERIC(12,2) DEFAULT 0,
  ganancia NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Capital (Aportes)
CREATE TABLE IF NOT EXISTS capital (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  monto NUMERIC(12,2) DEFAULT 0,
  nota TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Retiros de Ganancia
CREATE TABLE IF NOT EXISTS retiros (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  monto NUMERIC(12,2) DEFAULT 0,
  concepto TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Gastos Operativos
CREATE TABLE IF NOT EXISTS gastos (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  monto NUMERIC(12,2) DEFAULT 0,
  concepto TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Bitácora de Auditoría
CREATE TABLE IF NOT EXISTS bitacora (
  id TEXT PRIMARY KEY,
  tienda_id TEXT REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID,
  usuario_nombre TEXT,
  accion TEXT NOT NULL,
  detalle TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE ajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE arqueos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mov_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE retiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS LIMPIAS SIN RECURSIÓN
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['tiendas','perfiles','sesiones','productos','variantes','lotes','ventas','compras','ajustes','arqueos','mov_caja','cierres','capital','retiros','gastos','bitacora'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "permitir_todo_%s" ON %I;', t, t);
    EXECUTE format('CREATE POLICY "permitir_todo_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;
