-- Migration 0004 — trigger (blueprint §8.2)
--
-- Lapisan kedua menegakkan invarian yang tidak bisa diekspresikan sebagai policy RLS:
-- kolom immutable, transisi status, last-admin, batas baris per anggota, dan
-- pencatatan aktivitas.

create function app.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create function app.set_created_by() returns trigger language plpgsql as $$
begin new.created_by := auth.uid(); return new; end $$;

-- Validasi aturan visibility (EC010-EC013)
create function app.visibility_rules_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.visibility_catalog;
begin
  select * into c from public.visibility_catalog where key = new.key;
  if not found then raise exception 'unknown visibility key' using errcode = 'EC010'; end if;
  if new.audience < c.widest_audience then
    raise exception 'audience wider than allowed' using errcode = 'EC011'; end if;
  if new.owner_id is not null and c.scope <> 'member' then
    raise exception 'member rule on class-scope key' using errcode = 'EC012'; end if;
  if new.audience = 'self' and c.scope = 'class' then
    raise exception 'self invalid for class-scope key' using errcode = 'EC013'; end if;
  new.updated_at := now(); new.updated_by := auth.uid();
  return new;
end $$;

-- Guard membership: kolom immutable + transisi status oleh pengguna (EC030, EC021)
create function app.memberships_guard() returns trigger language plpgsql as $$
begin
  if new.class_id is distinct from old.class_id or new.user_id is distinct from old.user_id then
    raise exception 'immutable columns' using errcode = 'EC030'; end if;
  if current_user in ('anon','authenticated') and new.status is distinct from old.status then
    -- invited -> active hanya lewat RPC activate_my_membership, bukan lewat update langsung.
    if not ((old.status = 'active'   and new.status = 'inactive')
         or (old.status = 'inactive' and new.status = 'active' and old.joined_at is not null)) then
      raise exception 'invalid status transition' using errcode = 'EC021'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Kelas harus selalu punya >=1 anggota aktif dengan class.manage (EC001).
-- Lock per kelas lewat `for update` pada baris classes membuat pemeriksaan
-- ini aman dari write skew antar-transaksi.
create function app.assert_has_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
declare was_admin boolean;
begin
  if old.status <> 'active' then return null; end if;
  select 'class.manage' = any (r.permissions) into was_admin from public.roles r
   where r.class_id = old.class_id and r.id = old.role_id;
  if not coalesce(was_admin, false) then return null; end if;
  perform 1 from public.classes where id = old.class_id for update;
  if not found then return null; end if;  -- kelas ikut terhapus
  if not exists (select 1 from public.memberships m
       join public.roles r on r.class_id = m.class_id and r.id = m.role_id
       where m.class_id = old.class_id and m.status = 'active'
         and 'class.manage' = any (r.permissions)) then
    raise exception 'class must keep at least one active admin' using errcode = 'EC001';
  end if;
  return null;
end $$;

-- Guard profil (EC030-EC032): kolom milik pemilik, username milik pengelola kelas.
-- Tabel dasar tetap tertutup bagi Ketua agar konten `self` tidak bocor (D-18).
create function app.member_profiles_guard() returns trigger language plpgsql as $$
begin
  if new.class_id is distinct from old.class_id or new.user_id is distinct from old.user_id then
    raise exception 'immutable columns' using errcode = 'EC030'; end if;
  if current_user in ('anon','authenticated') then
    if auth.uid() is distinct from old.user_id and (
         new.nickname    is distinct from old.nickname
      or new.bio         is distinct from old.bio
      or new.avatar_path is distinct from old.avatar_path) then
      raise exception 'only owner may edit this column' using errcode = 'EC031'; end if;
    if new.username is distinct from old.username
       and not app.has_permission(old.class_id, 'members.manage') then
      raise exception 'username is managed by admin' using errcode = 'EC032'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Batas jumlah baris per anggota (EC040). Argumen trigger = batas maksimum.
create function app.enforce_row_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_max int := tg_argv[0]::int; v_count int;
begin
  execute format('select count(*) from %I.%I where class_id = $1 and user_id = $2',
                 tg_table_schema, tg_table_name) into v_count using new.class_id, new.user_id;
  if v_count >= v_max then raise exception 'row limit reached' using errcode = 'EC040'; end if;
  return new;
end $$;

-- Log aktivitas (A-17): satu-satunya jalur menulis class_activity.
-- Hanya 'created', 'completed', dan 'joined' yang dicatat; update/hapus lain tidak.
create function app.log_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'tasks' and tg_op = 'UPDATE' then
    if new.status = 'completed' and old.status is distinct from 'completed' then
      insert into public.class_activity (class_id, actor_id, action, entity_type, entity_id)
      values (new.class_id, auth.uid(), 'completed', 'task', new.id);
    end if;
  elsif tg_table_name = 'memberships' and tg_op = 'UPDATE' then
    if new.status = 'active' and old.status = 'invited' then
      insert into public.class_activity (class_id, actor_id, action, entity_type, entity_id)
      values (new.class_id, new.user_id, 'joined', 'member', new.id);
    end if;
  elsif tg_op = 'INSERT' then
    insert into public.class_activity (class_id, actor_id, action, entity_type, entity_id)
    values (new.class_id, auth.uid(), 'created', tg_argv[0], new.id);
  end if;
  return null;
end $$;

-- Pemasangan -----------------------------------------------------------------

create trigger classes_touch  before update on public.classes
  for each row execute function app.touch_updated_at();
create trigger portfolio_touch before update on public.portfolio_items
  for each row execute function app.touch_updated_at();
create trigger social_touch   before update on public.social_links
  for each row execute function app.touch_updated_at();
create trigger schedules_touch before update on public.schedules
  for each row execute function app.touch_updated_at();
create trigger events_touch   before update on public.events
  for each row execute function app.touch_updated_at();
create trigger tasks_touch    before update on public.tasks
  for each row execute function app.touch_updated_at();

create trigger schedules_created_by before insert on public.schedules
  for each row execute function app.set_created_by();
create trigger events_created_by before insert on public.events
  for each row execute function app.set_created_by();
create trigger tasks_created_by before insert on public.tasks
  for each row execute function app.set_created_by();

create trigger visibility_rules_guard before insert or update on public.visibility_rules
  for each row execute function app.visibility_rules_guard();
create trigger memberships_guard before update on public.memberships
  for each row execute function app.memberships_guard();
create trigger memberships_assert_admin after update of role_id, status or delete
  on public.memberships for each row execute function app.assert_has_admin();
create trigger member_profiles_guard before update on public.member_profiles
  for each row execute function app.member_profiles_guard();

create trigger portfolio_limit before insert on public.portfolio_items
  for each row execute function app.enforce_row_limit('50');
create trigger social_limit before insert on public.social_links
  for each row execute function app.enforce_row_limit('10');

create trigger schedules_activity after insert on public.schedules
  for each row execute function app.log_activity('schedule');
create trigger events_activity after insert on public.events
  for each row execute function app.log_activity('event');
create trigger tasks_activity_ins after insert on public.tasks
  for each row execute function app.log_activity('task');
create trigger tasks_activity_upd after update of status on public.tasks
  for each row execute function app.log_activity();
create trigger memberships_activity after update of status on public.memberships
  for each row execute function app.log_activity();

revoke all on all functions in schema app from public;
