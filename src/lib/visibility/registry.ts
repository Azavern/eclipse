// Registry visibilitas: satu-satunya tempat label dan metadata UI (§7.8).
//
// Kunci, kind, scope, dan parent WAJIB identik dengan tabel public.visibility_catalog.
// Tes paritas `tests/unit/visibility-parity.test.ts` gagal bila keduanya berbeda.

export const AUDIENCES = [
  'public',
  'authenticated',
  'class_member',
  'class_admin',
  'self',
] as const;

export type Audience = (typeof AUDIENCES)[number];

export type VisibilityKind = 'page' | 'section' | 'field' | 'item';
export type VisibilityScope = 'class' | 'member';

/** "Lebih sempit" = nilai enum lebih besar (§7.2). */
export const narrower = (a: Audience, b: Audience): Audience =>
  AUDIENCES.indexOf(a) >= AUDIENCES.indexOf(b) ? a : b;

export const AUDIENCE_LABEL: Record<Audience, string> = {
  public: 'Siapa saja (publik)',
  authenticated: 'Semua yang sudah masuk',
  class_member: 'Anggota kelas',
  class_admin: 'Pengelola kelas',
  self: 'Hanya saya',
};

/** Penjelasan singkat yang muncul di bawah select, bukan warna saja. */
export const AUDIENCE_HINT: Record<Audience, string> = {
  public: 'Dapat dilihat siapa saja, termasuk pengunjung yang belum masuk.',
  authenticated: 'Hanya bagi yang sudah masuk ke akunnya.',
  class_member: 'Hanya anggota kelas yang statusnya aktif.',
  class_admin: 'Hanya pengelola kelas dan pemilik datanya sendiri.',
  self: 'Hanya Anda sendiri. Pengelola kelas tidak dapat melihatnya.',
};

type Meta = {
  kind: VisibilityKind;
  scope: VisibilityScope;
  label: string;
  /** Kelompok untuk UI; GROUP_ORDER menentukan urutan tampil. */
  group: string;
  /**
   * Parent dideklarasikan sebagai `string` (bukan VisibilityKey) agar tipe
   * registry tidak sirkular. Kebenarannya dijaga tes paritas terhadap
   * visibility_catalog di DB, bukan oleh sistem tipe.
   */
  parent?: string;
  /**
   * Key page yang menjadi sumber data section ini. Section Home yang
   * menampilkan data modul lain hanya dirender bila section DAN page
   * sumbernya terlihat, agar tidak pernah menampilkan section kosong yang
   * menyesatkan (§7.5).
   */
  dataSource?: string;
};

