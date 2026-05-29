-- ============================================================
-- Notificaciones de cumpleaños por WhatsApp
-- Ejecutar en Supabase SQL Editor (después de schema.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  telefono_notificaciones TEXT NOT NULL DEFAULT '573204744197',
  callmebot_api_key TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.site_settings (id, telefono_notificaciones)
VALUES (1, '573204744197')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_select" ON public.site_settings;
CREATE POLICY "site_settings_select" ON public.site_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "site_settings_update" ON public.site_settings;
CREATE POLICY "site_settings_update" ON public.site_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "site_settings_insert" ON public.site_settings;
CREATE POLICY "site_settings_insert" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (id = 1);

-- Programar envío diario a las 8:00 AM (hora Colombia, UTC-5 = 13:00 UTC)
-- Requiere extensiones pg_cron y pg_net activas en Supabase
-- Reemplaza YOUR_PROJECT_REF y YOUR_SERVICE_ROLE_KEY antes de ejecutar

/*
SELECT cron.schedule(
  'alas-cumpleanos-diario',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dfgfjiasjyvfdrneqydu.supabase.co/functions/v1/notify-birthdays',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/
