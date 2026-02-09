create table if not exists public.app_user (
  user_id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);

create index if not exists app_user_status_idx on public.app_user (status);
