// Tipe database untuk Supabase.
//
// CATATAN PENTING: file ini SEHARUSNYA hasil `supabase gen types typescript`.
// Di lingkungan ini CLI tidak dapat menjangkau proyek (butuh access token /
// Docker), sehingga file ini ditulis manual dari migration 0001-0002 dan harus
// di-regenerate sebelum deploy:
//     pnpm db:types
// Lihat docs/STATUS.md.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type VisibilityAudience = 'public' | 'authenticated' | 'class_member' | 'class_admin' | 'self';
export type VisibilityScope = 'class' | 'member';
export type VisibilityKind = 'page' | 'section' | 'field' | 'item';
export type MembershipStatus = 'invited' | 'active' | 'inactive';
export type TaskStatus = 'active' | 'completed' | 'archived';
export type ScheduleType = 'class' | 'activity';
export type SocialPlatform =
  | 'instagram'
  | 'linkedin'
  | 'github'
  | 'tiktok'
  | 'x'
  | 'website'
  | 'custom';
export type PortfolioKind =
  | 'project'
  | 'achievement'
  | 'organization'
  | 'competition'
  | 'creative_work'
  | 'certificate'
  | 'experience';

export type Theme = {
  layout: 'standard' | 'profile_focused';
  font_preset: 'editorial' | 'grotesk' | 'rounded';
  palette: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    border: string;
    text_primary: string;
    text_secondary: string;
    success: string;
    warning: string;
    error: string;
  };
};

export type ClassRow = {
  id: string;
  name: string;
  code: string | null;
  tagline: string | null;
  description: string | null;
  highlight_text: string | null;
  highlight_url: string | null;
  logo_path: string | null;
  cover_path: string | null;
  timezone: string;
  theme: Theme;
  created_at: string;
  updated_at: string;
}

export type ClassIdentity = {
  id: string;
  name: string;
  theme: Theme;
  timezone: string;
  code: string | null;
  tagline: string | null;
  description: string | null;
  highlight_text: string | null;
  highlight_url: string | null;
  logo_path: string | null;
  cover_path: string | null;
}

export type RoleRow = {
  id: string;
  class_id: string;
  key: string;
  name: string;
  permissions: string[];
  created_at: string;
}

