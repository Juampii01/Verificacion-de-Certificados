# Deploy en ~15 minutos

Objetivo: tener el verificador (con este diseño) corriendo en tu Vercel, leyendo de tu Supabase.

## 1. Supabase (5 min)
1. https://supabase.com → New project (o usá el existente).
2. SQL Editor → New query → pegá `supabase/schema.sql` → Run.
3. Project Settings → API → copiá: `URL`, `anon key`, `service_role key`.

## 2. Subir el código (3 min)
Opción A — GitHub:
1. Creá un repo nuevo y subí esta carpeta (sin `node_modules`).
Opción B — Vercel CLI:
1. `npm i -g vercel` y desde la carpeta: `vercel`.

## 3. Vercel (5 min)
1. https://vercel.com → Add New → Project → importá el repo.
2. Framework: Next.js (lo detecta solo).
3. Settings → Environment Variables → cargá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VERIFY_BASE_URL` = https://verify.govbidder.net
   - `ADMIN_TOKEN` = una clave secreta
4. Deploy.

## 4. Dominio (2 min)
1. Vercel → Project → Settings → Domains → agregá `verify.govbidder.net`.
2. En tu DNS, creá el CNAME que te indica Vercel.

## 5. Probar
- `https://verify.govbidder.net/`  → verificador.
- `https://verify.govbidder.net/admin` → panel (pide el ADMIN_TOKEN).
- Cargá un certificado de prueba y abrí `/certificate/GBC-26X-0001`.

## Ojo: la página vieja
El verificador viejo (govbidder-certificate-verify.vercel.app) tiene el candado de formato
que rechaza `GBC-26X-0001`. Este proyecto ya acepta formato viejo y nuevo. Cuando apuntes
el dominio `verify.govbidder.net` a este deploy, el viejo queda reemplazado.
