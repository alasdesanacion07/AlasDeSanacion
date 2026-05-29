-- ============================================================
-- Crear usuario administrador: Ana
-- IMPORTANTE: Ejecutar DESPUÉS de schema.sql
--
-- Paso 1: Crear usuario en Supabase Dashboard:
--   Authentication > Users > Add user > Create new user
--   Email: annycerinza17@gmail.com
--   Password: 53040012
--   Auto Confirm User: YES
--
-- Paso 2: Ejecutar este SQL para vincular el username "Ana"
-- (Reemplaza si el trigger ya creó el perfil automáticamente)
-- ============================================================

-- Actualizar username del perfil de Ana
UPDATE public.profiles
SET username = 'Ana'
WHERE email = 'annycerinza17@gmail.com';

-- Si el perfil no existe (usuario creado manualmente sin trigger):
INSERT INTO public.profiles (id, username, email)
SELECT id, 'Ana', 'annycerinza17@gmail.com'
FROM auth.users
WHERE email = 'annycerinza17@gmail.com'
ON CONFLICT (id) DO UPDATE SET username = 'Ana';
