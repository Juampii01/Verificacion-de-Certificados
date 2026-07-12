# CLAUDE.md — Contexto para Claude Code

Este proyecto es el sistema de certificados de **GovBidder Academy**, rearmado de cero.
Reemplaza un verificador anterior (de un tercero) cuyo código no está disponible.
Deployado en producción en `verify.govbidder.net` (Vercel + Supabase).

## Qué es
App Next.js (App Router) que corre en Vercel y lee/escribe en Supabase.

- **Verificador público** (`/`, `/certificate/[cert]`): colores y tipografía alineados al
  Manual de Marca oficial (navy `#152978`, rojo `#E42D2C`, blanco, negro; tipografía Raleway
  vía `next/font/google`). Copy en inglés.
- **Solicitud pública** (`/request`): el propio graduado pide su certificado (nombre, apellido,
  email, nombre a mostrar con límite de 45 caracteres). Si el email matchea contra la lista de
  elegibles ("día 4"), se crea y envía solo; si no, queda pendiente para el admin.
- **Panel admin** (`/admin`): alta individual + carga masiva Excel/CSV + export CSV para Canva +
  cola de solicitudes pendientes (aprobar/rechazar) + carga de la lista de elegibles.
- **Número de certificado**: formato `GBC-26X-0001` (año + inicial del apellido + correlativo
  global vía secuencia Postgres). Lógica en `lib/certNumber.js`. Acepta también el formato
  viejo `GBC-2026-00157` en verificación.
- **QR + PDF**: `lib/pdf.js`, con el diseño real de Canva como fondo (`public/plantilla.png`).
  Solo se dibujan encima el nombre (centrado, se achica si no entra), número y fecha; el resto
  (programa, horas, firma, estado) ya viene fijo en la plantilla. El QR apunta a
  `VERIFY_BASE_URL/certificate/[numero]` y va arriba de la firma de Santo González.
- **Emails** (`lib/email.js`): vía Resend, se envían al aprobar (auto o manual) y al rechazar
  una solicitud.

## Stack y archivos clave
- `app/page.jsx` — home/verificador (client).
- `app/certificate/[cert]/page.jsx` — resultado (server, lee Supabase).
- `app/request/page.jsx` — formulario público de solicitud (client).
- `app/admin/page.jsx` — panel (client, protegido con ADMIN_TOKEN).
- `app/api/certificates/*` — POST alta, POST bulk, GET pdf, GET qr, GET export CSV.
- `app/api/certificate-requests/*` — POST público (solicitud), GET admin (listar pendientes),
  POST `[id]/approve`, POST `[id]/reject`.
- `app/api/eligible-participants/bulk` — carga la lista de "día 4" (Excel/CSV).
- `lib/certNumber.js`, `lib/createCertificates.js`, `lib/certificateRequests.js`, `lib/pdf.js`,
  `lib/email.js`, `lib/supabase.js`, `lib/auth.js`.
- `supabase/schema.sql` — tablas `certificates`, `eligible_participants`, `certificate_requests`,
  secuencia `cert_seq`, RLS.

## Variables de entorno (.env.local y en Vercel)
Ver `.env.example`. Son 7: URL + anon key + service_role key de Supabase, VERIFY_BASE_URL,
ADMIN_TOKEN, RESEND_API_KEY, RESEND_FROM. La `service_role key` y `RESEND_API_KEY` son secretas:
solo servidor, nunca en `NEXT_PUBLIC_`.

## Notas / cosas a verificar en el build
- Node runtime en las rutas que usan `pdf-lib`/`xlsx` (ya declarado `export const runtime="nodejs"`).
- El matching de auto-aprobación de solicitudes es por **email exacto** contra
  `eligible_participants` (case-insensitive, se normaliza a minúscula).
- Si se agregan certificados viejos a mano, correr
  `select setval('public.cert_seq', N, true);` (N = número más alto existente).
