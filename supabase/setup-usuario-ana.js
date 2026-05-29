/**
 * Script para crear el usuario administrador Ana en Supabase.
 * Ejecutar con: node supabase/setup-usuario-ana.js
 *
 * Requiere haber ejecutado schema.sql primero en el SQL Editor.
 */

const SUPABASE_URL = 'https://dfgfjiasjyvfdrneqydu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dVaokbKpER5OTVt3ipw_AA_H4psKv2z';

const ADMIN = {
  email: 'annycerinza17@gmail.com',
  password: '53040012',
  username: 'Ana',
};

async function setupAdmin() {
  console.log('Creando usuario administrador Ana...\n');

  const signUpRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: ADMIN.email,
      password: ADMIN.password,
      data: { username: ADMIN.username },
    }),
  });

  const signUpData = await signUpRes.json();

  if (signUpRes.ok) {
    console.log('Usuario creado correctamente.');
    console.log('Email:', ADMIN.email);
    console.log('Usuario:', ADMIN.username);
    console.log('Contraseña:', ADMIN.password);
    if (signUpData.user && !signUpData.user.email_confirmed_at) {
      console.log('\nNota: Confirma el correo en Supabase Dashboard si el login falla.');
    }
    return;
  }

  if (
    signUpData.msg?.includes('already registered') ||
    signUpData.error_description?.includes('already registered') ||
    signUpData.message?.includes('already registered')
  ) {
    console.log('El usuario ya existe. Intentando login de verificación...');
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: ADMIN.email,
        password: ADMIN.password,
      }),
    });
    const loginData = await loginRes.json();
    if (loginRes.ok) {
      console.log('Login verificado correctamente. Credenciales válidas.');
    } else {
      console.error('Error en login:', loginData);
    }
    return;
  }

  console.error('Error al crear usuario:', signUpData);
}

setupAdmin().catch(console.error);
