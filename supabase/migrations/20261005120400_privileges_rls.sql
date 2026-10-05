-- Migration 0005 — hak akses dan RLS (blueprint §8.3)
--
-- Default-deny di lapisan privilege, RLS sebagai lapisan kedua. UPDATE dibatasi
-- per kolom supaya anggota tidak bisa menulis role_id/status/class_id/user_id.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

alter table public.classes            enable row level security;
alter table public.roles              enable row level security;
alter table public.memberships        enable row level security;
alter table public.member_profiles    enable row level security;
alter table public.portfolio_items    enable row level security;
alter table public.social_links       enable row level security;
alter table public.class_links        enable row level security;
alter table public.schedules          enable row level security;
alter table public.events             enable row level security;
alter table public.tasks              enable row level security;
-- Tanpa policy dan tanpa grant = tertutup total; hanya lewat RPC ter-gating (§7.9).
alter table public.class_activity     enable row level security;
alter table public.visibility_catalog enable row level security;
alter table public.visibility_rules   enable row level security;

-- GRANT ---------------------------------------------------------------------
grant select on public.visibility_catalog to anon, authenticated;
grant select on public.classes, public.roles, public.memberships,
                public.member_profiles to authenticated;
grant update (name, code, tagline, description, highlight_text, highlight_url,
              logo_path, cover_path, timezone, theme) on public.classes to authenticated;
grant update (role_id, status) on public.memberships to authenticated;
grant update (username, full_name, nickname, bio, avatar_path)
  on public.member_profiles to authenticated;

grant select, delete on public.portfolio_items, public.social_links to authenticated;
grant select on public.portfolio_items, public.social_links to anon;  -- baris tetap difilter policy
grant insert (class_id, user_id, kind, title, description, occurred_on, url, media_path, visibility)
  on public.portfolio_items to authenticated;
grant update (kind, title, description, occurred_on, url, media_path, visibility)
  on public.portfolio_items to authenticated;
grant insert (class_id, user_id, platform, label, url, visibility)
  on public.social_links to authenticated;
grant update (platform, label, url, visibility) on public.social_links to authenticated;

grant select on public.class_links, public.schedules, public.events, public.tasks
  to anon, authenticated;
grant delete on public.class_links, public.schedules, public.events, public.tasks to authenticated;
grant insert (class_id, platform, label, url) on public.class_links to authenticated;
grant update (platform, label, url) on public.class_links to authenticated;
grant insert (class_id, title, description, start_at, end_at, location, type, url)
  on public.schedules to authenticated;
grant update (title, description, start_at, end_at, location, type, url)
  on public.schedules to authenticated;
grant insert (class_id, title, description, start_at, end_at, location, organizer, cover_path, url)
  on public.events to authenticated;
grant update (title, description, start_at, end_at, location, organizer, cover_path, url)
  on public.events to authenticated;
grant insert (class_id, title, description, deadline, target, url, status)
  on public.tasks to authenticated;
grant update (title, description, deadline, target, url, status) on public.tasks to authenticated;

grant select, delete on public.visibility_rules to authenticated;
grant insert (class_id, key, owner_id, audience) on public.visibility_rules to authenticated;
grant update (audience) on public.visibility_rules to authenticated;

-- POLICY --------------------------------------------------------------------
create policy catalog_read on public.visibility_catalog for select
  to anon, authenticated using (true);

create policy classes_select on public.classes for select to authenticated
  using (app.has_permission(id, 'class.manage'));
create policy classes_update on public.classes for update to authenticated
  using (app.has_permission(id, 'class.manage'))
  with check (app.has_permission(id, 'class.manage'));

create policy roles_select on public.roles for select to authenticated
  using (app.has_permission(class_id, 'members.manage'));

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or app.has_permission(class_id, 'members.manage'));
create policy memberships_update on public.memberships for update to authenticated
  using (app.has_permission(class_id, 'members.manage'))
  with check (app.has_permission(class_id, 'members.manage'));
-- Tidak ada policy INSERT/DELETE: pembuatan lewat RPC provision_member + Admin API,
-- penghapusan lewat cascade auth.users.

-- Hanya pemilik yang bisa membaca tabel dasar profil. Ketua mengubah nama/username
-- lewat RPC update_member_identity supaya tidak pernah mendapat jalur baca ke kolom
-- milik anggota (nickname/bio/avatar) yang mungkin berstatus `self` (D-18).
create policy member_profiles_select_own on public.member_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy member_profiles_update_own on public.member_profiles for update to authenticated
  using (user_id = (select auth.uid()) and app.is_active_member(class_id))
  with check (user_id = (select auth.uid()) and app.is_active_member(class_id));