export const VISIBILITY = {
  'page.home': { kind: 'page', scope: 'class', label: 'Beranda', group: 'Beranda' },
  'section.home.identity': {
    kind: 'section',
    scope: 'class',
    label: 'Identitas kelas',
    group: 'Beranda',
    parent: 'page.home',
  },
  'section.home.schedule': {
    kind: 'section',
    scope: 'class',
    label: 'Jadwal terdekat',
    group: 'Beranda',
    parent: 'page.home',
    dataSource: 'page.schedule',
  },
  'section.home.tasks': {
    kind: 'section',
    scope: 'class',
    label: 'Tugas terdekat',
    group: 'Beranda',
    parent: 'page.home',
    dataSource: 'page.tasks',
  },
  'section.home.events': {
    kind: 'section',
    scope: 'class',
    label: 'Event mendatang',
    group: 'Beranda',
    parent: 'page.home',
    dataSource: 'page.events',
  },
  'section.home.overview': {
    kind: 'section',
    scope: 'class',
    label: 'Ringkasan angka',
    group: 'Beranda',
    parent: 'page.home',
  },
  'section.home.activity': {
    kind: 'section',
    scope: 'class',
    label: 'Tren aktivitas',
    group: 'Beranda',
    parent: 'page.home',
  },
  'section.home.members': {
    kind: 'section',
    scope: 'class',
    label: 'Anggota terbaru',
    group: 'Beranda',
    parent: 'page.home',
    dataSource: 'page.members',
  },

  'page.class_about': { kind: 'page', scope: 'class', label: 'Halaman kelas', group: 'Kelas' },
  'section.class.links': {
    kind: 'section',
    scope: 'class',
    label: 'Tautan kelas',
    group: 'Kelas',
    parent: 'page.class_about',
  },
  'field.class.code': { kind: 'field', scope: 'class', label: 'Kode kelas', group: 'Kelas' },
  'field.class.tagline': { kind: 'field', scope: 'class', label: 'Tagline', group: 'Kelas' },
  'field.class.description': {
    kind: 'field',
    scope: 'class',
    label: 'Deskripsi',
    group: 'Kelas',
  },
  'field.class.highlight': {
    kind: 'field',
    scope: 'class',
    label: 'Sorotan',
    group: 'Kelas',
  },
  'field.class.logo': { kind: 'field', scope: 'class', label: 'Logo', group: 'Kelas' },
  'field.class.cover': { kind: 'field', scope: 'class', label: 'Cover', group: 'Kelas' },

  'page.schedule': { kind: 'page', scope: 'class', label: 'Jadwal', group: 'Jadwal' },
  'page.events': { kind: 'page', scope: 'class', label: 'Event', group: 'Event' },
  'page.tasks': { kind: 'page', scope: 'class', label: 'Tugas', group: 'Tugas' },

  'page.members': { kind: 'page', scope: 'class', label: 'Anggota', group: 'Anggota' },
  'field.member.avatar': {
    kind: 'field',
    scope: 'member',
    label: 'Foto profil',
    group: 'Profil saya',
    parent: 'page.members',
  },
  'field.member.nickname': {
    kind: 'field',
    scope: 'member',
    label: 'Nama panggilan',
    group: 'Profil saya',
    parent: 'page.members',
  },
  'field.member.bio': {
    kind: 'field',
    scope: 'member',
    label: 'Bio',
    group: 'Profil saya',
    parent: 'page.members',
  },
  'section.member.portfolio': {
    kind: 'section',
    scope: 'member',
    label: 'Portofolio',
    group: 'Profil saya',
    parent: 'page.members',
  },
  'item.portfolio': {
    kind: 'item',
    scope: 'member',
    label: 'Item portofolio',
    group: 'Profil saya',
    parent: 'section.member.portfolio',
  },
  'section.member.social': {
    kind: 'section',
    scope: 'member',
    label: 'Tautan sosial',
    group: 'Profil saya',
    parent: 'page.members',
  },
  'item.social_link': {
    kind: 'item',
    scope: 'member',
    label: 'Item tautan sosial',
    group: 'Profil saya',
    parent: 'section.member.social',
  },
} satisfies Record<string, Meta>;

export type VisibilityKey = keyof typeof VISIBILITY;

export const VISIBILITY_KEYS = Object.keys(VISIBILITY) as VisibilityKey[];

/**
 * Katalog dalam bentuk ternormalisasi. Bentuk ini dipakai server-side agar
 * akses `parent`/`dataSource` tidak perlu narrowing berulang di mana-mana.
 */
export const VISIBILITY_BY_KEY: Record<VisibilityKey, Meta> = VISIBILITY;

/**
 * Key yang bisa diatur oleh Ketua di /settings/visibility (scope class).
 *
 * Key `item` dikecualikan: override per item lewat kolom `visibility` pada baris
 * itemnya, bukan lewat tabel aturan (§7.3).
 */
export const CLASS_SCOPE_KEYS: VisibilityKey[] = VISIBILITY_KEYS.filter(
  (k) => VISIBILITY_BY_KEY[k].scope === 'class' && VISIBILITY_BY_KEY[k].kind !== 'item',
);

/** Key yang bisa diatur oleh anggota di /settings/profile (scope member). */
export const MEMBER_SCOPE_KEYS: VisibilityKey[] = VISIBILITY_KEYS.filter(
  (k) => VISIBILITY_BY_KEY[k].scope === 'member' && VISIBILITY_BY_KEY[k].kind !== 'item',
);

/** Urutan grup di halaman pengaturan; tidak alphabetical agar mengikuti alur belajar. */
export const GROUP_ORDER = [
  'Beranda',
  'Kelas',
  'Jadwal',
  'Event',
  'Tugas',
  'Anggota',
  'Profil saya',
] as const;

export function groupKeys(group: string): VisibilityKey[] {
  return VISIBILITY_KEYS.filter((k) => VISIBILITY_BY_KEY[k].group === group);
}

/**
 * Opsi audience yang boleh dipilih untuk sebuah key.
 * - Dibatasi `widest_audience` (katalog, diberikan lewat peta di bawah).
 * - `self` hanya bermakna untuk key berscope member (§7.2).
 */
