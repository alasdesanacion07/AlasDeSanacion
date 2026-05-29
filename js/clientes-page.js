import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getConsultas,
  createConsulta,
  deleteConsulta,
  formatDate,
  formatDateTime,
  escapeHtml,
} from './clients.js';
import { exportToTxt, exportToWord } from './export.js';

let currentClient = null;
let editingClientId = null;

export async function initClientesPage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'add') {
    setTimeout(() => openClientModal(), 300);
  }

  document.getElementById('search-btn').addEventListener('click', loadClients);
  document.getElementById('clear-search-btn').addEventListener('click', () => {
    document.getElementById('filter-value').value = '';
    loadClients();
  });
  document.getElementById('filter-type').addEventListener('change', updateFilterInput);
  document.getElementById('add-client-btn').addEventListener('click', () => openClientModal());
  document.getElementById('client-form').addEventListener('submit', handleClientSubmit);
  document.getElementById('consulta-form').addEventListener('submit', handleConsultaSubmit);

  document.querySelectorAll('.modal-close, .modal-overlay').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target === el || el.classList.contains('modal-close')) closeModals();
    });
  });

  document.getElementById('export-txt-btn').addEventListener('click', async () => {
    if (!currentClient) return;
    const consultas = await getConsultas(currentClient.id);
    exportToTxt(currentClient, consultas);
  });

  document.getElementById('export-word-btn').addEventListener('click', async () => {
    if (!currentClient) return;
    const consultas = await getConsultas(currentClient.id);
    exportToWord(currentClient, consultas);
  });

  updateFilterInput();
  await loadClients();
}

function updateFilterInput() {
  const type = document.getElementById('filter-type').value;
  const input = document.getElementById('filter-value');
  if (type === 'fecha_nacimiento') {
    input.type = 'date';
    input.placeholder = '';
  } else {
    input.type = 'text';
    input.placeholder =
      type === 'nombre' ? 'Buscar por nombre...' :
      type === 'celular' ? 'Buscar por teléfono...' :
      'Buscar por correo...';
  }
}

async function loadClients() {
  const tbody = document.getElementById('clients-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Cargando...</td></tr>';

  try {
    const filterType = document.getElementById('filter-type').value;
    const filterValue = document.getElementById('filter-value').value;
    const clients = await getClients(filterType, filterValue);

    if (!clients.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>No se encontraron clientes</p></td></tr>';
      return;
    }

    tbody.innerHTML = clients
      .map(
        (c) => `
      <tr>
        <td>${escapeHtml(c.nombre)}</td>
        <td>${formatDate(c.fecha_nacimiento)}</td>
        <td>${escapeHtml(c.celular)}</td>
        <td>${escapeHtml(c.correo || '—')}</td>
        <td>
          <button class="btn btn-sm btn-outline view-consultas-btn" data-id="${c.id}">Consultas</button>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-gold edit-btn" data-id="${c.id}">Editar</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${c.id}">Eliminar</button>
          </div>
        </td>
      </tr>`
      )
      .join('');

    tbody.querySelectorAll('.view-consultas-btn').forEach((btn) => {
      btn.addEventListener('click', () => openConsultasModal(btn.dataset.id));
    });
    tbody.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => openClientModal(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleDelete(btn.dataset.id));
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><p>Error: ${err.message}</p></td></tr>`;
  }
}

function openClientModal(clientId = null) {
  editingClientId = clientId;
  const modal = document.getElementById('client-modal');
  const title = document.getElementById('client-modal-title');
  const form = document.getElementById('client-form');

  form.reset();
  title.textContent = clientId ? 'Editar Cliente' : 'Agregar Cliente';

  if (clientId) {
    getClientById(clientId).then((client) => {
      document.getElementById('client-nombre').value = client.nombre;
      document.getElementById('client-fecha').value = client.fecha_nacimiento;
      document.getElementById('client-celular').value = client.celular;
      document.getElementById('client-correo').value = client.correo || '';
    }).catch(() => alert('No se pudo cargar el cliente.'));
  }

  modal.classList.add('open');
}

async function handleClientSubmit(e) {
  e.preventDefault();
  const data = {
    nombre: document.getElementById('client-nombre').value.trim(),
    fecha_nacimiento: document.getElementById('client-fecha').value,
    celular: document.getElementById('client-celular').value.trim(),
    correo: document.getElementById('client-correo').value.trim() || null,
  };

  try {
    if (editingClientId) {
      await updateClient(editingClientId, data);
    } else {
      await createClient(data);
    }
    closeModals();
    await loadClients();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  }
}

async function handleDelete(id) {
  if (!confirm('¿Eliminar este cliente y todas sus consultas?')) return;
  try {
    await deleteClient(id);
    await loadClients();
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
}

async function openConsultasModal(clientId) {
  currentClient = null;
  const modal = document.getElementById('consultas-modal');
  const list = document.getElementById('consultas-list');
  const title = document.getElementById('consultas-modal-title');

  list.innerHTML = '<div class="loading">Cargando consultas...</div>';
  modal.classList.add('open');

  try {
    const allClients = await getClients('', '');
    currentClient = allClients.find((c) => c.id === clientId);
    if (!currentClient) throw new Error('Cliente no encontrado');

    title.textContent = `Consultas — ${currentClient.nombre}`;
    await renderConsultas(clientId);
  } catch (err) {
    list.innerHTML = `<p class="empty-state">Error: ${err.message}</p>`;
  }
}

async function renderConsultas(clientId) {
  const list = document.getElementById('consultas-list');
  const consultas = await getConsultas(clientId);

  if (!consultas.length) {
    list.innerHTML = '<p class="empty-state">No hay consultas registradas.</p>';
    return;
  }

  list.innerHTML = consultas
    .map(
      (c) => `
    <div class="consulta-item">
      <div class="consulta-item-header">
        <div>
          <strong>${escapeHtml(c.titulo || 'Consulta')}</strong>
          <span>${formatDateTime(c.fecha_consulta)}</span>
        </div>
        <button class="btn btn-sm btn-danger delete-consulta-btn" data-id="${c.id}">Eliminar</button>
      </div>
      <p>${escapeHtml(c.contenido)}</p>
    </div>`
    )
    .join('');

  list.querySelectorAll('.delete-consulta-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta consulta?')) return;
      await deleteConsulta(btn.dataset.id);
      await renderConsultas(clientId);
    });
  });
}

async function handleConsultaSubmit(e) {
  e.preventDefault();
  if (!currentClient) return;

  const titulo = document.getElementById('consulta-titulo').value.trim() || 'Consulta';
  const contenido = document.getElementById('consulta-contenido').value.trim();
  if (!contenido) {
    alert('Escribe el contenido de la consulta.');
    return;
  }

  try {
    await createConsulta(currentClient.id, titulo, contenido);
    document.getElementById('consulta-form').reset();
    await renderConsultas(currentClient.id);
  } catch (err) {
    alert('Error al guardar consulta: ' + err.message);
  }
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
  editingClientId = null;
  currentClient = null;
}
