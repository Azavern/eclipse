-- Migration 0011 — antrean permintaan ganti kata sandi (blueprint §6.2, A-06)
--
-- "Lupa password" di kelas ini bukan tautan ke form reset mandiri: tidak ada
-- email delivery (A-05), jadi pemulihannya tetap lewat Ketua. Yang belum ada
-- adalah tempat bagi anggota untuk memberi tahu, dan bagi Ketua untuk melihat
-- siapa yang meminta. Tabel ini adalah antrean itu — BUKAN token.
--
-- Token tidak pernah menyentuh tabel ini. Tautan sekali pakai diterbitkan
-- Chairs lewat Auth Admin API hanya saat dia menekan tombol, dan hanya
-- ditampilkan sekali (pola yang sama dengan undangan anggota).

create table public.password_reset_requests (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  email      text not null,
  status     text not null default 'pending',
  created_at timestamptz not null default now(),
  issued_at  timestamptz,

  -- `emailField` sudah menormalkan ke huruf kecil sebelum menulis, jadi bentuk
  -- yang disimpan selalu bisa dibandingkan dengan email di Auth.
  constraint password_reset_requests_email_check
    check (email = lower(email) and length(email) between 3 and 254),
  constraint password_reset_requests_status_check
    check (status in ('pending', 'issued')),
  -- issued_at terisi tepat saat tautan terbit, tidak sebelum dan tidak sesudah.
  constraint password_reset_requests_issued_at_check
    check ((status = 'issued') = (issued_at is not null))
);

-- Satu permintaan terbuka per email per kelas: spam tidak menumpuk, dan Ketua
-- tidak melihat email yang sama berulang kali.
create unique index password_reset_requests_pending_idx
  on public.password_reset_requests (class_id, email)
  where status = 'pending';

-- Antrean selalu dibaca "terbaru dulu" untuk satu kelas.
create index password_reset_requests_recent_idx
  on public.password_reset_requests (class_id, created_at desc);

alter table public.password_reset_requests enable row level security;

-- GRANT ---------------------------------------------------------------------
-- Tanpa grant INSERT untuk anon: permintaan masuk lewat Server Action yang
-- memakai service role, jadi peramban tidak pernah punya permukaan tulis ke
-- tabel ini. Anonim tetap bisa mengirim form — lewat aksi itu, bukan lewat
-- PostgREST langsung.
grant select on public.password_reset_requests to authenticated;
grant update (status) on public.password_reset_requests to authenticated;

create policy password_reset_requests_select on public.password_reset_requests
  for select to authenticated
  using (app.has_permission(class_id, 'members.manage'));

create policy password_reset_requests_update on public.password_reset_requests
  for update to authenticated
  using (app.has_permission(class_id, 'members.manage'))
  with check (app.has_permission(class_id, 'members.manage'));

-- Tidak ada policy INSERT/DELETE: INSERT hanya lewat service role, DELETE
-- dibiarkan kosong supaya antrean menjadi jejak audit yang tidak bisa dihapus
-- dari UI (§7.9).

-- Trigger -------------------------------------------------------------------
create function app.password_reset_requests_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.class_id is distinct from old.class_id
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at then
    raise exception 'immutable columns' using errcode = 'EC030';
  end if;

  -- Permintaan yang tautannya sudah terbit tidak bisa dibuka lagi: mengulang
  -- berarti menerbitkan tautan kedua untuk permintaan yang sama.
  if old.status = 'issued' and new.status <> 'issued' then
    raise exception 'request already issued' using errcode = 'EC021';
  end if;

  -- Waktu terbit ditulis database, bukan jam mesin klien (§9: satu sumber waktu).
  if new.status = 'issued' and old.status = 'pending' then
    new.issued_at := now();
  end if;

  return new;
end $$;

create trigger password_reset_requests_guard
  before update on public.password_reset_requests
  for each row execute function app.password_reset_requests_guard();
