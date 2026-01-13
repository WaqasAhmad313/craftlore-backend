import { db } from "../../config/db.ts";

export interface CreateEvaluationInput {
  craft_entity_id: string;
  quality_score: number;
  ethics_score: number;
  satisfaction_score: number;
  authenticity_score: number;
  gi_compliance_score: number;
  notes?: string | undefined;
}

export interface UpdateEvaluationInput {
  quality_score?: number | undefined;
  ethics_score?: number | undefined;
  satisfaction_score?: number | undefined;
  authenticity_score?: number | undefined;
  gi_compliance_score?: number | undefined;
  notes?: string | undefined;
}

export interface Evaluation {
  id: string;
  craft_entity_id: string;
  quality_score: number;
  ethics_score: number;
  satisfaction_score: number;
  authenticity_score: number;
  gi_compliance_score: number;
  overall_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationWithEntity extends Evaluation {
  entity_name: string;
  entity_type: string;
  reference_id: string;
}

export interface GetAllEvaluationsFilters {
  year?: number | undefined;
  craft_entity_id?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface PaginatedEvaluationResponse {
  evaluations: EvaluationWithEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class EvaluationModel {
  /**
   * Calculate overall score from individual scores
   */
  private static calculateOverallScore(
    quality: number,
    ethics: number,
    satisfaction: number,
    authenticity: number,
    giCompliance: number
  ): number {
    const average = (quality + ethics + satisfaction + authenticity + giCompliance) / 5;
    return Math.round(average * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Create a new evaluation
   */
  static async create(input: CreateEvaluationInput): Promise<Evaluation> {
    const overallScore = this.calculateOverallScore(
      input.quality_score,
      input.ethics_score,
      input.satisfaction_score,
      input.authenticity_score,
      input.gi_compliance_score
    );

    const query = `
      INSERT INTO craft_entity_evaluations (
        craft_entity_id,
        quality_score,
        ethics_score,
        satisfaction_score,
        authenticity_score,
        gi_compliance_score,
        overall_score,
        notes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      input.craft_entity_id,
      input.quality_score,
      input.ethics_score,
      input.satisfaction_score,
      input.authenticity_score,
      input.gi_compliance_score,
      overallScore,
      input.notes || null
    ];

    const result = await db.query<Evaluation>(query, values);

    if (result.rows.length === 0) {
      throw new Error("Failed to create evaluation");
    }

    return result.rows[0]!;
  }

  /**
   * Get all evaluations with optional filters and pagination
   */
  static async getAll(filters?: GetAllEvaluationsFilters): Promise<PaginatedEvaluationResponse> {
    const {
      year,
      craft_entity_id,
      page = 1,
      limit = 50
    } = filters || {};

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramCount = 1;

    // Year filter (extract year from created_at)
    if (year) {
      conditions.push(`EXTRACT(YEAR FROM e.created_at) = $${paramCount}`);
      values.push(year);
      paramCount++;
    }

    // Craft entity ID filter
    if (craft_entity_id) {
      conditions.push(`e.craft_entity_id = $${paramCount}`);
      values.push(craft_entity_id);
      paramCount++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM craft_entity_evaluations e
      ${whereClause}
    `;

    const countResult = await db.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get evaluations with entity info
    const evaluationsQuery = `
      SELECT 
        e.*,
        ce.name as entity_name,
        ce.entity_type,
        ce.reference_id
      FROM craft_entity_evaluations e
      INNER JOIN craft_entities ce ON e.craft_entity_id = ce.id
      ${whereClause}
      ORDER BY e.overall_score DESC, e.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);

    const result = await db.query<EvaluationWithEntity>(evaluationsQuery, values);

    return {
      evaluations: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get evaluation by ID
   */
  static async getById(id: string): Promise<EvaluationWithEntity | null> {
    const query = `
      SELECT 
        e.*,
        ce.name as entity_name,
        ce.entity_type,
        ce.reference_id
      FROM craft_entity_evaluations e
      INNER JOIN craft_entities ce ON e.craft_entity_id = ce.id
      WHERE e.id = $1
    `;

    const result = await db.query<EvaluationWithEntity>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get evaluations by craft entity ID
   */
  static async getByCraftEntityId(craft_entity_id: string): Promise<EvaluationWithEntity[]> {
    const query = `
      SELECT 
        e.*,
        ce.name as entity_name,
        ce.entity_type,
        ce.reference_id
      FROM craft_entity_evaluations e
      INNER JOIN craft_entities ce ON e.craft_entity_id = ce.id
      WHERE e.craft_entity_id = $1
      ORDER BY e.created_at DESC
    `;

    const result = await db.query<EvaluationWithEntity>(query, [craft_entity_id]);
    return result.rows;
  }

  /**
   * Update an evaluation
   */
  static async update(id: string, input: UpdateEvaluationInput): Promise<Evaluation> {
    // First, get the current evaluation to calculate new overall score
    const currentEval = await this.getById(id);
    
    if (!currentEval) {
      throw new Error("Evaluation not found");
    }

    // Use provided values or keep existing ones
    const quality = input.quality_score ?? currentEval.quality_score;
    const ethics = input.ethics_score ?? currentEval.ethics_score;
    const satisfaction = input.satisfaction_score ?? currentEval.satisfaction_score;
    const authenticity = input.authenticity_score ?? currentEval.authenticity_score;
    const giCompliance = input.gi_compliance_score ?? currentEval.gi_compliance_score;

    // Recalculate overall score
    const overallScore = this.calculateOverallScore(
      quality,
      ethics,
      satisfaction,
      authenticity,
      giCompliance
    );

    const query = `
      UPDATE craft_entity_evaluations
      SET 
        quality_score = $1,
        ethics_score = $2,
        satisfaction_score = $3,
        authenticity_score = $4,
        gi_compliance_score = $5,
        overall_score = $6,
        notes = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      quality,
      ethics,
      satisfaction,
      authenticity,
      giCompliance,
      overallScore,
      input.notes !== undefined ? input.notes : currentEval.notes,
      id
    ];

    const result = await db.query<Evaluation>(query, values);

    if (result.rows.length === 0) {
      throw new Error("Failed to update evaluation");
    }

    return result.rows[0]!;
  }

  /**
   * Delete an evaluation
   */
  static async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM craft_entity_evaluations
      WHERE id = $1
      RETURNING id
    `;

    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }

  /**
   * Check if evaluation exists for a craft entity
   */
  static async existsForEntity(craft_entity_id: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM craft_entity_evaluations 
        WHERE craft_entity_id = $1
      ) as exists
    `;

    const result = await db.query<{ exists: boolean }>(query, [craft_entity_id]);
    return result.rows[0]?.exists || false;
  }

  /**
   * Get evaluation count by entity
   */
  static async getCountByEntity(craft_entity_id: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM craft_entity_evaluations
      WHERE craft_entity_id = $1
    `;

    const result = await db.query<{ count: string }>(query, [craft_entity_id]);
    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Get average scores for an entity across all evaluations
   */
  static async getAverageScoresByEntity(craft_entity_id: string): Promise<{
    avg_quality: number;
    avg_ethics: number;
    avg_satisfaction: number;
    avg_authenticity: number;
    avg_gi_compliance: number;
    avg_overall: number;
    total_evaluations: number;
  } | null> {
    const query = `
      SELECT 
        ROUND(AVG(quality_score)::numeric, 1) as avg_quality,
        ROUND(AVG(ethics_score)::numeric, 1) as avg_ethics,
        ROUND(AVG(satisfaction_score)::numeric, 1) as avg_satisfaction,
        ROUND(AVG(authenticity_score)::numeric, 1) as avg_authenticity,
        ROUND(AVG(gi_compliance_score)::numeric, 1) as avg_gi_compliance,
        ROUND(AVG(overall_score)::numeric, 1) as avg_overall,
        COUNT(*) as total_evaluations
      FROM craft_entity_evaluations
      WHERE craft_entity_id = $1
    `;

    const result = await db.query(query, [craft_entity_id]);
    
    if (result.rows.length === 0 || result.rows[0]?.total_evaluations === '0') {
      return null;
    }

    return {
      avg_quality: parseFloat(result.rows[0]?.avg_quality || '0'),
      avg_ethics: parseFloat(result.rows[0]?.avg_ethics || '0'),
      avg_satisfaction: parseFloat(result.rows[0]?.avg_satisfaction || '0'),
      avg_authenticity: parseFloat(result.rows[0]?.avg_authenticity || '0'),
      avg_gi_compliance: parseFloat(result.rows[0]?.avg_gi_compliance || '0'),
      avg_overall: parseFloat(result.rows[0]?.avg_overall || '0'),
      total_evaluations: parseInt(result.rows[0]?.total_evaluations || '0')
    };
  }
}

export default EvaluationModel;