-- Konten milik anggota: baca = visibility, tulis = pemilik aktif
create policy portfolio_select on public.portfolio_items for select to anon, authenticated
  using (app.can_view(class_id, 'item.portfolio', user_id, visibility));
create policy portfolio_insert on public.portfolio_items for insert to authenticated
  with check (user_id = (select auth.uid()) and app.is_active_member(class_id));
create policy portfolio_update on public.portfolio_items for update to authenticated
  using (user_id = (select auth.uid()) and app.is_active_member(class_id))
  with check (user_id = (select auth.uid()) and app.is_active_member(class_id));
create policy portfolio_delete on public.portfolio_items for delete to authenticated
  using (user_id = (select auth.uid()) and app.is_active_member(class_id));

create policy social_select on public.social_links for select to anon, authenticated
  using (app.can_view(class_id, 'item.social_link', user_id, visibility));
create policy social_insert on public.social_links for insert to authenticated
  with check (user_id = (select auth.uid()) and app.is_active_member(class_id));
create policy social_update on public.social_links for update to authenticated
  using (user_id = (select auth.uid()) and app.is_active_member(class_id))
  with check (user_id = (select auth.uid()) and app.is_active_member(class_id));
create policy social_delete on public.social_links for delete to authenticated
  using (user_id = (select auth.uid()) and app.is_active_member(class_id));

-- Konten kelas: baca = visibility page, tulis = permission
create policy class_links_select on public.class_links for select to anon, authenticated
  using (app.can_view(class_id, 'section.class.links')
         or app.has_permission(class_id, 'class.manage'));
create policy class_links_insert on public.class_links for insert to authenticated
  with check (app.has_permission(class_id, 'class.manage'));
create policy class_links_update on public.class_links for update to authenticated
  using (app.has_permission(class_id, 'class.manage'))
  with check (app.has_permission(class_id, 'class.manage'));
create policy class_links_delete on public.class_links for delete to authenticated
  using (app.has_permission(class_id, 'class.manage'));

create policy schedules_select on public.schedules for select to anon, authenticated
  using (app.can_view(class_id, 'page.schedule')
         or app.has_permission(class_id, 'schedule.manage'));
create policy schedules_insert on public.schedules for insert to authenticated
  with check (app.has_permission(class_id, 'schedule.manage'));
create policy schedules_update on public.schedules for update to authenticated
  using (app.has_permission(class_id, 'schedule.manage'))
  with check (app.has_permission(class_id, 'schedule.manage'));
create policy schedules_delete on public.schedules for delete to authenticated
  using (app.has_permission(class_id, 'schedule.manage'));

create policy events_select on public.events for select to anon, authenticated
  using (app.can_view(class_id, 'page.events')
         or app.has_permission(class_id, 'events.manage'));
create policy events_insert on public.events for insert to authenticated
  with check (app.has_permission(class_id, 'events.manage'));
create policy events_update on public.events for update to authenticated
  using (app.has_permission(class_id, 'events.manage'))
  with check (app.has_permission(class_id, 'events.manage'));
create policy events_delete on public.events for delete to authenticated
  using (app.has_permission(class_id, 'events.manage'));

create policy tasks_select on public.tasks for select to anon, authenticated
  using (app.can_view(class_id, 'page.tasks')
         or app.has_permission(class_id, 'tasks.manage'));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (app.has_permission(class_id, 'tasks.manage'));
create policy tasks_update on public.tasks for update to authenticated
  using (app.has_permission(class_id, 'tasks.manage'))
  with check (app.has_permission(class_id, 'tasks.manage'));
create policy tasks_delete on public.tasks for delete to authenticated
  using (app.has_permission(class_id, 'tasks.manage'));

-- visibility_rules: aturan kelas oleh class.manage, aturan anggota oleh pemilik
create policy vis_rules_select on public.visibility_rules for select to authenticated
  using ((owner_id is null and app.has_permission(class_id, 'class.manage'))
         or owner_id = (select auth.uid()));
create policy vis_rules_insert on public.visibility_rules for insert to authenticated
  with check ((owner_id is null and app.has_permission(class_id, 'class.manage'))
              or (owner_id = (select auth.uid()) and app.is_active_member(class_id)));
create policy vis_rules_update on public.visibility_rules for update to authenticated
  using ((owner_id is null and app.has_permission(class_id, 'class.manage'))
         or owner_id = (select auth.uid()))
  with check ((owner_id is null and app.has_permission(class_id, 'class.manage'))
              or (owner_id = (select auth.uid()) and app.is_active_member(class_id)));
create policy vis_rules_delete on public.visibility_rules for delete to authenticated
  using ((owner_id is null and app.has_permission(class_id, 'class.manage'))
         or owner_id = (select auth.uid()));
