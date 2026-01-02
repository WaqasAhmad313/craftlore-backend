export type HeroLevel = "Hero I" | "Hero II" | "Hero III" | "Hero IV";

export type BadgeIcon =
  | "shield"
  | "award"
  | "heart"
  | "flag"
  | "globe"
  | "star";

export interface ClaimData {
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  hero_story: string;
  message_to_artisans: string | null;
  evidence_urls: string[];
  consent_public_listing: boolean;
  claimed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface BaseHero {
  id: string;
  report_id: string;
  tracking_id: string;
  craft_protected: string;
  case_summary: string;
  hero_level: HeroLevel;
  badge_icon: BadgeIcon;
  location: string | null;
  recognition_date: string;
  claim_data: ClaimData | null;
  is_claimed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertHeroParams {
  id?: string | null;
  report_id?: string | null;
  tracking_id?: string | null;
  craft_protected?: string | null;
  case_summary?: string | null;
  hero_level?: HeroLevel | null;
  badge_icon?: BadgeIcon | null;
  location?: string | null;
}

export interface UpsertHeroResult {
  success: true;
  message: string;
}

export interface GetHeroByIdParams {
  id: string;
}

export interface GetAllHeroesParams {
  is_claimed?: boolean | null;
  hero_level?: HeroLevel | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export interface DeleteHeroParams {
  id: string;
}
export interface DeleteHeroResult {
  success: true;
  message: string;
}
