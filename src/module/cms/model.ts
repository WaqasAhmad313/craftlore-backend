import { db } from '../../config/db.ts';
import type {
  GlobalTheme,
  CreateThemeInput,
  UpdateThemeInput,
  PageContent,
  CreatePageContentInput,
  UpdatePageContentInput,
  PageContentFilters,
  PageMeta,
  CreatePageMetaInput,
  UpdatePageMetaInput,
  TeamMember,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
} from './types.ts';

// =====================================================
// GLOBAL THEME MODEL
// =====================================================

export class ThemeModel {
  /**
   * Get active theme (for frontend)
   */
  static async getActive(): Promise<GlobalTheme | null> {
    const query = `SELECT * FROM content.global_theme WHERE is_active = true LIMIT 1`;
    const result = await db.query<GlobalTheme>(query);
    return result.rows[0] || null;
  }

  /**
   * Get all themes (for admin)
   */
  static async getAll(): Promise<GlobalTheme[]> {
    const query = `SELECT * FROM content.global_theme ORDER BY created_at DESC`;
    const result = await db.query<GlobalTheme>(query);
    return result.rows;
  }

  /**
   * Get theme by ID
   */
  static async getById(id: string): Promise<GlobalTheme | null> {
    const query = `SELECT * FROM content.global_theme WHERE id = $1`;
    const result = await db.query<GlobalTheme>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Check if theme name exists
   */
  static async existsByName(themeName: string, excludeId?: string): Promise<boolean> {
    let query = `SELECT EXISTS(SELECT 1 FROM content.global_theme WHERE theme_name = $1`;
    const values: string[] = [themeName];

    if (excludeId) {
      query += ` AND id != $2`;
      values.push(excludeId);
    }

    query += `) as exists`;

    const result = await db.query<{ exists: boolean }>(query, values);
    return result.rows[0]?.exists || false;
  }

  /**
   * Create theme
   */
  static async create(input: CreateThemeInput): Promise<GlobalTheme> {
    const query = `
      INSERT INTO content.global_theme (theme_name, colors, typography, spacing, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      input.theme_name,
      JSON.stringify(input.colors),
      JSON.stringify(input.typography),
      input.spacing ? JSON.stringify(input.spacing) : null,
      input.is_active,
    ];

    const result = await db.query<GlobalTheme>(query, values);

    if (!result.rows[0]) {
      throw new Error('Failed to create theme');
    }

    return result.rows[0];
  }

  /**
   * Update theme
   */
  static async update(input: UpdateThemeInput): Promise<GlobalTheme> {
    const current = await this.getById(input.id);

    if (!current) {
      throw new Error('Theme not found');
    }

    const query = `
      UPDATE content.global_theme
      SET theme_name = $1, colors = $2, typography = $3, spacing = $4, is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const values = [
      input.theme_name ?? current.theme_name,
      input.colors ? JSON.stringify(input.colors) : JSON.stringify(current.colors),
      input.typography ? JSON.stringify(input.typography) : JSON.stringify(current.typography),
      input.spacing !== undefined ? (input.spacing ? JSON.stringify(input.spacing) : null) : (current.spacing ? JSON.stringify(current.spacing) : null),
      input.is_active ?? current.is_active,
      input.id,
    ];

    const result = await db.query<GlobalTheme>(query, values);

    if (!result.rows[0]) {
      throw new Error('Failed to update theme');
    }

    return result.rows[0];
  }

  /**
   * Delete theme
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM content.global_theme WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }

  /**
   * Activate theme (trigger auto-deactivates others)
   */
  static async activate(id: string): Promise<GlobalTheme> {
    const query = `
      UPDATE content.global_theme
      SET is_active = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query<GlobalTheme>(query, [id]);

    if (!result.rows[0]) {
      throw new Error('Theme not found');
    }

    return result.rows[0];
  }
}

// =====================================================
// PAGE CONTENT MODEL
// =====================================================

export class PageContentModel {
  /**
   * Get all page content with filters
   */
  static async getAll(filters?: PageContentFilters): Promise<PageContent[]> {
    const conditions: string[] = [];
    const values: (string | boolean)[] = [];
    let paramCount = 1;

    if (filters?.page_slug) {
      conditions.push(`page_slug = $${paramCount}`);
      values.push(filters.page_slug);
      paramCount++;
    }

    if (filters?.is_active !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      values.push(filters.is_active);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM content.page_content
      ${whereClause}
      ORDER BY page_slug, display_order ASC
    `;

    const result = await db.query<PageContent>(query, values);
    return result.rows;
  }

  /**
   * Get content by page slug (active only, for frontend)
   */
  static async getByPageSlug(pageSlug: string): Promise<PageContent[]> {
    const query = `
      SELECT * FROM content.page_content
      WHERE page_slug = $1 AND is_active = true
      ORDER BY display_order ASC
    `;

    const result = await db.query<PageContent>(query, [pageSlug]);
    return result.rows;
  }

  /**
   * Get content by ID
   */
  static async getById(id: string): Promise<PageContent | null> {
    const query = `SELECT * FROM content.page_content WHERE id = $1`;
    const result = await db.query<PageContent>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Check if page+section combo exists
   */
  static async existsByPageAndSection(
    pageSlug: string,
    sectionKey: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = `SELECT EXISTS(SELECT 1 FROM content.page_content WHERE page_slug = $1 AND section_key = $2`;
    const values: string[] = [pageSlug, sectionKey];

    if (excludeId) {
      query += ` AND id != $3`;
      values.push(excludeId);
    }

    query += `) as exists`;

    const result = await db.query<{ exists: boolean }>(query, values);
    return result.rows[0]?.exists || false;
  }

  /**
   * Create page content
   */
  static async create(input: CreatePageContentInput): Promise<PageContent> {
    const query = `
      INSERT INTO content.page_content (page_slug, section_key, content, display_order, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      input.page_slug,
      input.section_key,
      JSON.stringify(input.content),
      input.display_order,
      input.is_active,
    ];

    const result = await db.query<PageContent>(query, values);

    if (!result.rows[0]) {
      throw new Error('Failed to create page content');
    }

    return result.rows[0];
  }

  /**
   * Update page content
   */
  static async update(input: UpdatePageContentInput): Promise<PageContent> {
    const current = await this.getById(input.id);

    if (!current) {
      throw new Error('Page content not found');
    }

    const query = `
      UPDATE content.page_content
      SET page_slug = $1, section_key = $2, content = $3, display_order = $4, is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const values = [
      input.page_slug ?? current.page_slug,
      input.section_key ?? current.section_key,
      input.content ? JSON.stringify(input.content) : JSON.stringify(current.content),
      input.display_order ?? current.display_order,
      input.is_active ?? current.is_active,
      input.id,
    ];

    const result = await db.query<PageContent>(query, values);

    if (!result.rows[0]) {
      throw new Error('Failed to update page content');
    }

    return result.rows[0];
  }

  /**
   * Delete page content
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM content.page_content WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }

  /**
   * Toggle active status
   */
  static async toggleActive(id: string): Promise<PageContent> {
    const query = `
      UPDATE content.page_content
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query<PageContent>(query, [id]);

    if (!result.rows[0]) {
      throw new Error('Page content not found');
    }

    return result.rows[0];
  }
}

// =====================================================
// PAGE META MODEL
// =====================================================

export class PageMetaModel {
  /**
   * Get all page meta
   */
  static async getAll(): Promise<PageMeta[]> {
    const query = `SELECT * FROM content.page_meta ORDER BY page_slug ASC`;
    const result = await db.query<PageMeta>(query);
    return result.rows;
  }

  /**
   * Get page meta by page slug (for frontend)
   */
  static async getByPageSlug(pageSlug: string): Promise<PageMeta | null> {
    const query = `SELECT * FROM content.page_meta WHERE page_slug = $1 AND is_active = true`;
    const result = await db.query<PageMeta>(query, [pageSlug]);
    return result.rows[0] || null;
  }

  /**
   * Get page meta by ID
   */
  static async getById(id: string): Promise<PageMeta | null> {
    const query = `SELECT * FROM content.page_meta WHERE id = $1`;
    const result = await db.query<PageMeta>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Check if page slug exists
   */
  static async existsByPageSlug(pageSlug: string, excludeId?: string): Promise<boolean> {
    let query = `SELECT EXISTS(SELECT 1 FROM content.page_meta WHERE page_slug = $1`;
    const values: string[] = [pageSlug];

    if (excludeId) {
      query += ` AND id != $2`;
      values.push(excludeId);
    }

    query += `) as exists`;

    const result = await db.query<{ exists: boolean }>(query, values);
    return result.rows[0]?.exists || false;
  }

  /**
   * Create page meta
   */
  static async create(input: CreatePageMetaInput): Promise<PageMeta> {
    const query = `
      INSERT INTO content.page_meta (
        page_slug, meta_title, meta_description, meta_keywords,
        og_title, og_description, og_image, og_type,
        twitter_card, twitter_title, twitter_description, twitter_image,
        canonical_url, robots, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      input.page_slug,
      input.meta_title ?? null,
      input.meta_description ?? null,
      input.meta_keywords ?? null,
      input.og_title ?? null,
      input.og_description ?? null,
      input.og_image ?? null,
      input.og_type ?? 'website',
      input.twitter_card ?? 'summary_large_image',
      input.twitter_title ?? null,
      input.twitter_description ?? null,
      input.twitter_image ?? null,
      input.canonical_url ?? null,
      input.robots ?? 'index,follow',
      input.is_active ?? true,
    ];

    const result = await db.query<PageMeta>(query, values);

    if (!result.rows[0]) {
      throw new Error('Failed to create page meta');
    }

    return result.rows[0];
  }

  /**
   * Update page meta
   */
  static async update(input: UpdatePageMetaInput): Promise<PageMeta> {
    const current = await this.getById(input.id);

    if (!current) {
      throw new Error('Page meta not found');
    }

    const query = `
      UPDATE content.page_meta
      SET page_slug = $1, meta_title = $2, meta_description = $3, meta_keywords = $4,
          og_title = $5, og_description = $6, og_image = $7, og_type = $8,
          twitter_card = $9, twitter_title = $10, twitter_description = $11, twitter_image = $12,
          canonical_url = $13, robots = $14, is_active = $15, updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `;

    const values = [
      input.page_slug ?? current.page_slug,
      input.meta_title !== undefined ? input.meta_title : current.meta_title,
      input.meta_description !== undefined ? input.meta_description : current.meta_description,
      input.meta_keywords !== undefined ? input.meta_keywords : current.meta_keywords,
      input.og_title !== undefined ? input.og_title : current.og_title,
      input.og_description !== undefined ? input.og_description : current.og_description,
      input.og_image !== undefined ? input.og_image : current.og_image,
      input.og_type ?? current.og_type,
      input.twitter_card ?? current.twitter_card,
      input.twitter_title !== undefined ? input.twitter_title : current.twitter_title,
      input.twitter_description !== undefined ? input.twitter_description : current.twitter_description,
      input.twitter_image !== undefined ? input.twitter_image : current.twitter_image,
      input.canonical_url !== undefined ? input.canonical_url : current.canonical_url,
      input.robots ?? current.robots,
      input.is_active ?? current.is_active,
      input.id,
    ];

    const result = await db.query<PageMeta>(query, values);

    if (!result.rows[0]) {
      throw new Error('Failed to update page meta');
    }

    return result.rows[0];
  }

  /**
   * Delete page meta
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM content.page_meta WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }
}

// =====================================================
// TEAM MEMBER MODEL
// =====================================================

export class TeamMemberModel {
  /**
   * Get all team members
   */
  static async getAll(): Promise<TeamMember[]> {
    const query = `SELECT * FROM content.team_members ORDER BY display_order ASC`;
    const result = await db.query<TeamMember>(query);
    return result.rows;
  }

  /**
   * Get active team members only (for frontend)
   */
  static async getActive(): Promise<TeamMember[]> {
    const query = `SELECT * FROM content.team_members WHERE is_active = true ORDER BY display_order ASC`;
    const result = await db.query<TeamMember>(query);
    return result.rows;
  }

  /**
   * Get team member by ID
   */
  static async getById(id: string): Promise<TeamMember | null> {
    const query = `SELECT * FROM content.team_members WHERE id = $1`;
    const result = await db.query<TeamMember>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create team member
   */
  static async create(input: CreateTeamMemberInput): Promise<TeamMember> {
    const query = `
      INSERT INTO content.team_members (
        full_name, role, bio, profile_image_url, linkedin_url, email, display_order, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      input.full_name,
      input.role,
      input.bio ?? null,
      input.profile_image_url ?? null,
      input.linkedin_url ?? null,
      input.email ?? null,
      input.display_order,
      input.is_active,
    ];

    const result = await db.query<TeamMember>(query, values);

    if (!result.rows[0]) {
      throw new Error('Failed to create team member');
    }

    return result.rows[0];
  }

  /**
   * Update team member
   */
  static async update(input: UpdateTeamMemberInput): Promise<TeamMember> {
    const current = await this.getById(input.id);

    if (!current) {
      throw new Error('Team member not found');
    }

    const query = `
      UPDATE content.team_members
      SET full_name = $1, role = $2, bio = $3, profile_image_url = $4,
          linkedin_url = $5, email = $6, display_order = $7, is_active = $8, updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `;

    const values = [
      input.full_name ?? current.full_name,
      input.role ?? current.role,
      input.bio !== undefined ? input.bio : current.bio,
      input.profile_image_url !== undefined ? input.profile_image_url : current.profile_image_url,
      input.linkedin_url !== undefined ? input.linkedin_url : current.linkedin_url,
      input.email !== undefined ? input.email : current.email,
      input.display_order ?? current.display_order,
      input.is_active ?? current.is_active,
      input.id,
    ];

    const result = await db.query<TeamMember>(query, values);

    if (!result.rows[0]) {
      throw new Error('Failed to update team member');
    }

    return result.rows[0];
  }

  /**
   * Delete team member
   */
  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM content.team_members WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }

  /**
   * Toggle active status
   */
  static async toggleActive(id: string): Promise<TeamMember> {
    const query = `
      UPDATE content.team_members
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query<TeamMember>(query, [id]);

    if (!result.rows[0]) {
      throw new Error('Team member not found');
    }

    return result.rows[0];
  }
}