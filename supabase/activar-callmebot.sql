-- Guardar teléfono y API Key de CallMeBot
-- Ejecutar en Supabase SQL Editor

INSERT INTO public.site_settings (id, telefono_notificaciones, callmebot_api_key)
VALUES (1, '573204744197', '2482363')
ON CONFLICT (id) DO UPDATE SET
  telefono_notificaciones = EXCLUDED.telefono_notificaciones,
  callmebot_api_key = EXCLUDED.callmebot_api_key,
  updated_at = NOW();
