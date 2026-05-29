import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getConsultas,
  createConsulta,
  updateConsulta,
  deleteConsulta,
  getAllClientsWithConsultas,
  formatDate,
  formatDateTime,
  escapeHtml,
} from './clients.js';
import { exportToWord, exportAllPatientsZip } from './export.js';

let currentClient = null;
let editingClientId = null;
let currentConsultas = [];
let viewingConsulta = null;
let editingConsultaId = null;

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
  document.getElementById('consulta-edit-form').addEventListener('submit', handleConsultaEditSubmit);

  document.querySelectorAll('.modal-close, .modal-overlay').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target === el || el.classList.contains('modal-close')) {
        const modal = el.closest('.modal-overlay') || el;
        if (modal.id === 'consulta-view-modal' || modal.id === 'consulta-edit-modal') {
          modal.classList.remove('open');
          return;
        }
        closeModals();
      }
    });
  });

  document.getElementById('export-word-btn').addEventListener('click', downloadSelected);
  document.getElementById('export-all-zip-btn').addEventListener('click', handleExportAllZip);
  document.getElementById('select-all-consultas').addEventListener('change', toggleSelectAll);
  document.getElementById('edit-from-view-btn').addEventListener('click', () => {
    if (viewingConsulta) openEditConsultaModal(viewingConsulta);
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

function truncate(text, max = 100) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function getSelectedConsultas() {
  const selectedIds = new Set(
    [...document.querySelectorAll('.consulta-select:checked')].map((el) => el.dataset.id)
  );
  return currentConsultas.filter((c) => selectedIds.has(c.id));
}

function updateSelectedCount() {
  const count = document.querySelectorAll('.consulta-select:checked').length;
  const el = document.getElementById('selected-count');
  if (el) el.textContent = `${count} seleccionada${count !== 1 ? 's' : ''}`;
}

function toggleSelectAll(e) {
  const checked = e.target.checked;
  document.querySelectorAll('.consulta-select').forEach((cb) => {
    cb.checked = checked;
  });
  updateSelectedCount();
}

function downloadSelected() {
  if (!currentClient) return;
  const selected = getSelectedConsultas();
  if (!selected.length) {
    alert('Selecciona al menos una consulta para descargar.');
    return;
  }
  exportToWord(currentClient, selected);
}

async function handleExportAllZip() {
  const btn = document.getElementById('export-all-zip-btn');
  btn.disabled = true;
  btn.textContent = 'Generando ZIP…';
  try {
    const data = await getAllClientsWithConsultas();
    await exportAllPatientsZip(data);
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Descargar todas (ZIP por paciente)';
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
  currentConsultas = [];
  const modal = document.getElementById('consultas-modal');
  const list = document.getElementById('consultas-list');
  const title = document.getElementById('consultas-modal-title');
  const selectAll = document.getElementById('select-all-consultas');

  if (selectAll) selectAll.checked = false;
  updateSelectedCount();

  list.innerHTML = '<div class="loading">Cargando consultas...</div>';
  modal.classList.add('open');

  try {
    currentClient = await getClientById(clientId);
    title.textContent = `Consultas — ${currentClient.nombre}`;
    await renderConsultas(clientId);
  } catch (err) {
    list.innerHTML = `<p class="empty-state">Error: ${err.message}</p>`;
  }
}

async function renderConsultas(clientId) {
  const list = document.getElementById('consultas-list');
  currentConsultas = await getConsultas(clientId);

  if (!currentConsultas.length) {
    list.innerHTML = '<p class="empty-state">No hay consultas registradas.</p>';
    updateSelectedCount();
    return;
  }

  list.innerHTML = currentConsultas
    .map(
      (c) => `
    <div class="consulta-item" data-id="${c.id}">
      <label class="consulta-check" onclick="event.stopPropagation()">
        <input type="checkbox" class="consulta-select" data-id="${c.id}">
      </label>
      <div class="consulta-item-body" data-id="${c.id}" title="Clic para leer completa">
        <div class="consulta-item-header">
          <div>
            <strong>${escapeHtml(c.titulo || 'Consulta')}</strong>
            <span>${formatDateTime(c.fecha_consulta)}</span>
          </div>
        </div>
        <p class="consulta-preview">${escapeHtml(truncate(c.contenido))}</p>
        <span class="consulta-read-hint">Clic para ver completa →</span>
      </div>
      <div class="consulta-item-actions">
        <button type="button" class="btn btn-sm btn-gold edit-consulta-btn" data-id="${c.id}">Editar</button>
        <button type="button" class="btn btn-sm btn-danger delete-consulta-btn" data-id="${c.id}">Eliminar</button>
      </div>
    </div>`
    )
    .join('');

  list.querySelectorAll('.consulta-select').forEach((cb) => {
    cb.addEventListener('change', updateSelectedCount);
  });

  list.querySelectorAll('.consulta-item-body').forEach((el) => {
    el.addEventListener('click', () => {
      const consulta = currentConsultas.find((c) => c.id === el.dataset.id);
      if (consulta) openViewConsultaModal(consulta);
    });
  });

  list.querySelectorAll('.edit-consulta-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const consulta = currentConsultas.find((c) => c.id === btn.dataset.id);
      if (consulta) openEditConsultaModal(consulta);
    });
  });

  list.querySelectorAll('.delete-consulta-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta consulta?')) return;
      await deleteConsulta(btn.dataset.id);
      document.getElementById('consulta-view-modal').classList.remove('open');
      await renderConsultas(clientId);
    });
  });

  updateSelectedCount();
}

function openViewConsultaModal(consulta) {
  viewingConsulta = consulta;
  document.getElementById('view-consulta-titulo').textContent = consulta.titulo || 'Consulta';
  document.getElementById('view-consulta-fecha').textContent = formatDateTime(consulta.fecha_consulta);
  document.getElementById('view-consulta-contenido').textContent = consulta.contenido;
  document.getElementById('consulta-view-modal').classList.add('open');
}

function openEditConsultaModal(consulta) {
  editingConsultaId = consulta.id;
  viewingConsulta = consulta;
  document.getElementById('consulta-view-modal').classList.remove('open');
  document.getElementById('edit-consulta-titulo').value = consulta.titulo || '';
  document.getElementById('edit-consulta-contenido').value = consulta.contenido;
  document.getElementById('consulta-edit-modal').classList.add('open');
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

async function handleConsultaEditSubmit(e) {
  e.preventDefault();
  if (!editingConsultaId || !currentClient) return;

  const titulo = document.getElementById('edit-consulta-titulo').value.trim() || 'Consulta';
  const contenido = document.getElementById('edit-consulta-contenido').value.trim();
  if (!contenido) {
    alert('Escribe el contenido de la consulta.');
    return;
  }

  try {
    await updateConsulta(editingConsultaId, { titulo, contenido });
    document.getElementById('consulta-edit-modal').classList.remove('open');
    editingConsultaId = null;
    await renderConsultas(currentClient.id);
  } catch (err) {
    alert('Error al actualizar consulta: ' + err.message);
  }
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
  editingClientId = null;
  currentClient = null;
  currentConsultas = [];
  viewingConsulta = null;
  editingConsultaId = null;
}
