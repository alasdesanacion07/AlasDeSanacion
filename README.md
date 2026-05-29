# Alas de Sanación — Web App

Aplicación web minimalista para Alas de Sanación con landing page, panel de administración y gestión de clientes.

## Estructura

```
├── index.html          → Página principal (logo, Nosotros, WhatsApp)
├── login.html          → Login de administradores
├── dashboard.html      → Estadísticas y cumpleaños
├── clientes.html       → CRUD de clientes y consultas
├── css/styles.css      → Estilos responsive con paleta del logo
├── js/                 → Lógica de la aplicación
├── assets/logo.png     → Logo
└── supabase/           → Scripts de base de datos
```

## Configuración de Supabase

### 1. Ejecutar el schema SQL

En [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor** → ejecuta el contenido de:

```
supabase/schema.sql
```

### 2. Crear usuario administrador Ana

**Opción A — Dashboard (recomendado):**
1. Ve a **Authentication → Users → Add user**
2. Email: `annycerinza17@gmail.com`
3. Password: `53040012`
4. Marca **Auto Confirm User**
5. Ejecuta `supabase/crear-usuario-ana.sql` en el SQL Editor

**Opción B — Script Node.js:**
```bash
node supabase/setup-usuario-ana.js
```

### Credenciales de acceso

| Campo      | Valor                      |
|------------|----------------------------|
| Usuario    | Ana                        |
| Correo     | annycerinza17@gmail.com    |
| Contraseña | 53040012                   |

## Ejecutar localmente

```bash
npx serve .
```

Abre `http://localhost:3000` en el navegador.

## Funcionalidades

- **Landing page** con logo, sección Nosotros y botón WhatsApp (+57 320 474 4197)
- **Login admin** con validación de usuario, correo y contraseña vía Supabase Auth
- **Dashboard** con total de clientes, consultas y cumpleaños del día
- **Clientes**: agregar, editar, eliminar y buscar con filtros desplegables
- **Consultas**: historia clínica por cliente con exportación a Word
- **Cumpleaños**: recordatorio visual y notificación automática por WhatsApp al teléfono registrado
- **Diseño responsive** en móvil, tablet y escritorio

## Notificaciones automáticas de cumpleaños

Cada día a las **8:00 AM (Colombia)** el sistema envía solo un WhatsApp al teléfono registrado con los clientes que cumplen años.

### Configuración única (3 pasos)

**Paso A — SQL:** ejecuta `supabase/notificaciones-cumpleanos.sql` en Supabase SQL Editor.

**Paso B — Función:** en Supabase → Edge Functions → crea `notify-birthdays` con el código de `supabase/functions/notify-birthdays/index.ts` → Deploy.

**Paso C — CallMeBot + Dashboard:**
1. En el WhatsApp **3204744197**, activa CallMeBot ([guía](https://www.callmebot.com/blog/free-api-whatsapp-messages/))
2. En el Dashboard de la app, guarda teléfono `3204744197` y la API Key → **Guardar y activar envío automático**

El workflow de GitHub `birthday-notifications.yml` dispara el envío diario sin abrir la app.
