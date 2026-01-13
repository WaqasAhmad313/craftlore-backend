import EvaluationModel from "./model.ts";
import type {
  CreateEvaluationInput,
  UpdateEvaluationInput,
  Evaluation,
  EvaluationWithEntity,
  GetAllEvaluationsFilters,
  PaginatedEvaluationResponse,
} from "./model.ts";

class EvaluationService {
  /**
   * Create a new evaluation
   */
  static async createEvaluation(
    input: CreateEvaluationInput
  ): Promise<Evaluation> {
    // Validate scores are within range (0-100)
    this.validateScores(input);

    // Check if craft entity exists (optional validation)
    // You can add a check to craft_entities table if needed

    const evaluation = await EvaluationModel.create(input);
    return evaluation;
  }

  /**
   * Get all evaluations with filters
   */
  static async getAllEvaluations(
    filters?: GetAllEvaluationsFilters
  ): Promise<PaginatedEvaluationResponse> {
    return await EvaluationModel.getAll(filters);
  }

  /**
   * Get evaluation by ID
   */
  static async getEvaluationById(id: string): Promise<EvaluationWithEntity> {
    const evaluation = await EvaluationModel.getById(id);

    if (!evaluation) {
      throw new Error("Evaluation not found");
    }

    return evaluation;
  }

  /**
   * Get all evaluations for a specific craft entity
   */
  static async getEvaluationsByEntity(
    craft_entity_id: string
  ): Promise<EvaluationWithEntity[]> {
    return await EvaluationModel.getByCraftEntityId(craft_entity_id);
  }

  /**
   * Update an evaluation
   */
  static async updateEvaluation(
    id: string,
    input: UpdateEvaluationInput
  ): Promise<Evaluation> {
    // Validate scores if provided
    if (
      input.quality_score !== undefined ||
      input.ethics_score !== undefined ||
      input.satisfaction_score !== undefined ||
      input.authenticity_score !== undefined ||
      input.gi_compliance_score !== undefined
    ) {
      this.validateScores(input);
    }

    const evaluation = await EvaluationModel.update(id, input);
    return evaluation;
  }

  /**
   * Delete an evaluation
   */
  static async deleteEvaluation(id: string): Promise<void> {
    const deleted = await EvaluationModel.delete(id);

    if (!deleted) {
      throw new Error("Evaluation not found");
    }
  }

  /**
   * Get evaluation statistics for an entity
   */
  static async getEntityStatistics(craft_entity_id: string): Promise<{
    averages: {
      avg_quality: number;
      avg_ethics: number;
      avg_satisfaction: number;
      avg_authenticity: number;
      avg_gi_compliance: number;
      avg_overall: number;
      total_evaluations: number;
    } | null;
    evaluations: EvaluationWithEntity[];
  }> {
    const [averages, evaluations] = await Promise.all([
      EvaluationModel.getAverageScoresByEntity(craft_entity_id),
      EvaluationModel.getByCraftEntityId(craft_entity_id),
    ]);

    return {
      averages,
      evaluations,
    };
  }

  /**
   * Check if entity has evaluations
   */
  static async hasEvaluations(craft_entity_id: string): Promise<boolean> {
    return await EvaluationModel.existsForEntity(craft_entity_id);
  }

  /**
   * Get evaluation count for entity
   */
  static async getEvaluationCount(craft_entity_id: string): Promise<number> {
    return await EvaluationModel.getCountByEntity(craft_entity_id);
  }

  /**
   * Validate score values
   */
  private static validateScores(input: {
    quality_score?: number | undefined;
    ethics_score?: number | undefined;
    satisfaction_score?: number | undefined;
    authenticity_score?: number | undefined;
    gi_compliance_score?: number | undefined;
  }): void {
    const scores = [
      { name: "quality_score", value: input.quality_score },
      { name: "ethics_score", value: input.ethics_score },
      { name: "satisfaction_score", value: input.satisfaction_score },
      { name: "authenticity_score", value: input.authenticity_score },
      { name: "gi_compliance_score", value: input.gi_compliance_score },
    ];

    for (const score of scores) {
      if (score.value !== undefined) {
        if (typeof score.value !== "number") {
          throw new Error(`${score.name} must be a number`);
        }
        if (score.value < 0 || score.value > 100) {
          throw new Error(`${score.name} must be between 0 and 100`);
        }
      }
    }
  }

  /**
   * Get top performing entities
   */
  static async getTopPerformers(
    limit: number = 10,
    year?: number
  ): Promise<EvaluationWithEntity[]> {
    const filters: GetAllEvaluationsFilters = {
      limit,
      page: 1,
    };

    if (year) {
      filters.year = year;
    }

    const result = await EvaluationModel.getAll(filters);
    return result.evaluations;
  }

  /**
   * Get evaluations summary by year
   */
  static async getYearlySummary(year: number): Promise<{
    total_evaluations: number;
    average_overall_score: number;
    average_quality_score: number;
    average_ethics_score: number;
    average_satisfaction_score: number;
    average_authenticity_score: number;
    average_gi_compliance_score: number;
  }> {
    const result = await EvaluationModel.getAll({ year, limit: 9999 });
    const evaluations = result.evaluations;

    if (evaluations.length === 0) {
      return {
        total_evaluations: 0,
        average_overall_score: 0,
        average_quality_score: 0,
        average_ethics_score: 0,
        average_satisfaction_score: 0,
        average_authenticity_score: 0,
        average_gi_compliance_score: 0,
      };
    }

    const sum = evaluations.reduce(
      (acc, eval_) => ({
        overall: acc.overall + eval_.overall_score,
        quality: acc.quality + eval_.quality_score,
        ethics: acc.ethics + eval_.ethics_score,
        satisfaction: acc.satisfaction + eval_.satisfaction_score,
        authenticity: acc.authenticity + eval_.authenticity_score,
        gi_compliance: acc.gi_compliance + eval_.gi_compliance_score,
      }),
      {
        overall: 0,
        quality: 0,
        ethics: 0,
        satisfaction: 0,
        authenticity: 0,
        gi_compliance: 0,
      }
    );

    const count = evaluations.length;

    return {
      total_evaluations: count,
      average_overall_score: Math.round((sum.overall / count) * 10) / 10,
      average_quality_score: Math.round((sum.quality / count) * 10) / 10,
      average_ethics_score: Math.round((sum.ethics / count) * 10) / 10,
      average_satisfaction_score:
        Math.round((sum.satisfaction / count) * 10) / 10,
      average_authenticity_score:
        Math.round((sum.authenticity / count) * 10) / 10,
      average_gi_compliance_score:
        Math.round((sum.gi_compliance / count) * 10) / 10,
    };
  }
}

export default EvaluationService;
