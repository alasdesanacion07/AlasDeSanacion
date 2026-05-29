import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

export async function requireAuth(redirectTo = 'login.html') {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

export async function signIn(email, password, username) {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Correo o contraseña incorrectos.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, email')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    throw new Error('Perfil de administrador no encontrado.');
  }

  if (profile.username.toLowerCase() !== username.toLowerCase()) {
    await supabase.auth.signOut();
    throw new Error('El nombre de usuario no coincide.');
  }

  if (profile.email.toLowerCase() !== email.toLowerCase()) {
    await supabase.auth.signOut();
    throw new Error('El correo no coincide con el perfil.');
  }

  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

export function initAdminNav(activePage) {
  document.querySelectorAll('.admin-nav a').forEach((link) => {
    if (link.dataset.page === activePage) link.classList.add('active');
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      signOut();
    });
  }
}
