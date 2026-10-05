create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to anon, authenticated;

-- Postgres memberi EXECUTE ke PUBLIC pada setiap fungsi baru. Pencabutan harus global:
-- `ALTER DEFAULT PRIVILEGES ... IN SCHEMA ... REVOKE` tidak dapat mencabut default global PUBLIC.
alter default privileges for role postgres revoke execute on functions from public;

-- Urutan enum = urutan sempit: public (terluas) ... self (tersempit). Lihat §7.2.
create type public.visibility_audience as enum
  ('public','authenticated','class_member','class_admin','self');
create type public.visibility_scope  as enum ('class','member');   -- siapa pemilik pengaturan
create type public.visibility_kind   as enum ('page','section','field','item');
create type public.membership_status as enum ('invited','active','inactive');
create type public.task_status       as enum ('active','completed','archived');
create type public.schedule_type     as enum ('class','activity');
create type public.social_platform   as enum
  ('instagram','linkedin','github','tiktok','x','website','custom');
create type public.portfolio_kind    as enum
  ('project','achievement','organization','competition','creative_work','certificate','experience');

-- Validator bentuk theme (defense in depth; kontras divalidasi di Zod + saat render)
create function app.theme_is_valid(t jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(t) = 'object'
    and t->>'layout' in ('standard','profile_focused')
    and t->>'font_preset' in ('editorial','grotesk','rounded')
    and jsonb_typeof(t->'palette') = 'object'
    and not exists (
      select 1 from unnest(array['primary','secondary','background','surface','border',
        'text_primary','text_secondary','success','warning','error']) k
      where coalesce(t->'palette'->>k, '') !~ '^#[0-9a-fA-F]{6}$');
$$;