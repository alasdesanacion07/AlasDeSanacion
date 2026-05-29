import { getSupabase } from './auth.js';

export async function getClientById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getClients(filterType, filterValue) {
  const supabase = getSupabase();
  let query = supabase.from('clients').select('*').order('nombre');

  if (filterValue && filterValue.trim()) {
    const val = filterValue.trim();
    switch (filterType) {
      case 'nombre':
        query = query.ilike('nombre', `%${val}%`);
        break;
      case 'celular':
        query = query.ilike('celular', `%${val}%`);
        break;
      case 'correo':
        query = query.ilike('correo', `%${val}%`);
        break;
      case 'fecha_nacimiento':
        query = query.eq('fecha_nacimiento', val);
        break;
      default:
        break;
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createClient(clientData) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('clients')
    .insert([clientData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(id, clientData) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('clients')
    .update(clientData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function getConsultas(clientId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('consultas')
    .select('*')
    .eq('client_id', clientId)
    .order('fecha_consulta', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createConsulta(clientId, titulo, contenido) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('consultas')
    .insert([{ client_id: clientId, titulo, contenido }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteConsulta(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from('consultas').delete().eq('id', id);
  if (error) throw error;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
