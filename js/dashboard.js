import { getSupabase } from './auth.js';
import { WHATSAPP_NUMBER } from './config.js';

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
    const [y, m, d] = c.fecha_nacimiento.split('-').map(Number);
    return m === month && d === day;
  }).map((c) => {
    const birth = new Date(c.fecha_nacimiento);
    const age = today.getFullYear() - birth.getFullYear();
    return { ...c, edad: age };
  });
}

export function buildBirthdayWhatsAppMessage(clientes) {
  if (!clientes.length) return '';
  const names = clientes.map((c) => `${c.nombre} (${c.edad} años)`).join(', ');
  return encodeURIComponent(
    `🎂 Recordatorio Alas de Sanación\n\nHoy cumplen años:\n${names}\n\n¡No olvides felicitarlos!`
  );
}

export function openWhatsAppNotification(message) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
}

export async function checkAndNotifyBirthdays(clientes) {
  if (!clientes.length) return;

  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  const { data: alreadySent } = await supabase
    .from('birthday_notifications')
    .select('client_id')
    .eq('notified_at', today);

  const sentIds = new Set((alreadySent || []).map((n) => n.client_id));
  const pending = clientes.filter((c) => !sentIds.has(c.id));

  if (!pending.length) return;

  const message = buildBirthdayWhatsAppMessage(pending);
  openWhatsAppNotification(message);

  for (const c of pending) {
    await supabase.from('birthday_notifications').upsert(
      { client_id: c.id, notified_at: today },
      { onConflict: 'client_id,notified_at' }
    );
  }
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

      if (notifyBtn) {
        notifyBtn.style.display = 'inline-flex';
        notifyBtn.onclick = () => {
          const msg = buildBirthdayWhatsAppMessage(cumpleaneros);
          openWhatsAppNotification(msg);
        };
      }

      await checkAndNotifyBirthdays(cumpleaneros);
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
