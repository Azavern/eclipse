import { describe, expect, it } from 'vitest';
import {
  AUDIENCES,
  AUDIENCE_LABEL,
  AUDIENCE_LEVELS,
  allowedAudiences,
  CLASS_SCOPE_KEYS,
  groupKeys,
  levelAllowed,
  MEMBER_SCOPE_KEYS,
  narrower,
  pageCeiling,
  toAudienceLevel,
  VISIBILITY_BY_KEY,
  VISIBILITY_KEYS,
  WIDEST_AUDIENCE,
  type Audience,
  type VisibilityKey,
} from '@/lib/visibility/registry';

// Katalog dari supabase/migrations/0008_reference_data.sql. Tes paritas menjaga
// registry TypeScript dan katalog DB tidak pernah berbeda (§22.4).
const CATALOG = [
  ['page.home', 'page', 'class', null, 'public', 'public'],
  ['page.class_about', 'page', 'class', null, 'public', 'public'],
  ['page.schedule', 'page', 'class', null, 'class_member', 'public'],
  ['page.events', 'page', 'class', null, 'class_member', 'public'],
  ['page.tasks', 'page', 'class', null, 'class_member', 'class_member'],
  ['page.members', 'page', 'class', null, 'class_member', 'public'],
  ['section.home.identity', 'section', 'class', 'page.home', null, 'public'],
  ['section.home.schedule', 'section', 'class', 'page.home', 'class_member', 'public'],
  ['section.home.events', 'section', 'class', 'page.home', 'class_member', 'public'],
  ['section.home.tasks', 'section', 'class', 'page.home', 'class_member', 'class_member'],
  ['section.home.overview', 'section', 'class', 'page.home', 'class_member', 'public'],
  ['section.home.activity', 'section', 'class', 'page.home', 'class_member', 'public'],
  ['section.home.members', 'section', 'class', 'page.home', 'class_member', 'public'],
  ['section.class.links', 'section', 'class', 'page.class_about', null, 'public'],
  ['field.class.code', 'field', 'class', null, 'public', 'public'],
  ['field.class.tagline', 'field', 'class', null, 'public', 'public'],
  ['field.class.description', 'field', 'class', null, 'public', 'public'],
  ['field.class.highlight', 'field', 'class', null, 'public', 'public'],
  ['field.class.logo', 'field', 'class', null, 'public', 'public'],
  ['field.class.cover', 'field', 'class', null, 'public', 'public'],
  ['field.member.avatar', 'field', 'member', 'page.members', 'class_member', 'public'],
  ['field.member.nickname', 'field', 'member', 'page.members', 'class_member', 'public'],
  ['field.member.bio', 'field', 'member', 'page.members', 'class_member', 'public'],
  ['section.member.portfolio', 'section', 'member', 'page.members', 'class_member', 'public'],
  ['item.portfolio', 'item', 'member', 'section.member.portfolio', null, 'public'],
  ['section.member.social', 'section', 'member', 'page.members', 'class_member', 'public'],
  ['item.social_link', 'item', 'member', 'section.member.social', null, 'public'],
] as const;

describe('paritas registry dengan katalog DB', () => {
  it('jumlah key sama: 27', () => {
    expect(VISIBILITY_KEYS).toHaveLength(27);
    expect(CATALOG).toHaveLength(27);
  });

  it('himpunan key identik, tanpa ada yang hilang atau tambahan', () => {
    const dbKeys = CATALOG.map(([key]) => key).sort();
    expect([...VISIBILITY_KEYS].sort()).toEqual([...dbKeys]);
  });

  it('kind dan scope setiap key identik dengan katalog', () => {
    for (const [key, kind, scope] of CATALOG) {
      const entry = VISIBILITY_BY_KEY[key as VisibilityKey];
      expect(entry.kind, `kind untuk ${key}`).toBe(kind);
      expect(entry.scope, `scope untuk ${key}`).toBe(scope);
    }
  });

  it('parent setiap key identik dengan katalog', () => {
    for (const [key, , , parent] of CATALOG) {
      const entry = VISIBILITY_BY_KEY[key as VisibilityKey];
      expect(entry.parent ?? null, `parent untuk ${key}`).toBe(parent);
    }
  });

  it('widest_audience setiap key identik dengan katalog', () => {
    for (const [key, , , , , widest] of CATALOG) {
      expect(WIDEST_AUDIENCE[key as keyof typeof WIDEST_AUDIENCE], `widest untuk ${key}`).toBe(
        widest,
      );
    }
  });

  it('urutan AUDIENCES sama dengan urutan enum Postgres (terluas ke tersempit)', () => {
    expect([...AUDIENCES]).toEqual([
      'public',
      'authenticated',
      'class_member',
      'class_admin',
      'self',
    ]);
  });
});

describe('narrower', () => {
  it('memilih yang lebih sempit', () => {
    expect(narrower('public', 'class_member')).toBe('class_member');
    expect(narrower('class_member', 'public')).toBe('class_member');
    expect(narrower('self', 'class_admin')).toBe('self');
  });

  it('mempertahankan nilai yang sama', () => {
    expect(narrower('public', 'public')).toBe('public');
  });
});

