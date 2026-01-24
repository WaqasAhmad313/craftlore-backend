import { db } from "../../config/db.ts";

/* ===== TYPE DEFINITIONS ===== */

export interface AmbassadorProfile {
  display_name: string;
  bio: string | null;
  location: string | null;
  profile_photo_url: string;
  certificate_photo_url: string | null;
}

export interface AmbassadorStory {
  id: string;
  delivery_id: string | null;
  product_id: string | null;
  product_name: string;
  story_text: string;
  product_photo_url: string;
  likes_count: number;
  shares_count: number;
  is_featured: boolean;
  edit_count: number;
  created_at: string;
  updated_at: string;
  last_edited_at: string | null;
}

export interface AmbassadorStats {
  total_stories: number;
  total_likes: number;
  total_shares: number;
}

export interface Ambassador {
  id: string;
  user_id: string;
  profile: AmbassadorProfile;
  stories: AmbassadorStory[];
  stats: AmbassadorStats;
  created_at: string;
  updated_at: string;
}

export interface StoryInteraction {
  id: string;
  ambassador_id: string;
  story_id: string;
  user_id: string | null; // NULL for anonymous shares
  interaction_type: "like" | "share";
  platform: string | null;
  created_at: string;
}

/* ===== INPUT TYPES ===== */

export interface CreateAmbassadorInput {
  user_id: string;
  profile: AmbassadorProfile;
}

export interface UpdateProfileInput {
  display_name?: string;
  bio?: string | null;
  location?: string | null;
  profile_photo_url?: string;
  certificate_photo_url?: string | null;
}

export interface CreateStoryInput {
  delivery_id: string | null;
  product_id: string;
  product_name: string;
  story_text: string;
  product_photo_url: string;
}

export interface UpdateStoryInput {
  story_text?: string;
  product_photo_url?: string;
}

export interface CreateInteractionInput {
  ambassador_id: string;
  story_id: string;
  user_id: string | null; // NULL for anonymous shares
  interaction_type: "like" | "share";
  platform?: string | null;
}

/* ===== AMBASSADOR MODEL ===== */

export class AmbassadorModel {
  /**
   * Create new ambassador profile
   */
  static async create(input: CreateAmbassadorInput): Promise<Ambassador> {
    const query = `
      INSERT INTO ambassadors (
        user_id,
        profile,
        stories,
        stats
      )
      VALUES (
        $1,
        $2::jsonb,
        '[]'::jsonb,
        '{"total_stories": 0, "total_likes": 0, "total_shares": 0}'::jsonb
      )
      RETURNING *
    `;

    const values = [input.user_id, JSON.stringify(input.profile)];

    const result = await db.query<Ambassador>(query, values);
    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to create ambassador profile");
    }

