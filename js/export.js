import { formatDate, formatDateTime } from './clients.js';

export function buildTxtContent(client, consultas) {
  let content = `ALAS DE SANACIÓN - Historia Clínica\n`;
  content += `${'='.repeat(50)}\n\n`;
  content += `Cliente: ${client.nombre}\n`;
  content += `Fecha de nacimiento: ${formatDate(client.fecha_nacimiento)}\n`;
  content += `Celular: ${client.celular}\n`;
  content += `Correo: ${client.correo || '—'}\n\n`;
  content += `${'─'.repeat(50)}\n`;
  content += `CONSULTAS\n`;
  content += `${'─'.repeat(50)}\n\n`;

  if (!consultas.length) {
    content += 'Sin consultas registradas.\n';
  } else {
    consultas.forEach((c, i) => {
      content += `Consulta ${i + 1}: ${c.titulo || 'Sin título'}\n`;
      content += `Fecha: ${formatDateTime(c.fecha_consulta)}\n`;
      content += `${c.contenido}\n\n`;
      content += `${'─'.repeat(30)}\n\n`;
    });
  }

  return content;
}

export function buildWordHtml(client, consultas) {
  const consultasHtml = consultas.length
    ? consultas
        .map(
          (c, i) => `
      <div style="margin-bottom:20px;padding:12px;border:1px solid #ddd;border-radius:6px;">
        <h3 style="color:#4B2C7F;margin:0 0 8px;">Consulta ${i + 1}: ${escapeHtml(c.titulo || 'Sin título')}</h3>
        <p style="color:#666;font-size:12px;margin:0 0 8px;">Fecha: ${formatDateTime(c.fecha_consulta)}</p>
        <p style="white-space:pre-wrap;margin:0;">${escapeHtml(c.contenido)}</p>
      </div>`
        )
        .join('')
    : '<p>Sin consultas registradas.</p>';

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Historia Clínica - ${escapeHtml(client.nombre)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #4B2C7F; padding: 40px; }
    h1 { color: #4B2C7F; border-bottom: 3px solid #D4AF37; padding-bottom: 10px; }
    .info { margin: 20px 0; line-height: 1.8; }
    .info strong { color: #4B2C7F; }
  </style>
</head>
<body>
  <h1>Alas de Sanación — Historia Clínica</h1>
  <div class="info">
    <p><strong>Cliente:</strong> ${escapeHtml(client.nombre)}</p>
    <p><strong>Fecha de nacimiento:</strong> ${formatDate(client.fecha_nacimiento)}</p>
    <p><strong>Celular:</strong> ${escapeHtml(client.celular)}</p>
    <p><strong>Correo:</strong> ${escapeHtml(client.correo || '—')}</p>
  </div>
  <h2 style="color:#4B2C7F;">Consultas</h2>
  ${consultasHtml}
</body>
</html>`;
}

export function exportToTxt(client, consultas) {
  downloadFile(
    `${sanitizeFilename(client.nombre)}_historia_clinica.txt`,
    buildTxtContent(client, consultas),
    'text/plain;charset=utf-8'
  );
}

export function exportToWord(client, consultas) {
  downloadFile(
    `${sanitizeFilename(client.nombre)}_historia_clinica.doc`,
    buildWordHtml(client, consultas),
    'application/msword;charset=utf-8'
  );
}

export async function exportAllPatientsZip(clientsWithConsultas) {
  if (!clientsWithConsultas.length) {
    throw new Error('No hay consultas registradas para exportar.');
  }

  const zip = new JSZip();

  for (const { client, consultas } of clientsWithConsultas) {
    const folderName = sanitizeFolderName(client.nombre);
    const folder = zip.folder(folderName);
    folder.file('historia_clinica.txt', buildTxtContent(client, consultas));
    folder.file('historia_clinica.doc', buildWordHtml(client, consultas));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob('Alas_de_Sanacion_consultas.zip', blob);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\s+/g, '_');
}

function sanitizeFolderName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '').trim() || 'Cliente';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
