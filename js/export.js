import { formatDate, formatDateTime } from './clients.js';

export function exportToTxt(client, consultas) {
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

  downloadFile(
    `${sanitizeFilename(client.nombre)}_historia_clinica.txt`,
    content,
    'text/plain;charset=utf-8'
  );
}

export function exportToWord(client, consultas) {
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

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Historia Clínica - ${escapeHtml(client.nombre)}</title>
      <style>
        body { font-family: 'Source Sans 3', Arial, sans-serif; color: #4B2C7F; padding: 40px; }
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

  downloadFile(
    `${sanitizeFilename(client.nombre)}_historia_clinica.doc`,
    html,
    'application/msword;charset=utf-8'
  );
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\s+/g, '_');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
