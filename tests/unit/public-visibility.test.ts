import { describe, expect, it } from 'vitest';
import {
  publicVisibility,
  type Audience,
  type VisibilityEntry,
  type VisibilityKey,
} from '@/lib/visibility/registry';

type Pair = [Audience, Audience];

// Peta pada konfigurasi bawaan: tidak ada override di `visibility_rules`, jadi
// `own` sama dengan default katalog dan `effective` sudah dipangkas plafon page
// induk. Persis yang dikirim `get_visibility_map` untuk Ketua saat ini.
const defaults: Record<string, Pair> = {
  'page.home': ['public', 'public'],
  'page.class_about': ['public', 'public'],
  'page.schedule': ['class_member', 'class_member'],
  'page.events': ['class_member', 'class_member'],
  'page.tasks': ['class_member', 'class_member'],
  'page.members': ['class_member', 'class_member'],
  'section.home.identity': ['public', 'public'],
  'section.home.schedule': ['class_member', 'class_member'],
  'section.home.events': ['class_member', 'class_member'],
  'section.home.tasks': ['class_member', 'class_member'],
  'section.home.overview': ['class_member', 'class_member'],
  'section.home.activity': ['class_member', 'class_member'],
  'section.home.members': ['class_member', 'class_member'],
  'section.class.links': ['public', 'public'],
  'field.class.code': ['public', 'public'],
  'field.class.tagline': ['public', 'public'],
  'field.class.description': ['public', 'public'],
  'field.class.highlight': ['public', 'public'],
  'field.class.logo': ['public', 'public'],
  'field.class.cover': ['public', 'public'],
  'field.member.avatar': ['class_member', 'class_member'],
  'field.member.nickname': ['class_member', 'class_member'],
  'field.member.bio': ['class_member', 'class_member'],
  'section.member.portfolio': ['class_member', 'class_member'],
  'item.portfolio': ['class_member', 'class_member'],
  'section.member.social': ['class_member', 'class_member'],
  'item.social_link': ['class_member', 'class_member'],
};

function buildMap(overrides: Record<string, Audience> = {}) {
  const map = {} as Record<VisibilityKey, VisibilityEntry>;
  for (const key of Object.keys(defaults)) {
    const pair = defaults[key] as Pair;
    const own = overrides[key] ?? pair[0];
    map[key as VisibilityKey] = { own, effective: own, allowed: true };
  }
  return map;
}

describe('publicVisibility: apa yang dilihat pengunjung tanpa login', () => {
  it('pada konfigurasi bawaan hanya identitas kelas yang terbuka', () => {
    const view = publicVisibility(buildMap());

    expect(view['page.home']).toBe(true);
    expect(view['page.class_about']).toBe(true);
    expect(view['section.home.identity']).toBe(true);
    expect(view['field.class.tagline']).toBe(true);

    // Halaman dan section yang default-nya class_member tetap tertutup.
    expect(view['page.schedule']).toBe(false);
    expect(view['page.events']).toBe(false);
    expect(view['page.members']).toBe(false);
    expect(view['section.home.schedule']).toBe(false);
    expect(view['section.home.overview']).toBe(false);
  });

  it('section tidak terbuka hanya karena page sumbernya masih tertutup', () => {
    // Ini penyebab paling sering beranda tetap kosong buat pengunjung: satu
    // section dibuat publik, tapi page sumbernya belum.
    const sectionOnly = publicVisibility(buildMap(), { 'section.home.schedule': 'public' });
    expect(sectionOnly['section.home.schedule']).toBe(false);

    const pageToo = publicVisibility(buildMap(), {
      'page.schedule': 'public',
      'section.home.schedule': 'public',
    });
    expect(pageToo['page.schedule']).toBe(true);
    expect(pageToo['section.home.schedule']).toBe(true);
  });

  it('mempertahankan plafon widest_audience walau dipilih lebih luas', () => {
    // page.tasks punya widest_audience = class_member, jadi "publik" tidak
    // boleh membuatnya terbuka untuk anonim meski select-nya dipaksa.
    const view = publicVisibility(buildMap(), { 'page.tasks': 'public' });
    expect(view['page.tasks']).toBe(false);
    expect(view['section.home.tasks']).toBe(false);
  });

  it('bagian yang tadinya publik bisa ditutup lagi', () => {
    const view = publicVisibility(buildMap({ 'section.home.identity': 'class_member' }));
    expect(view['section.home.identity']).toBe(false);
    expect(view['page.home']).toBe(true);
  });
});