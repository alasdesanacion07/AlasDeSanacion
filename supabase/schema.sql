-- ============================================================
-- Alas de Sanación - Script de base de datos Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de perfiles de administradores
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  celular TEXT NOT NULL,
  correo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de consultas (historia clínica)
CREATE TABLE IF NOT EXISTS public.consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  titulo TEXT DEFAULT 'Consulta',
  contenido TEXT NOT NULL DEFAULT '',
  fecha_consulta TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de notificaciones de cumpleaños enviadas
CREATE TABLE IF NOT EXISTS public.birthday_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  notified_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(client_id, notified_at)
);

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_clients_nombre ON public.clients(nombre);
CREATE INDEX IF NOT EXISTS idx_clients_celular ON public.clients(celular);
CREATE INDEX IF NOT EXISTS idx_clients_correo ON public.clients(correo);
CREATE INDEX IF NOT EXISTS idx_clients_fecha_nacimiento ON public.clients(fecha_nacimiento);
CREATE INDEX IF NOT EXISTS idx_consultas_client_id ON public.consultas(client_id);

-- Trigger para updated_at en clients
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_updated_at ON public.clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: crear perfil al registrarse un admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: solo el propio usuario
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Clients: solo admins autenticados
DROP POLICY IF EXISTS "clients_select" ON public.clients;
CREATE POLICY "clients_select" ON public.clients
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "clients_insert" ON public.clients;
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "clients_update" ON public.clients;
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "clients_delete" ON public.clients;
CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE TO authenticated USING (true);

-- Consultas: solo admins autenticados
DROP POLICY IF EXISTS "consultas_select" ON public.consultas;
CREATE POLICY "consultas_select" ON public.consultas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "consultas_insert" ON public.consultas;
CREATE POLICY "consultas_insert" ON public.consultas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "consultas_update" ON public.consultas;
CREATE POLICY "consultas_update" ON public.consultas
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "consultas_delete" ON public.consultas;
CREATE POLICY "consultas_delete" ON public.consultas
  FOR DELETE TO authenticated USING (true);

-- Birthday notifications
DROP POLICY IF EXISTS "birthday_notifications_all" ON public.birthday_notifications;
CREATE POLICY "birthday_notifications_all" ON public.birthday_notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Vista: cumpleaños de hoy
-- ============================================================
CREATE OR REPLACE VIEW public.cumpleanos_hoy AS
SELECT
  c.id,
  c.nombre,
  c.fecha_nacimiento,
  c.celular,
  c.correo,
  EXTRACT(YEAR FROM AGE(c.fecha_nacimiento))::INT AS edad
FROM public.clients c
WHERE EXTRACT(MONTH FROM c.fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM c.fecha_nacimiento) = EXTRACT(DAY FROM CURRENT_DATE);

GRANT SELECT ON public.cumpleanos_hoy TO authenticated;