export type MembershipRow = {
  id: string;
  class_id: string;
  user_id: string;
  role_id: string;
  status: MembershipStatus;
  joined_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MemberProfile = {
  class_id: string;
  user_id: string;
  username: string;
  full_name: string;
  nickname: string | null;
  bio: string | null;
  avatar_path: string | null;
  role_id: string;
  role_name: string;
  status: MembershipStatus;
  joined_at: string | null;
}

export type PortfolioItem = {
  id: string;
  class_id: string;
  user_id: string;
  kind: PortfolioKind;
  title: string;
  description: string | null;
  occurred_on: string;
  url: string | null;
  media_path: string | null;
  visibility: VisibilityAudience | null;
  created_at: string;
  updated_at: string;
}

export type SocialLink = {
  id: string;
  class_id: string;
  user_id: string;
  platform: SocialPlatform;
  label: string | null;
  url: string;
  visibility: VisibilityAudience | null;
  created_at: string;
  updated_at: string;
}

export type ClassLink = {
  id: string;
  class_id: string;
  platform: SocialPlatform;
  label: string | null;
  url: string;
  created_at: string;
};

/**
 * Bentuk hasil `select()` yang dipilih sebagian kolom. Tipe tabel penuh tidak
 * cocok dengan hasil select, jadi lapisan query mendeklarasikan bentuk yang
 * benar-benar dipilih.
 */
export type ClassLinkSummary = Pick<ClassLink, 'id' | 'class_id' | 'platform' | 'label' | 'url'>;

export type MemberProfileSummary = Pick<
  MemberProfile,
  | 'class_id'
  | 'user_id'
  | 'username'
  | 'full_name'
  | 'nickname'
  | 'bio'
  | 'avatar_path'
  | 'role_id'
  | 'role_name'
  | 'status'
  | 'joined_at'
>;

export type ScheduleSummary = Pick<Schedule, 'id' | 'title' | 'start_at' | 'end_at' | 'location' | 'type'>;
export type EventSummary = Pick<Event, 'id' | 'title' | 'start_at' | 'end_at' | 'location'>;
export type TaskSummary = Pick<Task, 'id' | 'title' | 'deadline' | 'target'>;

export type Schedule = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  type: ScheduleType;
  url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type Event = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  organizer: string | null;
  cover_path: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type Task = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  deadline: string;
  target: string;
  url: string | null;
  status: TaskStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type VisibilityCatalogRow = {
  key: string;
  kind: VisibilityKind;
  scope: VisibilityScope;
  parent_key: string | null;
  default_audience: VisibilityAudience | null;
  widest_audience: VisibilityAudience;
}

export type VisibilityRule = {
  id: string;
  class_id: string;
  key: string;
  owner_id: string | null;
  audience: VisibilityAudience;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ViewerContext = {
  class_id: string | null;
  user_id: string | null;
  status: MembershipStatus | null;
  role_name: string | null;
  permissions: string[];
}

export type VisibilityMapRow = {
  key: string;
  kind: VisibilityKind;
  scope: VisibilityScope;
  own_audience: VisibilityAudience;
  effective_audience: VisibilityAudience;
  allowed: boolean;
}

export type HomeOverview = {
  members_count: number | null;
  upcoming_events_count: number | null;
  active_tasks_count: number | null;
  due_soon_tasks_count: number | null;
}

export type ActivityTrendRow = {
  week_start: string;
  activity_count: number;
}

/**
 * Bentuk generik yang dibutuhkan createServerClient<Database>().
 *
 * `Functions[].Returns` memakai bentuk hasil `supabase gen types`: fungsi yang
 * mengembalikan TABLE ditulis sebagai array baris, sedangkan fungsi void
 * memakai `undefined`. postgrest-js menurunkan `Row` dari elemen array tersebut.
 */
export type Database = {
  public: {
    Tables: {
      classes: {
        Row: ClassRow;
        Insert: Partial<ClassRow> & { name: string; theme: Theme };
        Update: Partial<ClassRow>;
        Relationships: [];
      };
      roles: {
        Row: RoleRow;
        Insert: Partial<RoleRow>;
        Update: Partial<RoleRow>;
        Relationships: [];
      };
      memberships: {
        Row: MembershipRow;
        Insert: Partial<MembershipRow>;
        Update: Partial<MembershipRow>;
        Relationships: [];
      };
      member_profiles: {
        Row: Omit<MemberProfile, 'role_id' | 'role_name' | 'status' | 'joined_at'>;
        Insert: Partial<MemberProfile>;
        Update: Partial<MemberProfile>;
        Relationships: [];
      };
      portfolio_items: {
        Row: PortfolioItem;
        Insert: Partial<PortfolioItem>;
        Update: Partial<PortfolioItem>;
        Relationships: [];
      };
      social_links: {
        Row: SocialLink;
        Insert: Partial<SocialLink>;
        Update: Partial<SocialLink>;
        Relationships: [];
      };
      class_links: {
        Row: ClassLink;
        Insert: Partial<ClassLink>;
        Update: Partial<ClassLink>;
        Relationships: [];
      };
      schedules: {
        Row: Schedule;
        Insert: Partial<Schedule>;
        Update: Partial<Schedule>;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: Partial<Event>;
        Update: Partial<Event>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task>;
        Update: Partial<Task>;
        Relationships: [];
      };
      visibility_catalog: {
        Row: VisibilityCatalogRow;
        Insert: Partial<VisibilityCatalogRow>;
        // Katalog hanya berubah lewat migration; tidak ada kolom yang di-update
        // dari aplikasi. `Update` tetap harus Record, bukan never, karena
        // GenericSchema postgrest-js mensyaratkannya dan `never` membuat
        // seluruh tipe Database gagal diturunkan menjadi `never`.
        Update: Partial<VisibilityCatalogRow>;
        Relationships: [];
      };
      visibility_rules: {
        Row: VisibilityRule;
        Insert: Partial<VisibilityRule>;
        Update: Partial<VisibilityRule>;
        Relationships: [];
      };
    };
    Views: {
      class_identity_v: { Row: ClassIdentity; Relationships: [] };
      member_profile_v: { Row: MemberProfile; Relationships: [] };
    };
    Functions: {
      get_viewer_context: { Args: Record<PropertyKey, never>; Returns: ViewerContext[] };
      get_visibility_map: { Args: Record<PropertyKey, never>; Returns: VisibilityMapRow[] };
      get_home_overview: { Args: { p_due_soon_hours?: number }; Returns: HomeOverview[] };
      get_activity_trend: { Args: { p_weeks?: number }; Returns: ActivityTrendRow[] };
      provision_member: {
        Args: { p_user_id: string; p_full_name: string; p_username: string; p_role_id: string };
        Returns: undefined;
      };
      update_member_identity: {
        Args: { p_user_id: string; p_full_name: string; p_username: string };
        Returns: undefined;
      };
      activate_my_membership: { Args: Record<string, never>; Returns: undefined };
      save_class_visibility: { Args: { p_rules: Json }; Returns: undefined };
      save_my_visibility: { Args: { p_rules: Json }; Returns: undefined };
    };
    Enums: {
      visibility_audience: VisibilityAudience;
      visibility_scope: VisibilityScope;
      visibility_kind: VisibilityKind;
      membership_status: MembershipStatus;
      task_status: TaskStatus;
      schedule_type: ScheduleType;
      social_platform: SocialPlatform;
      portfolio_kind: PortfolioKind;
    };
    CompositeTypes: Record<string, never>;
  };
}
