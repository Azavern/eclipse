-- Migration 0003 — helper auth dan resolver visibility (blueprint §8.1)
--
-- Semua fungsi lived di schema `app` yang tidak diekspos PostgREST, sehingga tidak
-- bisa dipanggil langsung lewat RPC. Hanya fungsi yang disebut di grant terakhir
-- yang boleh dieksekusi anon/authenticated.

create function app.current_class_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.classes limit 1 $$;

create function app.is_active_member(p_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
    where m.class_id = p_class and m.user_id = (select auth.uid()) and m.status = 'active') $$;

create function app.has_permission(p_class uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
    join public.roles r on r.class_id = m.class_id and r.id = m.role_id
    where m.class_id = p_class and m.user_id = (select auth.uid())
      and m.status = 'active' and p_perm = any (r.permissions)) $$;

-- "authenticated" = punya sesi login dan bukan anggota yang dinonaktifkan.
-- Status dibaca dari DB setiap pemanggilan, sehingga JWT lama tetap tidak
-- mendapat akses non-publik setelah anggota dinonaktifkan (E9).
create function app.is_signed_in() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
     and not exists (select 1 from public.memberships m
                     where m.user_id = (select auth.uid()) and m.status = 'inactive') $$;

-- Urutan enum visibility_audience = terluas ke tersempit, jadi "narrower" = nilai
-- lebih besar (§7.2). class_admin tidak menembus self (D-18).
create function app.audience_allows(p_audience public.visibility_audience,
                                    p_class uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_audience
    when 'public'        then true
    when 'authenticated' then app.is_signed_in()
    when 'class_member'  then app.is_active_member(p_class)
    when 'class_admin'   then app.has_permission(p_class, 'class.manage')
         or (p_owner is not null and p_owner = (select auth.uid()) and app.is_active_member(p_class))
    when 'self'          then p_owner is not null and p_owner = (select auth.uid())
         and app.is_active_member(p_class)
    else false end $$;

-- Langkah A (§7.5): nilai milik sendiri. Item override menang; lalu naik ke parent,
-- pada tiap node lebih dulu dicek aturan pemilik (hanya scope member), aturan kelas,
-- baru default katalog. Tidak ketemu sampai root = fail closed ke class_admin.
create function app.own_audience(p_class uuid, p_key text, p_owner uuid,
                                 p_item public.visibility_audience default null)
returns public.visibility_audience
language plpgsql stable security definer set search_path = '' as $$
declare
  k text := p_key; cat public.visibility_catalog;
  a public.visibility_audience; depth int := 0;
begin
  if p_item is not null then return p_item; end if;
  while k is not null and depth < 6 loop
    select * into cat from public.visibility_catalog where key = k;
    exit when not found;
    if cat.scope = 'member' and p_owner is not null then
      select r.audience into a from public.visibility_rules r
       where r.class_id = p_class and r.key = k and r.owner_id = p_owner;
      if a is not null then return a; end if;
    end if;
    select r.audience into a from public.visibility_rules r
     where r.class_id = p_class and r.key = k and r.owner_id is null;
    if a is not null then return a; end if;
    if cat.default_audience is not null then return cat.default_audience; end if;
    k := cat.parent_key; depth := depth + 1;
  end loop;
  return 'class_admin';
end $$;

-- Langkah B + C (§7.5): batasi oleh widest_audience node, lalu oleh langit-langit page.
create function app.effective_audience(p_class uuid, p_key text, p_owner uuid default null,
                                       p_item public.visibility_audience default null)
returns public.visibility_audience
language plpgsql stable security definer set search_path = '' as $$
declare
  cat public.visibility_catalog; anc public.visibility_catalog;
  own public.visibility_audience; k text; depth int := 0;
begin
  select * into cat from public.visibility_catalog where key = p_key;
  if not found then return 'class_admin'; end if;
  own := greatest(app.own_audience(p_class, p_key, p_owner, p_item), cat.widest_audience);
  k := cat.parent_key;
  while k is not null and depth < 6 loop
    select * into anc from public.visibility_catalog where key = k;
    exit when not found;
    if anc.kind = 'page' then
      return greatest(own, greatest(app.own_audience(p_class, anc.key, null), anc.widest_audience));
    end if;
    k := anc.parent_key; depth := depth + 1;
  end loop;
  return own;
end $$;

-- Langkah D
create function app.can_view(p_class uuid, p_key text, p_owner uuid default null,
                             p_item public.visibility_audience default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.audience_allows(app.effective_audience(p_class, p_key, p_owner, p_item),
                             p_class, p_owner) $$;

-- Sabuk pengaman: Postgres memberi EXECUTE ke PUBLIC pada setiap fungsi baru.
-- Dicabut global, lalu hanya fungsi yang dibutuhkan policy/view/RPC/CHECK yang
-- diberi grant. theme_is_valid dipakai CHECK pada classes, jadi wajib ada di sini
-- atau UPDATE oleh Ketua akan gagal.
revoke all on all functions in schema app from public;
grant execute on function app.current_class_id(), app.is_active_member(uuid),
  app.has_permission(uuid, text), app.theme_is_valid(jsonb),
  app.can_view(uuid, text, uuid, public.visibility_audience) to anon, authenticated;