    return row;
  }

  /**
   * Get ambassador by user_id
   */
  static async getByUserId(userId: string): Promise<Ambassador | null> {
    const query = `SELECT * FROM ambassadors WHERE user_id = $1 LIMIT 1`;
    const result = await db.query<Ambassador>(query, [userId]);
    return result.rows[0] ?? null;
  }

  /**
   * Get ambassador by id
   */
  static async getById(id: string): Promise<Ambassador | null> {
    const query = `SELECT * FROM ambassadors WHERE id = $1 LIMIT 1`;
    const result = await db.query<Ambassador>(query, [id]);
    return result.rows[0] ?? null;
  }

  /**
   * Update ambassador profile
   */
  static async updateProfile(
    userId: string,
    updates: UpdateProfileInput
  ): Promise<Ambassador> {
    // Get current profile
    const current = await this.getByUserId(userId);
    if (!current) {
      throw new Error("Ambassador profile not found");
    }

    // Merge updates with current profile
    const updatedProfile: AmbassadorProfile = {
      display_name: updates.display_name ?? current.profile.display_name,
      bio: updates.bio !== undefined ? updates.bio : current.profile.bio,
      location:
        updates.location !== undefined ? updates.location : current.profile.location,
      profile_photo_url:
        updates.profile_photo_url ?? current.profile.profile_photo_url,
      certificate_photo_url:
        updates.certificate_photo_url !== undefined
          ? updates.certificate_photo_url
          : current.profile.certificate_photo_url,
    };

    const query = `
      UPDATE ambassadors
      SET 
        profile = $1::jsonb,
        updated_at = NOW()
      WHERE user_id = $2
      RETURNING *
    `;

    const values = [JSON.stringify(updatedProfile), userId];
    const result = await db.query<Ambassador>(query, values);
    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to update ambassador profile");
    }

    return row;
  }

  /**
   * Add story to ambassador
   */
  static async addStory(
    userId: string,
    story: AmbassadorStory
  ): Promise<Ambassador> {
    const query = `
      UPDATE ambassadors
      SET 
        stories = stories || $1::jsonb,
        stats = jsonb_set(
          stats,
          '{total_stories}',
          ((stats->>'total_stories')::int + 1)::text::jsonb
        ),
        updated_at = NOW()
      WHERE user_id = $2
      RETURNING *
    `;

    const values = [JSON.stringify(story), userId];
    const result = await db.query<Ambassador>(query, values);
    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to add story");
    }

    return row;
  }

  /**
   * Update story in ambassador's stories array
   */
  static async updateStory(
    userId: string,
    storyId: string,
    updates: UpdateStoryInput
  ): Promise<Ambassador> {
    // Get current ambassador
    const current = await this.getByUserId(userId);
    if (!current) {
      throw new Error("Ambassador profile not found");
    }

    // Find and update the story
    const updatedStories = current.stories.map((story) => {
      if (story.id === storyId) {
        return {
          ...story,
          story_text: updates.story_text ?? story.story_text,
          product_photo_url:
            updates.product_photo_url ?? story.product_photo_url,
          edit_count: story.edit_count + 1,
          updated_at: new Date().toISOString(),
          last_edited_at: new Date().toISOString(),
        };
      }
      return story;
    });

    const query = `
      UPDATE ambassadors
      SET 
        stories = $1::jsonb,
        updated_at = NOW()
      WHERE user_id = $2
      RETURNING *
    `;

    const values = [JSON.stringify(updatedStories), userId];
    const result = await db.query<Ambassador>(query, values);
    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to update story");
    }

    return row;
  }

  /**
   * Get all ambassadors with pagination and search
   */
  static async getAll(params: {
    page: number;
    limit: number;
    search?: string;
    sort: "newest" | "most_active" | "most_liked";
  }): Promise<{ ambassadors: Ambassador[]; total: number }> {
    const offset = (params.page - 1) * params.limit;

    let whereClause = "";
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (params.search) {
      whereClause = `WHERE (profile->>'display_name' ILIKE $${paramIndex} OR profile->>'bio' ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    let orderClause = "";
    switch (params.sort) {
      case "newest":
        orderClause = "ORDER BY created_at DESC";
        break;
      case "most_active":
        orderClause = "ORDER BY (stats->>'total_stories')::int DESC";
        break;
      case "most_liked":
        orderClause = "ORDER BY (stats->>'total_likes')::int DESC";
        break;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*)::int as count FROM ambassadors ${whereClause}`;
    const countResult = await db.query<{ count: number }>(
      countQuery,
      queryParams
    );
    const total = countResult.rows[0]?.count ?? 0;

    // Get ambassadors
    const query = `
      SELECT * FROM ambassadors
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(params.limit, offset);

    const result = await db.query<Ambassador>(query, queryParams);

    return {
      ambassadors: result.rows,
      total,
    };
  }

  /**
   * Get all stories with pagination and filters
   */
  static async getAllStories(params: {
    page: number;
    limit: number;
    filter?: "all" | "featured";
    ambassadorId?: string;
    sort: "newest" | "most_liked" | "most_shared";
  }): Promise<{
    stories: Array<AmbassadorStory & { ambassador: AmbassadorProfile; ambassador_id: string }>;
    total: number;
  }> {
    const offset = (params.page - 1) * params.limit;

    // Build WHERE clauses
    const whereClauses: string[] = [];
    const whereParams: (string | number)[] = [];
    let whereParamIndex = 1;

    if (params.ambassadorId) {
      whereClauses.push(`a.id = $${whereParamIndex}::uuid`);
      whereParams.push(params.ambassadorId);
      whereParamIndex++;
    }

    if (params.filter === "featured") {
      whereClauses.push(`(story_data->>'is_featured')::boolean = true`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Build ORDER BY clause
    let orderClause = "";
    switch (params.sort) {
      case "newest":
        orderClause = "ORDER BY (story_data->>'created_at')::timestamp DESC";
        break;
      case "most_liked":
        orderClause = "ORDER BY (story_data->>'likes_count')::int DESC";
        break;
      case "most_shared":
        orderClause = "ORDER BY (story_data->>'shares_count')::int DESC";
        break;
    }

    // Main query to get stories
    // Build params for main query: [...whereParams, limit, offset]
    const mainQueryParams = [...whereParams, params.limit, offset];
    const limitParamIndex = whereParamIndex;
    const offsetParamIndex = whereParamIndex + 1;

    const query = `
      SELECT 
        a.id as ambassador_id,
        a.profile,
        story_data->>'id' as id,
        story_data->>'delivery_id' as delivery_id,
        story_data->>'product_id' as product_id,
        story_data->>'product_name' as product_name,
        story_data->>'story_text' as story_text,
        story_data->>'product_photo_url' as product_photo_url,
        (story_data->>'likes_count')::int as likes_count,
        (story_data->>'shares_count')::int as shares_count,
        (story_data->>'is_featured')::boolean as is_featured,
        (story_data->>'edit_count')::int as edit_count,
        (story_data->>'created_at')::timestamp as created_at,
        (story_data->>'updated_at')::timestamp as updated_at,
        CASE 
          WHEN story_data->>'last_edited_at' = 'null' THEN NULL
          ELSE (story_data->>'last_edited_at')::timestamp
        END as last_edited_at
      FROM ambassadors a,
        jsonb_array_elements(a.stories) AS story_data
      ${whereClause}
      ${orderClause}
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const result = await db.query<{
      ambassador_id: string;
      profile: AmbassadorProfile;
      id: string;
      delivery_id: string | null;
      product_id: string;
      product_name: string;
      story_text: string;
      product_photo_url: string;
      likes_count: number;
      shares_count: number;
      is_featured: boolean;
      edit_count: number;
      created_at: Date;
      updated_at: Date;
      last_edited_at: Date | null;
    }>(query, mainQueryParams);

    // Count total stories
    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM ambassadors a,
        jsonb_array_elements(a.stories) AS story_data
      ${whereClause}
    `;

    const countResult = await db.query<{ count: number }>(countQuery, whereParams);
    const total = countResult.rows[0]?.count ?? 0;

    // Transform results
    const stories = result.rows.map((row) => ({
      id: row.id,
      delivery_id: row.delivery_id,
      product_id: row.product_id,
      product_name: row.product_name,
      story_text: row.story_text,
      product_photo_url: row.product_photo_url,
      likes_count: row.likes_count,
      shares_count: row.shares_count,
      is_featured: row.is_featured,
      edit_count: row.edit_count,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      last_edited_at: row.last_edited_at
        ? new Date(row.last_edited_at).toISOString()
        : null,
      ambassador_id: row.ambassador_id,
      ambassador: row.profile,
    }));

    return { stories, total };
  }

  /**
   * Get single story by ID
   */
  static async getStoryById(
    storyId: string
  ): Promise<(AmbassadorStory & { ambassador: Ambassador }) | null> {
    const query = `
      SELECT 
        a.id as ambassador_id,
        a.user_id as ambassador_user_id,
        a.profile,
        a.stories,
        a.stats,
        a.created_at as ambassador_created_at,
        a.updated_at as ambassador_updated_at,
        story_data->>'id' as story_id,
        story_data->>'delivery_id' as delivery_id,
        story_data->>'product_id' as product_id,
        story_data->>'product_name' as product_name,
        story_data->>'story_text' as story_text,
        story_data->>'product_photo_url' as product_photo_url,
        (story_data->>'likes_count')::int as likes_count,
        (story_data->>'shares_count')::int as shares_count,
        (story_data->>'is_featured')::boolean as is_featured,
        (story_data->>'edit_count')::int as edit_count,
        (story_data->>'created_at')::timestamp as created_at,
        (story_data->>'updated_at')::timestamp as updated_at,
        CASE 
          WHEN story_data->>'last_edited_at' = 'null' THEN NULL
          ELSE (story_data->>'last_edited_at')::timestamp
        END as last_edited_at
      FROM ambassadors a,
        jsonb_array_elements(a.stories) AS story_data
      WHERE story_data->>'id' = $1
      LIMIT 1
    `;

    const result = await db.query<{
      ambassador_id: string;
      ambassador_user_id: string;
      profile: AmbassadorProfile;
      stories: AmbassadorStory[];
      stats: AmbassadorStats;
      ambassador_created_at: Date;
      ambassador_updated_at: Date;
      story_id: string;
      delivery_id: string | null;
      product_id: string;
      product_name: string;
      story_text: string;
      product_photo_url: string;
      likes_count: number;
      shares_count: number;
      is_featured: boolean;
      edit_count: number;
      created_at: Date;
      updated_at: Date;
      last_edited_at: Date | null;
    }>(query, [storyId]);

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.story_id,
      delivery_id: row.delivery_id,
      product_id: row.product_id,
      product_name: row.product_name,
      story_text: row.story_text,
      product_photo_url: row.product_photo_url,
      likes_count: row.likes_count,
      shares_count: row.shares_count,
      is_featured: row.is_featured,
      edit_count: row.edit_count,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      last_edited_at: row.last_edited_at
        ? new Date(row.last_edited_at).toISOString()
        : null,
      ambassador: {
        id: row.ambassador_id,
        user_id: row.ambassador_user_id,
        profile: row.profile,
        stories: row.stories,
        stats: row.stats,
        created_at: new Date(row.ambassador_created_at).toISOString(),
        updated_at: new Date(row.ambassador_updated_at).toISOString(),
      },
    };
  }

  /**
   * Update story counts (likes/shares)
   */
  static async updateStoryCount(
    ambassadorId: string,
    storyId: string,
    field: "likes_count" | "shares_count",
    increment: number
  ): Promise<void> {
    const query = `
      UPDATE ambassadors
      SET stories = (
        SELECT jsonb_agg(
          CASE 
            WHEN story->>'id' = $2 
            THEN jsonb_set(
              story,
              '{${field}}',
              ((story->>'${field}')::int + $3)::text::jsonb
            )
            ELSE story
          END
        )
        FROM jsonb_array_elements(stories) AS story
      ),
      updated_at = NOW()
      WHERE id = $1
    `;

    await db.query(query, [ambassadorId, storyId, increment]);
  }

  /**
   * Update ambassador stats (recalculate from stories)
   */
  static async recalculateStats(ambassadorId: string): Promise<void> {
    const query = `
      UPDATE ambassadors
      SET stats = (
        SELECT jsonb_build_object(
          'total_stories', jsonb_array_length(stories),
          'total_likes', (
            SELECT COALESCE(SUM((story->>'likes_count')::int), 0)
            FROM jsonb_array_elements(stories) AS story
          ),
          'total_shares', (
            SELECT COALESCE(SUM((story->>'shares_count')::int), 0)
            FROM jsonb_array_elements(stories) AS story
          )
        )
      ),
      updated_at = NOW()
      WHERE id = $1
    `;

    await db.query(query, [ambassadorId]);
  }

  /**
   * Delete ambassador and all their data
   */
  static async delete(ambassadorId: string): Promise<void> {
    const query = `DELETE FROM ambassadors WHERE id = $1`;
    await db.query(query, [ambassadorId]);
  }

  /**
   * Delete single story from ambassador
   */
  static async deleteStory(
    ambassadorId: string,
    storyId: string
  ): Promise<void> {
    const query = `
      UPDATE ambassadors
      SET stories = COALESCE(
        (
          SELECT jsonb_agg(story)
          FROM jsonb_array_elements(stories) AS story
          WHERE story->>'id' != $2
        ),
        '[]'::jsonb
      ),
      updated_at = NOW()
      WHERE id = $1
    `;

    await db.query(query, [ambassadorId, storyId]);

    // Recalculate stats after deletion
    await this.recalculateStats(ambassadorId);
  }

  /**
   * Get admin stats
   */
  static async getAdminStats(): Promise<{
    total_ambassadors: number;
    total_stories: number;
    total_likes: number;
    total_shares: number;
    stories_this_month: number;
    ambassadors_this_month: number;
    top_ambassadors: Array<{
      id: string;
      display_name: string;
      total_stories: number;
      total_likes: number;
    }>;
    top_stories: Array<{
      id: string;
      product_name: string;
      likes_count: number;
      shares_count: number;
      ambassador_name: string;
    }>;
  }> {
    // Get totals
    const totalsQuery = `
      SELECT 
        COUNT(*)::int as total_ambassadors,
        COALESCE(SUM(jsonb_array_length(stories)), 0)::int as total_stories,
        COALESCE(SUM((stats->>'total_likes')::int), 0)::int as total_likes,
        COALESCE(SUM((stats->>'total_shares')::int), 0)::int as total_shares
      FROM ambassadors
    `;
    const totalsResult = await db.query<{
      total_ambassadors: number;
      total_stories: number;
      total_likes: number;
      total_shares: number;
    }>(totalsQuery);
    const totals = totalsResult.rows[0] ?? {
      total_ambassadors: 0,
      total_stories: 0,
      total_likes: 0,
      total_shares: 0,
    };

    // Get this month's counts
    const thisMonthQuery = `
      SELECT 
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END)::int as ambassadors_this_month,
        (
          SELECT COUNT(*)::int
          FROM ambassadors,
            jsonb_to_recordset(stories) AS story(created_at timestamp)
          WHERE story.created_at >= DATE_TRUNC('month', NOW())
        ) as stories_this_month
      FROM ambassadors
    `;
    const thisMonthResult = await db.query<{
      ambassadors_this_month: number;
      stories_this_month: number;
    }>(thisMonthQuery);
    const thisMonth = thisMonthResult.rows[0] ?? {
      ambassadors_this_month: 0,
      stories_this_month: 0,
    };

    // Get top ambassadors
    const topAmbassadorsQuery = `
      SELECT 
        id,
        profile->>'display_name' as display_name,
        (stats->>'total_stories')::int as total_stories,
        (stats->>'total_likes')::int as total_likes
      FROM ambassadors
      ORDER BY (stats->>'total_likes')::int DESC
      LIMIT 5
    `;
    const topAmbassadorsResult = await db.query<{
      id: string;
      display_name: string;
      total_stories: number;
      total_likes: number;
    }>(topAmbassadorsQuery);

    // Get top stories
    const topStoriesQuery = `
      SELECT 
        story.id,
        story.product_name,
        story.likes_count,
        story.shares_count,
        a.profile->>'display_name' as ambassador_name
      FROM ambassadors a,
        jsonb_to_recordset(a.stories) AS story(
          id uuid,
          product_name text,
          likes_count int,
          shares_count int
        )
      ORDER BY story.likes_count DESC
      LIMIT 5
    `;
    const topStoriesResult = await db.query<{
      id: string;
      product_name: string;
      likes_count: number;
      shares_count: number;
      ambassador_name: string;
    }>(topStoriesQuery);

    return {
      ...totals,
      ...thisMonth,
      top_ambassadors: topAmbassadorsResult.rows,
      top_stories: topStoriesResult.rows,
    };
  }
}

/* ===== STORY INTERACTION MODEL ===== */

export class StoryInteractionModel {
  /**
   * Create interaction (like or share)
   */
  static async create(input: CreateInteractionInput): Promise<StoryInteraction> {
    // For anonymous shares, always create new record (no duplicate check)
    // For authenticated users, use ON CONFLICT to prevent duplicates
    const query = input.user_id
      ? `
        INSERT INTO story_interactions (
          ambassador_id,
          story_id,
          user_id,
          interaction_type,
          platform
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, story_id, interaction_type) 
        WHERE user_id IS NOT NULL
        DO NOTHING
        RETURNING *
      `
      : `
        INSERT INTO story_interactions (
          ambassador_id,
          story_id,
          user_id,
          interaction_type,
          platform
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

    const values = [
      input.ambassador_id,
      input.story_id,
      input.user_id ?? null,
      input.interaction_type,
      input.platform ?? null,
    ];

    const result = await db.query<StoryInteraction>(query, values);
    const row = result.rows[0];

    if (!row) {
      throw new Error("Interaction already exists or failed to create");
    }

    return row;
  }

  /**
   * Delete interaction (unlike)
   */
  static async delete(
    userId: string,
    storyId: string,
    type: "like" | "share"
  ): Promise<boolean> {
    const query = `
      DELETE FROM story_interactions
      WHERE user_id = $1 AND story_id = $2 AND interaction_type = $3
      RETURNING id
    `;

    const result = await db.query<{ id: string }>(query, [
      userId,
      storyId,
      type,
    ]);

    return result.rows.length > 0;
  }

  /**
   * Check if user has liked a story
   */
  static async hasUserLiked(
    userId: string,
    storyId: string
  ): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM story_interactions
        WHERE user_id = $1 AND story_id = $2 AND interaction_type = 'like'
      ) as exists
    `;

    const result = await db.query<{ exists: boolean }>(query, [
      userId,
      storyId,
    ]);

    return result.rows[0]?.exists ?? false;
  }

  /**
   * Get user's liked stories
   */
  static async getUserLikes(userId: string): Promise<string[]> {
    const query = `
      SELECT story_id
      FROM story_interactions
      WHERE user_id = $1 AND interaction_type = 'like'
    `;

    const result = await db.query<{ story_id: string }>(query, [userId]);
    return result.rows.map((row) => row.story_id);
  }

  /**
   * Delete all interactions for a story
   */
  static async deleteByStoryId(storyId: string): Promise<void> {
    const query = `DELETE FROM story_interactions WHERE story_id = $1`;
    await db.query(query, [storyId]);
  }

  /**
   * Delete all interactions for an ambassador
   */
  static async deleteByAmbassadorId(ambassadorId: string): Promise<void> {
    const query = `DELETE FROM story_interactions WHERE ambassador_id = $1`;
    await db.query(query, [ambassadorId]);
  }
}

export default {
  AmbassadorModel,
  StoryInteractionModel,
};