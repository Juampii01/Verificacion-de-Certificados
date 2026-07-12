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
