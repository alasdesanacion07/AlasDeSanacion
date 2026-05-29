import { getSupabase } from './auth.js';

export async function getSiteSettings() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('site_settings')
    .select('telefono_notificaciones, callmebot_api_key')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;

  return data ?? {
    telefono_notificaciones: '573204744197',
    callmebot_api_key: '',
  };
}

export async function saveSiteSettings({ telefono_notificaciones, callmebot_api_key }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('site_settings')
    .upsert(
      {
        id: 1,
        telefono_notificaciones: normalizePhone(telefono_notificaciones),
        callmebot_api_key: callmebot_api_key?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length === 12) return digits;
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

export function formatPhoneDisplay(phone) {
  const n = normalizePhone(phone);
  if (n.length === 12 && n.startsWith('57')) {
    return `+57 ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
  }
  return `+${n}`;
}
