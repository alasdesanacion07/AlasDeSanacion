import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIMEZONE = 'America/Bogota';

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length === 12) return digits;
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

function getTodayInColombia() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formatted = formatter.format(now);
  const [year, month, day] = formatted.split('-').map(Number);
  return { year, month, day, dateStr: formatted };
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
          error: 'Guarda la API key de CallMeBot en el Dashboard para activar el envío automático.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { year, month, day, dateStr: todayStr } = getTodayInColombia();

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
        JSON.stringify({ sent: false, message: 'No hay cumpleaños hoy.', date: todayStr }),
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
        JSON.stringify({
          sent: false,
          message: 'Ya se envió la notificación automática de hoy.',
          phone,
          date: todayStr,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lines = pending.map((c) => {
      const birthYear = Number(c.fecha_nacimiento.split('-')[0]);
      const age = year - birthYear;
      return `• ${c.nombre} (${age} años · ${c.celular})`;
    });

    const text =
      `🎂 Recordatorio Alas de Sanación\n\n` +
      `Hoy ${todayStr} cumplen años:\n${lines.join('\n')}\n\n` +
      `¡No olvides felicitarlos!`;

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
        date: todayStr,
        clientes: pending.map((c) => c.nombre),
        message: `WhatsApp automático enviado al +${phone} con ${pending.length} cumpleaño(s).`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ sent: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
