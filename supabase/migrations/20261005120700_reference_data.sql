-- Migration 0008 — data referensi (blueprint §8.5)
--
-- Ini data referensi, bukan fixture: katalog visibility, kelas Eclipse, dan dua role.
-- Tidak ada tagline/deskripsi/kode karangan — semuanya NULL sampai Ketua mengisi,
-- dan UI menampilkan empty state (§15.2) alih-alih teks-placeholder.
--
-- Nilai palette di bawah WAJIB identik dengan DEFAULT_THEME di
-- src/lib/theme/defaults.ts; kesetaraan itu dijaga tes unit.

insert into public.visibility_catalog
  (key, kind, scope, parent_key, default_audience, widest_audience) values
('page.home','page','class',null,'public','public'),
('page.class_about','page','class',null,'public','public'),
('page.schedule','page','class',null,'class_member','public'),
('page.events','page','class',null,'class_member','public'),
('page.tasks','page','class',null,'class_member','class_member'),
('page.members','page','class',null,'class_member','public'),
('section.home.identity','section','class','page.home',null,'public'),
('section.home.schedule','section','class','page.home','class_member','public'),
('section.home.events','section','class','page.home','class_member','public'),
('section.home.tasks','section','class','page.home','class_member','class_member'),
('section.home.overview','section','class','page.home','class_member','public'),
('section.home.activity','section','class','page.home','class_member','public'),
('section.home.members','section','class','page.home','class_member','public'),
('section.class.links','section','class','page.class_about',null,'public'),
('field.class.code','field','class',null,'public','public'),
('field.class.tagline','field','class',null,'public','public'),
('field.class.description','field','class',null,'public','public'),
('field.class.highlight','field','class',null,'public','public'),
('field.class.logo','field','class',null,'public','public'),
('field.class.cover','field','class',null,'public','public'),
('field.member.avatar','field','member','page.members','class_member','public'),
('field.member.nickname','field','member','page.members','class_member','public'),
('field.member.bio','field','member','page.members','class_member','public'),
('section.member.portfolio','section','member','page.members','class_member','public'),
('item.portfolio','item','member','section.member.portfolio',null,'public'),
('section.member.social','section','member','page.members','class_member','public'),
('item.social_link','item','member','section.member.social',null,'public');

insert into public.classes (name, timezone, theme) values
('Eclipse', 'Asia/Jakarta', '{
  "layout": "standard",
  "font_preset": "editorial",
  "palette": {
    "primary": "#A64B00", "secondary": "#2C4A5E", "background": "#F7F4ED",
    "surface": "#FFFFFF", "border": "#D9D3C5", "text_primary": "#1C1B19",
    "text_secondary": "#5A564D", "success": "#2F6B3A", "warning": "#8A5A00",
    "error": "#B3261E"
  }
}'::jsonb);

insert into public.roles (class_id, key, name, permissions)
select id, 'ketua', 'Ketua',
       array['class.manage','members.manage','schedule.manage','events.manage','tasks.manage']
  from public.classes
union all
select id, 'member', 'Member', '{}'::text[] from public.classes;
