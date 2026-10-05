-- Migration 0007 — Storage (blueprint §13.3)
--
-- Prinsip: visibilitas objek = visibilitas baris yang mereferensikannya. Policy di
-- sini tidak menduplikasi aturan visibility, melainkan bertanya ke view/tabel yang
-- sudah ber-RLS dan bermasker. Karena `class_identity_v`/`member_profile_v`
-- mengembalikan NULL path bila viewer tidak berhak, policy select otomatis menolak.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('class-media',  'class-media',  false, 2097152, array['image/jpeg','image/png','image/webp']),
  ('member-media', 'member-media', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- class-media ---------------------------------------------------------------
create policy class_media_select on storage.objects for select to anon, authenticated
using (bucket_id = 'class-media' and (
     exists (select 1 from public.class_identity_v v
             where v.logo_path = storage.objects.name
                or v.cover_path = storage.objects.name)
  or exists (select 1 from public.events e where e.cover_path = storage.objects.name)));

-- Path selalu {class_id}/{logo|cover|events}/... dan dibangun di server (§13.2),
-- sehingga pemeriksaan folder di sini bukan tebakan nama file dari klien.
create policy class_media_insert on storage.objects for insert to authenticated
with check (bucket_id = 'class-media'
  and (storage.foldername(name))[1] = app.current_class_id()::text
  and (   ((storage.foldername(name))[2] in ('logo','cover')
           and app.has_permission(app.current_class_id(), 'class.manage'))
       or ((storage.foldername(name))[2] = 'events'
           and app.has_permission(app.current_class_id(), 'events.manage'))));

create policy class_media_delete on storage.objects for delete to authenticated
using (bucket_id = 'class-media'
  and (storage.foldername(name))[1] = app.current_class_id()::text
  and (   ((storage.foldername(name))[2] in ('logo','cover')
           and app.has_permission(app.current_class_id(), 'class.manage'))
       or ((storage.foldername(name))[2] = 'events'
           and app.has_permission(app.current_class_id(), 'events.manage'))));

-- member-media --------------------------------------------------------------
create policy member_media_select on storage.objects for select to anon, authenticated
using (bucket_id = 'member-media' and (
     (storage.foldername(name))[2] = (select auth.uid())::text  -- pemilik
  or exists (select 1 from public.member_profile_v v where v.avatar_path = storage.objects.name)
  or exists (select 1 from public.portfolio_items i where i.media_path = storage.objects.name)));

create policy member_media_insert on storage.objects for insert to authenticated
with check (bucket_id = 'member-media'
  and (storage.foldername(name))[1] = app.current_class_id()::text
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (storage.foldername(name))[3] in ('avatar','portfolio')
  and app.is_active_member(app.current_class_id()));

-- Delete dibatasi ke pemilik folder. Objek milik anggota yang sudah tidak aktif ikut
-- terhapus saat prefix-nya dibersihkan server-side setelah anggota dihapus (§13.6).
create policy member_media_delete on storage.objects for delete to authenticated
using (bucket_id = 'member-media'
  and (storage.foldername(name))[2] = (select auth.uid())::text);

-- Tidak ada policy UPDATE: setiap upload membuat objek baru (upsert=false).
