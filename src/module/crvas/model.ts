import { db } from "../../config/db.ts";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface DataPoint {
  time_period: string;
  value: number;
  risk_level: RiskLevel;
  notes?: string | null;
}

export interface Indicator {
  id: string;
  name: string;
  description?: string | null;
  unit?: string | null;
  is_active: boolean;
  display_order: number;
  data: DataPoint[];
}

export interface RiskCategory {
  id: number;
  name: string;
  slug: string;
  icon_name?: string | null;
  is_active: boolean;
  display_order: number;
  indicators: Indicator[];
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: number;
  time_period: string;
  overall_risk_score: number | null;
  vulnerability_index: number | null;
  resilience_score: number | null;
  assessment_summary: string | null;
  published: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/* ===========================
   INPUT TYPES
=========================== */

export interface CreateCategoryInput {
  name: string;
  slug: string;
  icon_name?: string | null;
  is_active?: boolean;
  display_order?: number;
  indicators?: Indicator[];
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  icon_name?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export interface CreateIndicatorInput {
  name: string;
  description?: string | null;
  unit?: string | null;
  is_active?: boolean;
  display_order?: number;
  data?: DataPoint[];
}

export interface UpdateIndicatorInput {
  name?: string;
  description?: string | null;
  unit?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export interface CreateDataPointInput {
  time_period: string;
  value: number;
  risk_level: RiskLevel;
  notes?: string | null;
}

export interface CreateAssessmentInput {
  time_period: string;
  overall_risk_score?: number | null;
  vulnerability_index?: number | null;
  resilience_score?: number | null;
  assessment_summary?: string | null;
  published?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateAssessmentInput {
  time_period?: string;
  overall_risk_score?: number | null;
  vulnerability_index?: number | null;
  resilience_score?: number | null;
  assessment_summary?: string | null;
  published?: boolean;
  metadata?: Record<string, unknown>;
}

/* ===========================
   MODEL
=========================== */

class CRVASModel {

  /* -------- PUBLIC: DASHBOARD -------- */

  static async getAllActiveCategories(): Promise<RiskCategory[]> {
    const result = await db.query<RiskCategory>(
      `SELECT *
       FROM content.crvas_risk_categories
       WHERE is_active = true
       ORDER BY display_order ASC`
    );
    return result.rows;
  }

  static async getCategoryBySlug(slug: string): Promise<RiskCategory | null> {
    const result = await db.query<RiskCategory>(
      `SELECT *
       FROM content.crvas_risk_categories
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );
    return result.rows[0] ?? null;
  }

  static async getLatestPublishedAssessment(): Promise<Assessment | null> {
    const result = await db.query<Assessment>(
      `SELECT *
       FROM content.crvas_assessments
       WHERE published = true
       ORDER BY time_period DESC
       LIMIT 1`
    );
    return result.rows[0] ?? null;
  }

  /* -------- ADMIN: CATEGORIES -------- */

  static async createCategory(payload: CreateCategoryInput): Promise<RiskCategory> {
    const result = await db.query<RiskCategory>(
      `INSERT INTO content.crvas_risk_categories
         (name, slug, icon_name, is_active, display_order, indicators)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [
        payload.name,
        payload.slug,
        payload.icon_name ?? null,
        payload.is_active ?? true,
        payload.display_order ?? 0,
        JSON.stringify(payload.indicators ?? []),
      ]
    );
    return result.rows[0]!;
  }

  static async getAllCategories(): Promise<RiskCategory[]> {
    const result = await db.query<RiskCategory>(
      `SELECT *
       FROM content.crvas_risk_categories
       ORDER BY display_order ASC`
    );
    return result.rows;
  }

  static async getCategoryById(id: number): Promise<RiskCategory | null> {
    const result = await db.query<RiskCategory>(
      `SELECT *
       FROM content.crvas_risk_categories
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async updateCategory(id: number, payload: UpdateCategoryInput): Promise<RiskCategory | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (payload.name !== undefined)         { fields.push(`name = $${idx++}`);          values.push(payload.name); }
    if (payload.slug !== undefined)         { fields.push(`slug = $${idx++}`);          values.push(payload.slug); }
    if (payload.icon_name !== undefined)    { fields.push(`icon_name = $${idx++}`);     values.push(payload.icon_name); }
    if (payload.is_active !== undefined)    { fields.push(`is_active = $${idx++}`);     values.push(payload.is_active); }
    if (payload.display_order !== undefined){ fields.push(`display_order = $${idx++}`); values.push(payload.display_order); }

    if (fields.length === 0) return this.getCategoryById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query<RiskCategory>(
      `UPDATE content.crvas_risk_categories
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  static async deleteCategory(id: number): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM content.crvas_risk_categories WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /* -------- ADMIN: INDICATORS (JSONB ops) -------- */

  static async addIndicator(categoryId: number, indicator: Indicator): Promise<RiskCategory | null> {
    const result = await db.query<RiskCategory>(
      `UPDATE content.crvas_risk_categories
       SET indicators = indicators || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify([indicator]), categoryId]
    );
    return result.rows[0] ?? null;
  }

  static async updateIndicator(
    categoryId: number,
    indicatorId: string,
    payload: UpdateIndicatorInput
  ): Promise<RiskCategory | null> {
    // Pull existing indicators, patch the target one, write back
    const category = await this.getCategoryById(categoryId);
    if (!category) return null;

    const indicators: Indicator[] = category.indicators ?? [];
    const index = indicators.findIndex((i) => i.id === indicatorId);
    if (index === -1) return null;

    indicators[index] = { ...indicators[index]!, ...payload };

    const result = await db.query<RiskCategory>(
      `UPDATE content.crvas_risk_categories
       SET indicators = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(indicators), categoryId]
    );
    return result.rows[0] ?? null;
  }

  static async deleteIndicator(categoryId: number, indicatorId: string): Promise<RiskCategory | null> {
    const category = await this.getCategoryById(categoryId);
    if (!category) return null;

    const indicators = (category.indicators ?? []).filter((i) => i.id !== indicatorId);

    const result = await db.query<RiskCategory>(
      `UPDATE content.crvas_risk_categories
       SET indicators = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(indicators), categoryId]
    );
    return result.rows[0] ?? null;
  }

  /* -------- ADMIN: DATA POINTS (nested inside indicator JSONB) -------- */

  static async addDataPoint(
    categoryId: number,
    indicatorId: string,
    dataPoint: DataPoint
  ): Promise<RiskCategory | null> {
    const category = await this.getCategoryById(categoryId);
    if (!category) return null;

    const indicators: Indicator[] = category.indicators ?? [];
    const index = indicators.findIndex((i) => i.id === indicatorId);
    if (index === -1) return null;

    indicators[index]!.data = [...(indicators[index]!.data ?? []), dataPoint];

    const result = await db.query<RiskCategory>(
      `UPDATE content.crvas_risk_categories
       SET indicators = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(indicators), categoryId]
    );
    return result.rows[0] ?? null;
  }

