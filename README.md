# GovBidder Academy · Sistema de certificados

Sistema completo para emitir, verificar y descargar certificados, rearmado desde cero
sobre tu propia infraestructura (Supabase + Vercel). Reemplaza la dependencia del código de terceros.

## Qué hace

- **Panel admin** (`/admin`): alta individual por formulario **o** carga masiva por Excel/CSV.
- **Número automático** en formato `GBC-26X-0001` (año + inicial del apellido + correlativo global).
- **Página única de verificación** (`/certificate/[numero]`): busca el número en la base y muestra los datos. Una sola plantilla sirve para todos.
- **QR** que apunta a la página de verificación de cada certificado.
- **PDF** del certificado con el QR ya embebido, listo para descargar y enviar.

## Flujo

```
Panel admin (form o XLS)
      ↓
Genera / confirma número GBC-26X-0001
      ↓
Inserta registro en Supabase
      ↓
Página de verificación disponible en verify.govbidder.net/certificate/GBC-26X-0001
      ↓
QR + PDF descargables
```

## Formato del número: `GBC-26X-0001`

| Parte | Significado                        | De dónde sale                     |
|-------|------------------------------------|-----------------------------------|
| GBC   | GovBidder Challenge (fijo)         | constante                         |
| 26    | Año de emisión (2 dígitos)         | fecha de emisión                  |
| X     | Primera letra del **apellido**     | columna Apellido (sin acentos)    |
| 0001  | Correlativo global ascendente      | secuencia de Postgres (única)     |

La inicial sale de la columna **Apellido** del formulario/XLS. Por eso el archivo de
carga trae Nombre y Apellido separados: así no hay que adivinar cuál palabra es el
apellido en nombres compuestos (ej. "German Antonio Rivas Chinchilla").

## Instalación paso a paso

### 1. Supabase
1. Creá un proyecto en https://supabase.com (o usá el que ya tenés).
2. Andá a **SQL Editor → New query**, pegá el contenido de `supabase/schema.sql` y **Run**.
3. Si ya tenés certificados viejos, importalos y después corré una vez:
   `select setval('public.cert_seq', 56, true);` (reemplazá 56 por tu número más alto).
4. En **Project Settings → API** copiá: `URL`, `anon key` y `service_role key`.

### 2. Variables de entorno
Copiá `.env.example` a `.env.local` y completá los valores:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # secreta, solo servidor
VERIFY_BASE_URL=https://verify.govbidder.net
ADMIN_TOKEN=una_clave_larga_y_secreta
```

### 3. Correr local
```
npm install
npm run dev
```
Abrí http://localhost:3000 (verificación) y http://localhost:3000/admin (panel).

### 4. Deploy en Vercel
1. Subí el proyecto a un repo (GitHub) e importalo en Vercel, **o** usá `vercel` CLI.
2. En Vercel → Project → Settings → **Environment Variables**, cargá las mismas 5 variables.
3. Deploy.
4. En Vercel → **Domains**, apuntá `verify.govbidder.net` a este proyecto (config DNS).

## Carga masiva (Excel/CSV)

Columnas que reconoce (en español o inglés, no importa el orden):
`Nombre, Apellido, Correo, Programa, Fecha de emisión, Número de certificado`.

- Si dejás **Número de certificado vacío**, el sistema lo genera solo.
- Si ponés un número, lo respeta tal cual (para migrar los viejos).

Usá `plantilla_carga.csv` como base. Podés subir 20, 50 o 100 filas de una vez.

## La plantilla del PDF

Por defecto genera un certificado limpio desde cero. Si tenés el diseño en Canva:
exportalo como PNG horizontal (A4, 842×595 pt o proporcional) y guardalo en
`public/plantilla.png`. El sistema lo usa de fondo y solo encima dibuja el QR.
Podés ajustar posición del QR y textos en `lib/pdf.js`.

## Seguridad

- Las escrituras (crear certificados) van por el servidor con la `service_role key`,
  que **nunca** llega al navegador. El panel se protege con `ADMIN_TOKEN`.
- La lectura es pública (para verificar), controlada por RLS en Supabase.
- Para producción seria, conviene reemplazar el `ADMIN_TOKEN` por Supabase Auth
  (usuarios reales con login). El resto del sistema no cambia.

## Estructura

```
app/
  page.jsx                         buscador de verificación
  certificate/[cert]/page.jsx      página de resultado
  admin/page.jsx                   panel admin
  api/certificates/route.js        POST alta individual
  api/certificates/bulk/route.js   POST carga masiva XLS/CSV
  api/certificates/[cert]/pdf/     GET PDF
  api/certificates/[cert]/qr/      GET QR PNG
lib/
  certNumber.js                    formato GBC-26X-0001
  createCertificates.js            inserción + asignación de número
  pdf.js                           QR y PDF
  supabase.js                      clientes público / admin
  auth.js                          chequeo del token admin
supabase/schema.sql                tabla, secuencia, RLS
plantilla_carga.csv                ejemplo de carga masiva
```
