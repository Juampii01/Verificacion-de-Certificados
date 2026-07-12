-- ============================================================
-- GovBidder Academy · Esquema de la base de datos (Supabase)
-- Ejecutar en:  Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- 1) Tabla principal de certificados
create table if not exists public.certificates (
  id                uuid primary key default gen_random_uuid(),
  certificate_number text unique not null,      -- GBC-26G-0001
  first_name        text,                        -- Nombre
  last_name         text,                        -- Apellido (de aquí sale la inicial)
  full_name         text,                        -- Nombre completo mostrado en el certificado
  email             text,
  program           text default 'GovBidder Challenge',
  certificate_type  text default 'Certificate of Completion',
  issue_date        date,
  hours             integer,
  issued_by         text default 'GovBidder',
  signed_by         text,
  status            text default 'active'
                    check (status in ('active','revoked','pending')),
  seq               integer,                     -- número global usado (para auditoría)
  created_at        timestamptz default now()
);

create index if not exists certificates_number_idx on public.certificates (certificate_number);
create index if not exists certificates_status_idx on public.certificates (status);

-- 2) Secuencia global para el número correlativo (0001, 0002, ...)
--    Garantiza números ascendentes y únicos incluso con cargas simultáneas.
create sequence if not exists public.cert_seq;

-- Función que entrega N números de secuencia de una sola vez (para carga masiva).
create or replace function public.next_cert_seqs(n integer)
returns setof bigint
language sql
as $$
  select nextval('public.cert_seq') from generate_series(1, n);
$$;

-- 3) Row Level Security
alter table public.certificates enable row level security;

-- Lectura pública SOLO para la verificación (cualquiera puede consultar un certificado).
drop policy if exists "public_read" on public.certificates;
create policy "public_read"
  on public.certificates
  for select
  using (true);

-- Las escrituras (insert/update) se hacen SOLO desde el servidor con la
-- service_role key (que salta RLS). El navegador nunca escribe directo.
-- Por eso NO creamos políticas de insert/update para anon.

-- ============================================================
-- IMPORTANTE (correr una vez, después de importar los certificados viejos):
-- ajustar la secuencia para que continúe después del número más alto existente.
-- Ejemplo si el último fue GBC-2026-00056:
--   select setval('public.cert_seq', 56, true);
-- ============================================================

-- 4) Lista de elegibles ("día 4" completado) para auto-aprobar solicitudes.
--    Se carga desde el admin (bulk), igual que los certificados.
create table if not exists public.eligible_participants (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,   -- normalizado a minúscula, clave de matching
  first_name  text,
  last_name   text,
  full_name   text,
  program     text default 'GovBidder Challenge',
  imported_at timestamptz default now()
);

create index if not exists eligible_participants_email_idx on public.eligible_participants (email);

alter table public.eligible_participants enable row level security;
-- Sin policies para anon: solo el server (service_role) lee/escribe esta tabla.

-- 5) Solicitudes públicas de certificado (formulario /request).
--    Si el email matchea contra eligible_participants se aprueba y crea el
--    certificado al instante; si no, queda pendiente para el admin.
create table if not exists public.certificate_requests (
  id                 uuid primary key default gen_random_uuid(),
  first_name         text,
  last_name          text not null,
  full_name          text not null,     -- nombre a mostrar en el certificado (máx. 45 chars, validado en el server)
  email              text not null,
  status             text default 'pending_review'
                     check (status in ('pending_review','approved','rejected')),
  matched_eligible   boolean default false,
  certificate_number text,              -- se completa al aprobar (auto o manual)
  created_at         timestamptz default now(),
  reviewed_at        timestamptz
);

create index if not exists certificate_requests_status_idx on public.certificate_requests (status);
create index if not exists certificate_requests_email_idx on public.certificate_requests (email);

alter table public.certificate_requests enable row level security;
-- Sin policies para anon: el insert público pasa por el server (service_role),
-- que es quien valida y decide auto-aprobar o dejar pendiente. El navegador
-- nunca escribe directo a esta tabla, igual que con certificates.