  static async updateDataPoint(
    categoryId: number,
    indicatorId: string,
    timePeriod: string,
    payload: Partial<DataPoint>
  ): Promise<RiskCategory | null> {
    const category = await this.getCategoryById(categoryId);
    if (!category) return null;

    const indicators: Indicator[] = category.indicators ?? [];
    const indIndex = indicators.findIndex((i) => i.id === indicatorId);
    if (indIndex === -1) return null;

    const dataArr = indicators[indIndex]!.data ?? [];
    const dpIndex = dataArr.findIndex((d) => d.time_period === timePeriod);
    if (dpIndex === -1) return null;

    dataArr[dpIndex] = { ...dataArr[dpIndex]!, ...payload };
    indicators[indIndex]!.data = dataArr;

    const result = await db.query<RiskCategory>(
      `UPDATE content.crvas_risk_categories
       SET indicators = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(indicators), categoryId]
    );
    return result.rows[0] ?? null;
  }

  static async deleteDataPoint(
    categoryId: number,
    indicatorId: string,
    timePeriod: string
  ): Promise<RiskCategory | null> {
    const category = await this.getCategoryById(categoryId);
    if (!category) return null;

    const indicators: Indicator[] = category.indicators ?? [];
    const indIndex = indicators.findIndex((i) => i.id === indicatorId);
    if (indIndex === -1) return null;

    indicators[indIndex]!.data = (indicators[indIndex]!.data ?? []).filter(
      (d) => d.time_period !== timePeriod
    );

    const result = await db.query<RiskCategory>(
      `UPDATE content.crvas_risk_categories
       SET indicators = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(indicators), categoryId]
    );
    return result.rows[0] ?? null;
  }

  /* -------- ADMIN: ASSESSMENTS -------- */

  static async createAssessment(payload: CreateAssessmentInput): Promise<Assessment> {
    const result = await db.query<Assessment>(
      `INSERT INTO content.crvas_assessments
         (time_period, overall_risk_score, vulnerability_index, resilience_score,
          assessment_summary, published, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [
        payload.time_period,
        payload.overall_risk_score ?? null,
        payload.vulnerability_index ?? null,
        payload.resilience_score ?? null,
        payload.assessment_summary ?? null,
        payload.published ?? false,
        JSON.stringify(payload.metadata ?? {}),
      ]
    );
    return result.rows[0]!;
  }

  static async getAllAssessments(): Promise<Assessment[]> {
    const result = await db.query<Assessment>(
      `SELECT *
       FROM content.crvas_assessments
       ORDER BY time_period DESC`
    );
    return result.rows;
  }

  static async getAssessmentById(id: number): Promise<Assessment | null> {
    const result = await db.query<Assessment>(
      `SELECT *
       FROM content.crvas_assessments
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async updateAssessment(id: number, payload: UpdateAssessmentInput): Promise<Assessment | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (payload.time_period !== undefined)        { fields.push(`time_period = $${idx++}`);        values.push(payload.time_period); }
    if (payload.overall_risk_score !== undefined) { fields.push(`overall_risk_score = $${idx++}`); values.push(payload.overall_risk_score); }
    if (payload.vulnerability_index !== undefined){ fields.push(`vulnerability_index = $${idx++}`);values.push(payload.vulnerability_index); }
    if (payload.resilience_score !== undefined)   { fields.push(`resilience_score = $${idx++}`);   values.push(payload.resilience_score); }
    if (payload.assessment_summary !== undefined) { fields.push(`assessment_summary = $${idx++}`); values.push(payload.assessment_summary); }
    if (payload.published !== undefined)          { fields.push(`published = $${idx++}`);          values.push(payload.published); }
    if (payload.metadata !== undefined)           { fields.push(`metadata = $${idx++}::jsonb`);    values.push(JSON.stringify(payload.metadata)); }

    if (fields.length === 0) return this.getAssessmentById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query<Assessment>(
      `UPDATE content.crvas_assessments
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  static async deleteAssessment(id: number): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM content.crvas_assessments WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export default CRVASModel;