// =====================================================
// GLOBAL THEME TYPES
// =====================================================

export interface ThemeColors {
  primary: Record<string, string>;
  secondary: Record<string, string>;
  accent: Record<string, string>;
  neutral: Record<string, string>;
  success: { light: string; DEFAULT: string; dark: string };
  warning: { light: string; DEFAULT: string; dark: string };
  error: { light: string; DEFAULT: string; dark: string };
  info: { light: string; DEFAULT: string; dark: string };
}

export interface ThemeTypography {
  fontFamily: { sans: string; serif: string; mono: string; display: string };
  fontSize: Record<string, { size: string; lineHeight: string }>;
  fontWeight: Record<string, string>;
  letterSpacing: Record<string, string>;
  lineHeight: Record<string, string>;
}

export interface ThemeSpacing {
  [key: string]: string;
}

export interface GlobalTheme {
  id: string;
  theme_name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateThemeInput {
  theme_name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing?: ThemeSpacing;
  is_active: boolean;
}

export interface UpdateThemeInput {
  id: string;
  theme_name?: string;
  colors?: ThemeColors;
  typography?: ThemeTypography;
  spacing?: ThemeSpacing | null;
  is_active?: boolean;
}

// =====================================================
// PAGE CONTENT TYPES
// =====================================================

export interface PageContent {
  id: string;
  page_slug: string;
  section_key: string;
  content: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePageContentInput {
  page_slug: string;
  section_key: string;
  content: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
}

export interface UpdatePageContentInput {
  id: string;
  page_slug?: string;
  section_key?: string;
  content?: Record<string, unknown>;
  display_order?: number;
  is_active?: boolean;
}

// =====================================================
// PAGE META TYPES
// =====================================================

export type OGType = 'website' | 'article' | 'profile' | 'video' | 'book';
export type TwitterCard = 'summary' | 'summary_large_image' | 'app' | 'player';
export type RobotsDirective = 'index,follow' | 'index,nofollow' | 'noindex,follow' | 'noindex,nofollow';

export interface PageMeta {
  id: string;
  page_slug: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_type: OGType;
  twitter_card: TwitterCard;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  canonical_url: string | null;
  robots: RobotsDirective;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePageMetaInput {
  page_slug: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  og_type?: OGType;
  twitter_card?: TwitterCard;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  canonical_url?: string | null;
  robots?: RobotsDirective;
  is_active?: boolean;
}

export interface UpdatePageMetaInput {
  id: string;
  page_slug?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  og_type?: OGType;
  twitter_card?: TwitterCard;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image?: string | null;
  canonical_url?: string | null;
  robots?: RobotsDirective;
  is_active?: boolean;
}

// =====================================================
// TEAM MEMBER TYPES
// =====================================================

export interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  bio: string | null;
  profile_image_url: string | null;
  linkedin_url: string | null;
  email: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamMemberInput {
  full_name: string;
  role: string;
  bio?: string | null;
  profile_image_url?: string | null;
  linkedin_url?: string | null;
  email?: string | null;
  display_order: number;
  is_active: boolean;
}

export interface UpdateTeamMemberInput {
  id: string;
  full_name?: string;
  role?: string;
  bio?: string | null;
  profile_image_url?: string | null;
  linkedin_url?: string | null;
  email?: string | null;
  display_order?: number;
  is_active?: boolean;
}

// =====================================================
// QUERY FILTER TYPES
// =====================================================

export interface PageContentFilters {
  page_slug?: string;
  is_active?: boolean;
}

// =====================================================
// MULTER FILE TYPE
// =====================================================

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;