-- KELAS ---------------------------------------------------------------
create table public.classes (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 1 and 60),
  code             text check (code ~ '^[A-Za-z0-9-]{2,20}$'),
  tagline          text check (char_length(tagline) <= 120),
  description      text check (char_length(description) <= 800),
  highlight_text   text check (char_length(highlight_text) <= 160),
  highlight_url    text check (highlight_url ~ '^https://' and char_length(highlight_url) <= 2048),
  logo_path        text,
  cover_path       text,
  timezone         text not null default 'Asia/Jakarta'
                   check (timezone in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura')),
  theme            jsonb not null check (app.theme_is_valid(theme)),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
-- A-02: tepat satu kelas per deployment. Menghapus index ini = migrasi multi-kelas (Phase 3).
create unique index classes_single_row on public.classes ((true));

-- ROLE & MEMBERSHIP --------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  key         text not null check (key ~ '^[a-z_]{2,30}$'),
  name        text not null check (char_length(name) between 1 and 40),
  permissions text[] not null default '{}',
  created_at  timestamptz not null default now(),
  unique (class_id, key),
  unique (class_id, id),
  check (permissions <@ array['class.manage','members.manage','schedule.manage',
                              'events.manage','tasks.manage']::text[])
);

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role_id     uuid not null,
  status      public.membership_status not null default 'invited',
  joined_at   timestamptz,                         -- terisi saat pertama kali active
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (class_id, user_id),
  foreign key (class_id, role_id) references public.roles(class_id, id)  -- restrict
);

-- PROFIL & KONTEN MILIK ANGGOTA --------------------------------------
create table public.member_profiles (
  class_id    uuid not null,
  user_id     uuid not null,
  username    text not null check (username ~ '^[a-z0-9_]{3,30}$'),
  full_name   text not null check (char_length(full_name) between 1 and 80),
  nickname    text check (char_length(nickname) <= 40),
  bio         text check (char_length(bio) <= 500),
  avatar_path text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (class_id, user_id),
  unique (class_id, username),
  foreign key (class_id, user_id) references public.memberships(class_id, user_id)
    on delete cascade
);

create table public.portfolio_items (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null,
  user_id     uuid not null,
  kind        public.portfolio_kind not null default 'project',
  title       text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 1000),
  occurred_on date not null,
  url         text check (url ~ '^https://' and char_length(url) <= 2048),
  media_path  text,
  visibility  public.visibility_audience,           -- null = ikut aturan section/key (§7.5)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (class_id, user_id) references public.memberships(class_id, user_id)
    on delete cascade
);
create unique index portfolio_items_media_path_uq on public.portfolio_items (media_path)
  where media_path is not null;

create table public.social_links (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null,
  user_id     uuid not null,
  platform    public.social_platform not null,
  label       text check (char_length(label) between 1 and 40),
  url         text not null check (url ~ '^https://' and char_length(url) <= 2048),
  visibility  public.visibility_audience,           -- null = inherit
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (platform <> 'custom' or label is not null),
  foreign key (class_id, user_id) references public.memberships(class_id, user_id)
    on delete cascade
);
create unique index social_links_one_per_platform
  on public.social_links (class_id, user_id, platform)
  where platform not in ('website','custom');

-- KONTEN KELAS ---------------------------------------------------------
create table public.class_links (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  platform    public.social_platform not null,
  label       text check (char_length(label) between 1 and 40),
  url         text not null check (url ~ '^https://' and char_length(url) <= 2048),
  created_at  timestamptz not null default now(),
  check (platform <> 'custom' or label is not null)
);

create table public.schedules (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 1000),
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  location    text check (char_length(location) <= 120),
  type        public.schedule_type not null default 'class',
  url         text check (url ~ '^https://' and char_length(url) <= 2048),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_at >= start_at)
);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  location    text check (char_length(location) <= 120),
  organizer   text check (char_length(organizer) <= 80),   -- teks bebas (menghindari kebocoran visibility profil)
  cover_path  text,
  url         text check (url ~ '^https://' and char_length(url) <= 2048),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_at >= start_at)
);
create unique index events_cover_path_uq on public.events (cover_path) where cover_path is not null;

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  deadline    timestamptz not null,
  target      text not null default 'Seluruh kelas' check (char_length(target) between 1 and 80),
  url         text check (url ~ '^https://' and char_length(url) <= 2048),
  status      public.task_status not null default 'active',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.class_activity (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null check (action in ('created','completed','joined')),
  entity_type text not null check (entity_type in ('schedule','event','task','member')),
  entity_id   uuid not null,
  created_at  timestamptz not null default now()
);

-- VISIBILITY (§7) --------------------------------------------------------
create table public.visibility_catalog (
  key              text primary key check (key ~ '^(page|section|field|item)(\.[a-z_]+)+$'),
  kind             public.visibility_kind not null,
  scope            public.visibility_scope not null,
  parent_key       text references public.visibility_catalog(key),
  default_audience public.visibility_audience,         -- null = ikut parent
  widest_audience  public.visibility_audience not null, -- batas terluas yang boleh dipilih
  check (key like kind::text || '.%'),
  check (kind <> 'page' or (parent_key is null and default_audience is not null)),
  check (parent_key is not null or default_audience is not null),
  check (default_audience is null or default_audience >= widest_audience)
);

create table public.visibility_rules (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  key         text not null references public.visibility_catalog(key) on delete cascade,
  owner_id    uuid references auth.users(id) on delete cascade,  -- null = aturan kelas
  audience    public.visibility_audience not null,
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index visibility_rules_class_uq on public.visibility_rules (class_id, key)
  where owner_id is null;
create unique index visibility_rules_owner_uq on public.visibility_rules (class_id, key, owner_id)
  where owner_id is not null;

-- INDEX PENDUKUNG ------------------------------------------------------
create index memberships_class_status_idx   on public.memberships (class_id, status);
create index portfolio_items_owner_idx      on public.portfolio_items (class_id, user_id, occurred_on desc);
create index social_links_owner_idx         on public.social_links (class_id, user_id);
create index schedules_class_start_idx      on public.schedules (class_id, start_at);
create index events_class_start_idx         on public.events (class_id, start_at);
create index tasks_class_status_deadline_idx on public.tasks (class_id, status, deadline);
create index class_activity_class_time_idx  on public.class_activity (class_id, created_at desc);