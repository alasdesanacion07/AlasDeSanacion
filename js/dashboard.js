import { getSupabase } from './auth.js';
import { WHATSAPP_NUMBER, NOTIFY_FUNCTION } from './config.js';
import { getSiteSettings, normalizePhone } from './settings.js';

export async function getStats() {
  const supabase = getSupabase();

  const [clientsRes, consultasRes] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('consultas').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalClientes: clientsRes.count ?? 0,
    totalConsultas: consultasRes.count ?? 0,
  };
}

export async function getCumpleanosHoy() {
  const supabase = getSupabase();
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .filter('fecha_nacimiento', 'not.is', null);

  if (error) throw error;

  return (data || []).filter((c) => {
    const [, m, d] = c.fecha_nacimiento.split('-').map(Number);
    return m === month && d === day;
  }).map((c) => {
    const birth = new Date(c.fecha_nacimiento);
    const age = today.getFullYear() - birth.getFullYear();
    return { ...c, edad: age };
  });
}

export function buildBirthdayWhatsAppMessage(clientes) {
  if (!clientes.length) return '';
  const lines = clientes.map((c) => `• ${c.nombre} (${c.edad} años · ${c.celular})`).join('\n');
  return encodeURIComponent(
    `🎂 Recordatorio Alas de Sanación\n\nHoy cumplen años:\n${lines}\n\n¡No olvides felicitarlos!`
  );
}

export function openWhatsAppFallback(phone, message) {
  const target = normalizePhone(phone || WHATSAPP_NUMBER);
  window.open(`https://wa.me/${target}?text=${message}`, '_blank');
}

export async function sendBirthdayNotification(clientes, phone) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(NOTIFY_FUNCTION);

  if (!error && data?.sent) {
    return { ok: true, message: data.message || 'Notificación enviada por WhatsApp.' };
  }

  const fallback = data?.fallback || error;
  if (fallback && clientes.length) {
    const msg = buildBirthdayWhatsAppMessage(clientes);
    openWhatsAppFallback(phone, msg);
    return {
      ok: false,
      fallback: true,
      message: 'Se abrió WhatsApp como alternativa.',
    };
  }

  throw new Error(data?.error || error?.message || 'No se pudo enviar la notificación.');
}

function showNotificationStatus(message, type = 'info') {
  const el = document.getElementById('notification-status');
  if (!el) return;
  el.textContent = message;
  el.className = `notification-status visible ${type}`;
}

export async function initDashboard() {
  const statsEl = document.getElementById('stat-clientes');
  const consultasEl = document.getElementById('stat-consultas');
  const birthdayList = document.getElementById('birthday-list');
  const notifyBtn = document.getElementById('notify-birthdays-btn');

  try {
    const stats = await getStats();
    statsEl.textContent = stats.totalClientes;
    consultasEl.textContent = stats.totalConsultas;

    const cumpleaneros = await getCumpleanosHoy();

    if (cumpleaneros.length === 0) {
      birthdayList.innerHTML = '<li class="birthday-empty">No hay cumpleaños hoy 🌸</li>';
      if (notifyBtn) notifyBtn.style.display = 'none';
    } else {
      birthdayList.innerHTML = cumpleaneros
        .map(
          (c) => `
        <li>
          <div>
            <strong>${escapeHtml(c.nombre)}</strong>
            <span style="color:var(--text-muted);font-size:0.85rem;margin-left:0.5rem">
              ${c.edad} años · ${c.celular}
            </span>
          </div>
          <a href="https://wa.me/57${c.celular.replace(/\D/g, '')}" target="_blank" class="btn btn-sm btn-gold">WhatsApp</a>
        </li>`
        )
        .join('');

      const notify = async () => {
        notifyBtn.disabled = true;
        notifyBtn.textContent = 'Enviando…';
        try {
          const settings = await getSiteSettings();
          const result = await sendBirthdayNotification(cumpleaneros, settings.telefono_notificaciones);
          showNotificationStatus(result.message, result.ok ? 'success' : 'info');
        } catch (err) {
          showNotificationStatus(err.message, 'error');
        } finally {
          notifyBtn.disabled = false;
          notifyBtn.textContent = 'Probar envío ahora';
        }
      };

      if (notifyBtn) {
        notifyBtn.style.display = 'inline-flex';
        notifyBtn.textContent = 'Probar envío ahora';
        notifyBtn.onclick = notify;
      }
    }
  } catch (err) {
    console.error(err);
    birthdayList.innerHTML = '<li class="birthday-empty">Error al cargar datos</li>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