export const WIDEST_AUDIENCE: Record<VisibilityKey, Audience> = {
  'page.home': 'public',
  'section.home.identity': 'public',
  'section.home.schedule': 'public',
  'section.home.tasks': 'class_member',
  'section.home.events': 'public',
  'section.home.overview': 'public',
  'section.home.activity': 'public',
  'section.home.members': 'public',
  'page.class_about': 'public',
  'section.class.links': 'public',
  'field.class.code': 'public',
  'field.class.tagline': 'public',
  'field.class.description': 'public',
  'field.class.highlight': 'public',
  'field.class.logo': 'public',
  'field.class.cover': 'public',
  'page.schedule': 'public',
  'page.events': 'public',
  'page.tasks': 'class_member',
  'page.members': 'public',
  'field.member.avatar': 'public',
  'field.member.nickname': 'public',
  'field.member.bio': 'public',
  'section.member.portfolio': 'public',
  'item.portfolio': 'public',
  'section.member.social': 'public',
  'item.social_link': 'public',
};

export function allowedAudiences(key: VisibilityKey): Audience[] {
  const widest = WIDEST_AUDIENCE[key];
  const scope = VISIBILITY_BY_KEY[key].scope;
  return AUDIENCES.filter((a) => {
    // AUDIENCES terurut dari terluas ke tersempit, jadi "lebih luas" berarti
    // index lebih kecil. Yang boleh dipilih hanya audience yang setidaknya
    // seketat batas terluas katalog (E11).
    if (AUDIENCES.indexOf(a) < AUDIENCES.indexOf(widest)) return false;
    // `self` tidak valid pada key berscope class (tidak ada pemilik).
    if (a === 'self' && scope !== 'member') return false;
    return true;
  });
}

/** Key page yang menjadi "langit-langit" sebuah key, untuk catatan UI. */
export function pageCeiling(key: VisibilityKey): VisibilityKey | null {
  let current = VISIBILITY_BY_KEY[key].parent as VisibilityKey | undefined;
  let depth = 0;
  while (current && depth < 6) {
    if (VISIBILITY_BY_KEY[current].kind === 'page') return current;
    current = VISIBILITY_BY_KEY[current].parent as VisibilityKey | undefined;
    depth += 1;
  }
  return null;
}

/**
 * Nilai select yang berarti "pakai bawaan katalog" — bukan audience tertentu.
 * Server Action menerjemahkannya jadi `audience: null`, yaitu penghapusan
 * override. Satu konstanta supaya klien dan server tidak memakai string kosong
 * yang berbeda makna.
 */
export const ALLOW_DEFAULT = '';

/**
 * Bentuk satu baris peta visibilitas, sesuai yang dikembalikan
 * `get_visibility_map`. Tipe ini diletakkan di modul yang aman dipakai klien
 * supaya editor visibilitas bisa menghitung penjelasan tanpa menyentuh
 * modul server-only.
 */
export type VisibilityEntry = {
  own: Audience;
  effective: Audience;
  allowed: boolean;
};

function labelFor(audience: Audience): string {
  return {
    public: 'siapa saja',
    authenticated: 'yang sudah masuk',
    class_member: 'anggota kelas',
    class_admin: 'pengelola kelas',
    self: 'pemiliknya sendiri',
  }[audience];
}

/**
 * Penjelasan singkat bila pilihan pengguna lebih luas dari yang benar-benar
 * berlaku, mis. "Dibatasi halaman Anggota: hanya anggota kelas" (§7.8).
 *
 * Fungsi murni: hanya membaca peta yang diberikan, jadi aman dipanggil dari
 * komponen klien saat pilihan berubah.
 */
export function ceilingNote(
  key: VisibilityKey,
  choice: Audience,
  map: Record<VisibilityKey, VisibilityEntry>,
): string | null {
  const ceiling = pageCeiling(key);
  if (!ceiling) return null;

  const pageValue = map[ceiling]?.effective;
  if (!pageValue) return null;

  const effective = narrower(narrower(choice, WIDEST_AUDIENCE[key]), pageValue);
  if (effective === choice) return null;
  return `Dibatasi halaman ${VISIBILITY_BY_KEY[ceiling].label}: hanya ${labelFor(effective)}.`;
}
