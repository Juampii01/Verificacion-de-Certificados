# CLAUDE.md — Contexto para Claude Code

Este proyecto es el sistema de certificados de **GovBidder Academy**, rearmado de cero.
Reemplaza un verificador anterior (de un tercero) cuyo código no está disponible.

## Qué es
App Next.js (App Router) que corre en Vercel y lee/escribe en Supabase.

- **Verificador público** (`/`, `/certificate/[cert]`): diseño navy/dorado/verde, copiado del
  sitio actual `govbidder-certificate-verify.vercel.app`. Copy en inglés.
- **Panel admin** (`/admin`): alta individual + carga masiva Excel/CSV + export CSV para Canva.
- **Número de certificado**: formato `GBC-26X-0001` (año + inicial del apellido + correlativo
  global vía secuencia Postgres). Lógica en `lib/certNumber.js`. Acepta también el formato
  viejo `GBC-2026-00157` en verificación.
- **QR + PDF**: `lib/pdf.js`. El QR apunta a `VERIFY_BASE_URL/certificate/[numero]`.
- **Canva Bulk Create**: el flujo elegido para el PDF final (ver `GUIA-CANVA.md`). El QR va
  arriba de la firma de Santo González en el diseño.

## Stack y archivos clave
- `app/page.jsx` — home/verificador (client).
- `app/certificate/[cert]/page.jsx` — resultado (server, lee Supabase).
- `app/admin/page.jsx` — panel (client, protegido con ADMIN_TOKEN).
- `app/api/certificates/*` — POST alta, POST bulk, GET pdf, GET qr, GET export CSV.
- `lib/certNumber.js`, `lib/createCertificates.js`, `lib/pdf.js`, `lib/supabase.js`, `lib/auth.js`.
- `supabase/schema.sql` — tabla `certificates`, secuencia `cert_seq`, RLS.

## Variables de entorno (.env.local y en Vercel)
Ver `.env.example`. Son 5: URL + anon key + service_role key de Supabase, VERIFY_BASE_URL, ADMIN_TOKEN.
La `service_role key` es secreta: solo servidor, nunca en `NEXT_PUBLIC_`.

## TAREA PENDIENTE: DEPLOY
Seguir `DEPLOY.md`. Resumen para vos, Claude Code:
1. Ayudar al usuario a correr `supabase/schema.sql` en su proyecto Supabase.
2. `npm install` y `npm run build` local para verificar que compila.
3. Crear `.env.local` con las claves que provea el usuario (pedírselas, no inventarlas).
4. `npm run dev` para probar en local: `/`, `/admin`, `/certificate/GBC-26X-0001`.
5. Deploy con `vercel` (o guiar el import desde GitHub).
6. Cargar las 5 env vars en Vercel y apuntar el dominio `verify.govbidder.net`.

### Notas / cosas a verificar en el build
- Node runtime en las rutas que usan `pdf-lib`/`xlsx` (ya declarado `export const runtime="nodejs"`).
- Primer arranque: correr `select setval('public.cert_seq', N, true);` si se importan certificados viejos (N = número más alto existente).
- El verificador viejo rechaza el formato nuevo; este lo acepta. Al apuntar el dominio, queda reemplazado.
