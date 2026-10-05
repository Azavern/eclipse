-- Migration 0006 — view bermasker dan RPC (blueprint §8.4)

-- VIEW ---------------------------------------------------------------------
-- Sengaja berjalan dengan hak pemilik view (default, BUKAN security_invoker) agar
-- bisa membaca tabel dasar yang tertutup. Penyaringan dan penyamaran dilakukan di
-- dalam view memakai auth.uid() dari JWT pemanggil. Linter Supabase menandai
-- "security definer view" — itu memang disengaja. Jangan memakai FORCE ROW LEVEL
-- SECURITY pada tabel dasar karena akan merusak view.

create view public.class_identity_v as
select c.id, c.name, c.theme, c.timezone,
  case when app.can_view(c.id, 'field.class.code')        then c.code           end as code,
  case when app.can_view(c.id, 'field.class.tagline')     then c.tagline        end as tagline,
  case when app.can_view(c.id, 'field.class.description') then c.description    end as description,
  case when app.can_view(c.id, 'field.class.highlight')   then c.highlight_text end as highlight_text,
  case when app.can_view(c.id, 'field.class.highlight')   then c.highlight_url  end as highlight_url,
  case when app.can_view(c.id, 'field.class.logo')        then c.logo_path      end as logo_path,
  case when app.can_view(c.id, 'field.class.cover')       then c.cover_path     end as cover_path
from public.classes c;

create view public.member_profile_v as
select p.class_id, p.user_id, p.username, p.full_name,
  case when app.can_view(p.class_id, 'field.member.nickname', p.user_id) then p.nickname    end as nickname,
  case when app.can_view(p.class_id, 'field.member.bio',      p.user_id) then p.bio         end as bio,
  case when app.can_view(p.class_id, 'field.member.avatar',   p.user_id) then p.avatar_path end as avatar_path,
  m.role_id, r.name as role_name, m.status, m.joined_at
from public.member_profiles p
join public.memberships m on m.class_id = p.class_id and m.user_id = p.user_id
join public.roles r       on r.class_id = m.class_id and r.id = m.role_id
where app.can_view(p.class_id, 'page.members')
  and (m.status = 'active'
       or p.user_id = (select auth.uid())
       or app.has_permission(p.class_id, 'members.manage'));

grant select on public.class_identity_v, public.member_profile_v to anon, authenticated;

-- RPC -----------------------------------------------------------------------
create function public.get_viewer_context()
returns table (class_id uuid, user_id uuid, status public.membership_status,
               role_name text, permissions text[])
language sql stable security definer set search_path = '' as $$
  select c.id, (select auth.uid()), m.status, r.name,
         case when m.status = 'active' then r.permissions else '{}'::text[] end
  from public.classes c
  left join public.memberships m on m.class_id = c.id and m.user_id = (select auth.uid())
  left join public.roles r on r.class_id = m.class_id and r.id = m.role_id $$;

create function public.get_visibility_map()
returns table (key text, kind public.visibility_kind, scope public.visibility_scope,
               own_audience public.visibility_audience,
               effective_audience public.visibility_audience, allowed boolean)
language sql stable security definer set search_path = '' as $$
  select vc.key, vc.kind, vc.scope,
         app.own_audience(c.id, vc.key, null),
         app.effective_audience(c.id, vc.key, null),
         app.can_view(c.id, vc.key, null)
  from public.visibility_catalog vc cross join public.classes c $$;

-- Metrik bernilai NULL berarti tidak dirender di UI (AC-HOME-4), sehingga anonim
-- tidak bisa membandingkan angka dan menebak isi yang disembunyikan.
create function public.get_home_overview(p_due_soon_hours int default 72)
returns table (members_count int, upcoming_events_count int,
               active_tasks_count int, due_soon_tasks_count int)
language plpgsql stable security definer set search_path = '' as $$
declare v_class uuid := app.current_class_id();
        v_h int := least(greatest(p_due_soon_hours, 1), 720);
begin
  if not app.can_view(v_class, 'section.home.overview') then return; end if;  -- 0 baris
  return query select
    case when app.can_view(v_class, 'page.members') then
      (select count(*)::int from public.memberships m
        where m.class_id = v_class and m.status = 'active') end,
    case when app.can_view(v_class, 'page.events') then
      (select count(*)::int from public.events e
        where e.class_id = v_class and e.end_at >= now()) end,
    case when app.can_view(v_class, 'page.tasks') then
      (select count(*)::int from public.tasks t
        where t.class_id = v_class and t.status = 'active') end,
    case when app.can_view(v_class, 'page.tasks') then
      (select count(*)::int from public.tasks t
        where t.class_id = v_class and t.status = 'active'
          and t.deadline <= now() + make_interval(hours => v_h)) end;
