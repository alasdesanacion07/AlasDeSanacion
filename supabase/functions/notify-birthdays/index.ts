import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length === 12) return digits;
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settings } = await supabase
      .from('site_settings')
      .select('telefono_notificaciones, callmebot_api_key')
      .eq('id', 1)
      .maybeSingle();

    const phone = normalizePhone(settings?.telefono_notificaciones ?? '573204744197');
    const apiKey = settings?.callmebot_api_key || Deno.env.get('CALLMEBOT_API_KEY') || '';

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          sent: false,
          fallback: true,
          error: 'Configura la API key de CallMeBot en el dashboard para envío automático.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const todayStr = today.toISOString().split('T')[0];

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');

    if (clientsError) throw clientsError;

    const cumpleaneros = (clients ?? []).filter((c) => {
      const [, m, d] = c.fecha_nacimiento.split('-').map(Number);
      return m === month && d === day;
    });

    if (!cumpleaneros.length) {
      return new Response(
        JSON.stringify({ sent: false, message: 'No hay cumpleaños hoy.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: alreadySent } = await supabase
      .from('birthday_notifications')
      .select('client_id')
      .eq('notified_at', todayStr);

    const sentIds = new Set((alreadySent ?? []).map((n) => n.client_id));
    const pending = cumpleaneros.filter((c) => !sentIds.has(c.id));

    if (!pending.length) {
      return new Response(
        JSON.stringify({ sent: false, message: 'Ya se envió la notificación de hoy.', phone }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lines = pending.map((c) => {
      const age = today.getFullYear() - new Date(c.fecha_nacimiento).getFullYear();
      return `• ${c.nombre} (${age} años · ${c.celular})`;
    });

    const text = `🎂 Recordatorio Alas de Sanación\n\nHoy cumplen años:\n${lines.join('\n')}\n\n¡No olvides felicitarlos!`;

    const callUrl =
      `https://api.callmebot.com/whatsapp.php?phone=${phone}` +
      `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;

    const waRes = await fetch(callUrl);
    const waBody = await waRes.text();

    if (!waRes.ok) {
      throw new Error(waBody || 'Error al enviar WhatsApp');
    }

    for (const c of pending) {
      await supabase.from('birthday_notifications').upsert(
        { client_id: c.id, notified_at: todayStr },
        { onConflict: 'client_id,notified_at' }
      );
    }

    return new Response(
      JSON.stringify({
        sent: true,
        phone,
        count: pending.length,
        message: `Notificación enviada al +${phone}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ sent: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