describe('allowedAudiences', () => {
  it('page.tasks tidak boleh lebih luas dari class_member (batas katalog)', () => {
    // E11: Ketua tidak boleh menyimpan page.tasks = public.
    expect(allowedAudiences('page.tasks')).not.toContain('public');
    expect(allowedAudiences('page.tasks')).toContain('class_member');
  });

  it('hanya key berscope member yang boleh memakai self', () => {
    for (const key of CLASS_SCOPE_KEYS) {
      expect(allowedAudiences(key), `key kelas ${key}`).not.toContain('self');
    }
    expect(allowedAudiences('field.member.bio')).toContain('self');
  });

  it('seluruh opsi yang diizinkan tidak lebih luas dari widest', () => {
    // AUDIENCES terurut terluas -> tersempit, jadi yang boleh dipilih hanya
    // audience dengan index >= index(widest) (lebih sempit atau sama).
    for (const key of VISIBILITY_KEYS) {
      const widest = WIDEST_AUDIENCE[key];
      for (const audience of allowedAudiences(key)) {
        expect(AUDIENCES.indexOf(audience)).toBeGreaterThanOrEqual(AUDIENCES.indexOf(widest));
      }
    }
  });
});

describe('AUDIENCE_LEVELS (opsi yang dirender UI)', () => {
  it('tepat tiga level, dari terluas ke tersempit', () => {
    expect([...AUDIENCE_LEVELS]).toEqual(['public', 'class_member', 'class_admin']);
  });

  it('setiap label menyebut tingkat aksesnya', () => {
    expect(AUDIENCE_LABEL.public).toBe('Publik — siapa pun');
    expect(AUDIENCE_LABEL.class_member).toBe('Anggota — semua yang login');
    expect(AUDIENCE_LABEL.class_admin).toBe('Ketua — hanya admin');
  });

  it('levelAllowed menolak level yang lebih luas dari widest katalog', () => {
    // E11: page.tasks tidak pernah boleh publik, jadi opsi Publik dinonaktifkan.
    expect(levelAllowed('page.tasks', 'public')).toBe(false);
    expect(levelAllowed('page.tasks', 'class_member')).toBe(true);
    expect(levelAllowed('page.home', 'public')).toBe(true);
    for (const key of VISIBILITY_KEYS) {
      expect(levelAllowed(key, toAudienceLevel(WIDEST_AUDIENCE[key])), `widest ${key}`).toBe(true);
    }
  });

  it('setiap key punya minimal dua level yang bisa dipilih', () => {
    for (const key of VISIBILITY_KEYS) {
      const usable = AUDIENCE_LEVELS.filter((level) => levelAllowed(key, level));
      expect(usable.length, `level untuk ${key}`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('toAudienceLevel', () => {
  it('nilai yang sudah berupa level tidak berubah', () => {
    for (const level of AUDIENCE_LEVELS) expect(toAudienceLevel(level)).toBe(level);
  });

  it('nilai lama dari enum penuh dipetakan ke level terdekat', () => {
    // authenticated lebih luas dari class_member, self lebih sempit dari class_admin.
    expect(toAudienceLevel('authenticated')).toBe('class_member');
    expect(toAudienceLevel('self')).toBe('class_admin');
  });
});

describe('pageCeiling', () => {
  it('field di bawah page mengembalikan page itu', () => {
    expect(pageCeiling('field.member.bio')).toBe('page.members');
    expect(pageCeiling('section.home.tasks')).toBe('page.home');
    expect(pageCeiling('item.portfolio')).toBe('page.members');
  });

  it('key tanpa ancestor page mengembalikan null', () => {
    // field.class.* sengaja tidak punya parent page, jadi tanpa ceiling.
    expect(pageCeiling('field.class.code')).toBeNull();
    expect(pageCeiling('page.home')).toBeNull();
  });
});

describe('pengelompokan UI', () => {
  it('setiap key masuk tepat satu grup', () => {
    for (const key of VISIBILITY_KEYS) {
      expect(VISIBILITY_BY_KEY[key].group, key).toBeTruthy();
    }
  });

  it('key yang bisa diatur tidak saling tumpang tindih dan tidak mencakup semua key', () => {
    // Item override lewat kolom `visibility` pada barisnya, bukan lewat tabel
    // aturan, jadi key `item` tidak masuk daftar yang bisa diatur.
    const union = new Set([...CLASS_SCOPE_KEYS, ...MEMBER_SCOPE_KEYS]);
    expect(union.size).toBe(CLASS_SCOPE_KEYS.length + MEMBER_SCOPE_KEYS.length);
    expect(union.size).toBeLessThan(VISIBILITY_KEYS.length);
  });

  it('class dan member mencakup seluruh key scope class dan member', () => {
    const expected = VISIBILITY_KEYS.filter((k) => VISIBILITY_BY_KEY[k].kind !== 'item');
    expect(new Set([...CLASS_SCOPE_KEYS, ...MEMBER_SCOPE_KEYS])).toEqual(new Set(expected));
  });

  it('groupKeys mengembalikan key yang diminta', () => {
    // Group mengikuti tempat pengaturan, bukan nama field: page.tasks ada di
    // grup Tugas, sedangkan section.home.tasks ikut grup Beranda.
    expect(groupKeys('Tugas')).toEqual(['page.tasks']);
    expect(groupKeys('Beranda')).toContain('section.home.tasks');
  });
});

describe('dataSource', () => {
  it('section Home yang mengambil data modul lain menunjuk page sumbernya', () => {
    expect(VISIBILITY_BY_KEY['section.home.schedule'].dataSource).toBe('page.schedule');
    expect(VISIBILITY_BY_KEY['section.home.events'].dataSource).toBe('page.events');
    expect(VISIBILITY_BY_KEY['section.home.tasks'].dataSource).toBe('page.tasks');
    expect(VISIBILITY_BY_KEY['section.home.members'].dataSource).toBe('page.members');
  });

  it('section identitas tidak punya dataSource karena memakai data kelas sendiri', () => {
    expect(VISIBILITY_BY_KEY['section.home.identity'].dataSource).toBeUndefined();
  });
});

// Menjaga tipe Audience tetap sinkron dengan daftar AUDIENCES.
const _audienceCheck: Audience = 'self';
void _audienceCheck;