end $$;

create function public.get_activity_trend(p_weeks int default 4)
returns table (week_start date, activity_count int)
language plpgsql stable security definer set search_path = '' as $$
declare v_class uuid := app.current_class_id();
        v_tz text; v_weeks int := least(greatest(p_weeks, 1), 12);
begin
  select timezone into v_tz from public.classes where id = v_class;
  if not app.can_view(v_class, 'section.home.activity') then return; end if;
  return query
    with weeks as (
      select (date_trunc('week', now() at time zone v_tz) - g * interval '1 week')::date as ws
      from generate_series(0, v_weeks - 1) g)
    select w.ws, count(a.id)::int
    from weeks w
    left join public.class_activity a
      on a.class_id = v_class
     and (a.created_at at time zone v_tz) >= w.ws
     and (a.created_at at time zone v_tz) <  w.ws + 7
    group by w.ws order by w.ws;
end $$;

create function public.provision_member(p_user_id uuid, p_full_name text,
                                        p_username text, p_role_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_class uuid := app.current_class_id();
begin
  if not app.has_permission(v_class, 'members.manage') then
    raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.memberships (class_id, user_id, role_id, status, created_by)
  values (v_class, p_user_id, p_role_id, 'invited', (select auth.uid()));
  insert into public.member_profiles (class_id, user_id, username, full_name)
  values (v_class, p_user_id, p_username, p_full_name);
end $$;

create function public.update_member_identity(p_user_id uuid, p_full_name text, p_username text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_class uuid := app.current_class_id(); n int;
begin
  if not app.has_permission(v_class, 'members.manage') then
    raise exception 'forbidden' using errcode = '42501'; end if;
  update public.member_profiles set full_name = p_full_name, username = p_username
   where class_id = v_class and user_id = p_user_id;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'member not found' using errcode = 'P0002'; end if;
end $$;

-- Satu-satunya jalur invited -> active. UPDATE langsung oleh pengguna ditolak
-- trigger EC021.
create function public.activate_my_membership() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.memberships
     set status = 'active', joined_at = coalesce(joined_at, now())
   where user_id = (select auth.uid()) and status = 'invited';
  if not found then raise exception 'nothing to activate' using errcode = 'EC020'; end if;
end $$;

-- SECURITY INVOKER (bukan DEFINER) supaya RLS dan guard trigger tetap berlaku.
-- p_rules = [{"key":"page.members","audience":"public"|null}, ...]; null = hapus aturan.
create function public.save_class_visibility(p_rules jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_class uuid := app.current_class_id(); r jsonb;
begin
  for r in select value from jsonb_array_elements(p_rules) loop
    if r->>'audience' is null then
      delete from public.visibility_rules
       where class_id = v_class and owner_id is null and key = r->>'key';
    else
      insert into public.visibility_rules (class_id, key, owner_id, audience)
      values (v_class, r->>'key', null, (r->>'audience')::public.visibility_audience)
      on conflict (class_id, key) where owner_id is null do update set audience = excluded.audience;
    end if;
  end loop;
end $$;

create function public.save_my_visibility(p_rules jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_class uuid := app.current_class_id(); v_uid uuid := (select auth.uid()); r jsonb;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  for r in select value from jsonb_array_elements(p_rules) loop
    if r->>'audience' is null then
      delete from public.visibility_rules
       where class_id = v_class and key = r->>'key' and owner_id = v_uid;
    else
      insert into public.visibility_rules (class_id, key, owner_id, audience)
      values (v_class, r->>'key', v_uid, (r->>'audience')::public.visibility_audience)
      on conflict (class_id, key, owner_id) where owner_id is not null
      do update set audience = excluded.audience;
    end if;
  end loop;
end $$;

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_viewer_context(), public.get_visibility_map(),
  public.get_home_overview(int), public.get_activity_trend(int) to anon, authenticated;
grant execute on function public.provision_member(uuid, text, text, uuid),
  public.update_member_identity(uuid, text, text), public.activate_my_membership(),
  public.save_class_visibility(jsonb), public.save_my_visibility(jsonb) to authenticated;
