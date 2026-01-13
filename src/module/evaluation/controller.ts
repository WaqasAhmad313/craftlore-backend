import type { Request, Response } from "express";
import EvaluationService from "./service.ts";
import type { 
  CreateEvaluationInput, 
  UpdateEvaluationInput,
  GetAllEvaluationsFilters 
} from "./model.ts";

class EvaluationController {
  /**
   * Create a new evaluation
   * POST /api/evaluations
   */
  static async createEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const { 
        craft_entity_id, 
        quality_score, 
        ethics_score, 
        satisfaction_score, 
        authenticity_score, 
        gi_compliance_score, 
        notes 
      } = req.body;

      // Validate required fields
      if (!craft_entity_id || typeof craft_entity_id !== 'string') {
        res.status(400).json({
          success: false,
          error: "craft_entity_id is required and must be a string"
        });
        return;
      }

      if (
        typeof quality_score !== 'number' ||
        typeof ethics_score !== 'number' ||
        typeof satisfaction_score !== 'number' ||
        typeof authenticity_score !== 'number' ||
        typeof gi_compliance_score !== 'number'
      ) {
        res.status(400).json({
          success: false,
          error: "All score fields are required and must be numbers"
        });
        return;
      }

      const input: CreateEvaluationInput = {
        craft_entity_id,
        quality_score,
        ethics_score,
        satisfaction_score,
        authenticity_score,
        gi_compliance_score,
        ...(typeof notes === 'string' && { notes })
      };

      const evaluation = await EvaluationService.createEvaluation(input);

      res.status(201).json({
        success: true,
        data: evaluation,
        message: "Evaluation created successfully"
      });
    } catch (error) {
      console.error("Error creating evaluation:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to create evaluation",
        message: errorMessage
      });
    }
  }

  /**
   * Get all evaluations with optional filters
   * GET /api/evaluations?year=2025&page=1&limit=50
   */
  static async getAllEvaluations(req: Request, res: Response): Promise<void> {
    try {
      const yearQuery = req.query.year;
      const craftEntityIdQuery = req.query.craft_entity_id;
      const pageQuery = req.query.page;
      const limitQuery = req.query.limit;

      const year = yearQuery && typeof yearQuery === 'string' ? parseInt(yearQuery, 10) : undefined;
      const craft_entity_id = craftEntityIdQuery && typeof craftEntityIdQuery === 'string' ? craftEntityIdQuery : undefined;
      const page = pageQuery && typeof pageQuery === 'string' ? parseInt(pageQuery, 10) : 1;
      const limit = limitQuery && typeof limitQuery === 'string' ? parseInt(limitQuery, 10) : 50;

      const filters: GetAllEvaluationsFilters = {
        ...(year !== undefined && { year }),
        ...(craft_entity_id !== undefined && { craft_entity_id }),
        page,
        limit
      };

      const result = await EvaluationService.getAllEvaluations(filters);

      res.status(200).json({
        success: true,
        data: {
          evaluations: result.evaluations,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error("Error getting evaluations:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get evaluations",
        message: errorMessage
      });
    }
  }

  /**
   * Get evaluation by ID
   * GET /api/evaluations/:id
   */
  static async getEvaluationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: "Invalid evaluation ID"
        });
        return;
      }

      const evaluation = await EvaluationService.getEvaluationById(id);

      res.status(200).json({
        success: true,
        data: evaluation
      });
    } catch (error) {
      console.error("Error getting evaluation:", error);
      
      if (error instanceof Error && error.message === "Evaluation not found") {
        res.status(404).json({
          success: false,
          error: "Evaluation not found"
        });
        return;
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get evaluation",
        message: errorMessage
      });
    }
  }

  /**
   * Get evaluations by craft entity ID
   * GET /api/evaluations/entity/:entityId
   */
  static async getEvaluationsByEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;

      if (!entityId || typeof entityId !== 'string') {
        res.status(400).json({
          success: false,
          error: "Invalid entity ID"
        });
        return;
      }

      const evaluations = await EvaluationService.getEvaluationsByEntity(entityId);

      res.status(200).json({
        success: true,
        data: evaluations,
        count: evaluations.length
      });
    } catch (error) {
      console.error("Error getting entity evaluations:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get entity evaluations",
        message: errorMessage
      });
    }
  }

  /**
   * Update an evaluation
   * PUT /api/evaluations/:id
   */
  static async updateEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: "Invalid evaluation ID"
        });
        return;
      }

      const { 
        quality_score, 
        ethics_score, 
        satisfaction_score, 
        authenticity_score, 
        gi_compliance_score, 
        notes 
      } = req.body;

      const input: UpdateEvaluationInput = {
        ...(typeof quality_score === 'number' && { quality_score }),
        ...(typeof ethics_score === 'number' && { ethics_score }),
        ...(typeof satisfaction_score === 'number' && { satisfaction_score }),
        ...(typeof authenticity_score === 'number' && { authenticity_score }),
        ...(typeof gi_compliance_score === 'number' && { gi_compliance_score }),
        ...(typeof notes === 'string' && { notes })
      };

      const evaluation = await EvaluationService.updateEvaluation(id, input);

      res.status(200).json({
        success: true,
        data: evaluation,
        message: "Evaluation updated successfully"
      });
    } catch (error) {
      console.error("Error updating evaluation:", error);

      if (error instanceof Error && error.message === "Evaluation not found") {
        res.status(404).json({
          success: false,
          error: "Evaluation not found"
        });
        return;
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to update evaluation",
        message: errorMessage
      });
    }
  }

  /**
   * Delete an evaluation
   * DELETE /api/evaluations/:id
   */
  static async deleteEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: "Invalid evaluation ID"
        });
        return;
      }

      await EvaluationService.deleteEvaluation(id);

      res.status(200).json({
        success: true,
        message: "Evaluation deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting evaluation:", error);

      if (error instanceof Error && error.message === "Evaluation not found") {
        res.status(404).json({
          success: false,
          error: "Evaluation not found"
        });
        return;
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to delete evaluation",
        message: errorMessage
      });
    }
  }

  /**
   * Get entity statistics (average scores and all evaluations)
   * GET /api/evaluations/entity/:entityId/statistics
   */
  static async getEntityStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;

      if (!entityId || typeof entityId !== 'string') {
        res.status(400).json({
          success: false,
          error: "Invalid entity ID"
        });
        return;
      }

      const statistics = await EvaluationService.getEntityStatistics(entityId);

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error("Error getting entity statistics:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get entity statistics",
        message: errorMessage
      });
    }
  }

  /**
   * Get top performing entities
   * GET /api/evaluations/top?limit=10&year=2025
   */
  static async getTopPerformers(req: Request, res: Response): Promise<void> {
    try {
      const limitQuery = req.query.limit;
      const yearQuery = req.query.year;

      const limit = limitQuery && typeof limitQuery === 'string' ? parseInt(limitQuery, 10) : 10;
      const year = yearQuery && typeof yearQuery === 'string' ? parseInt(yearQuery, 10) : undefined;

      const topPerformers = await EvaluationService.getTopPerformers(limit, year);

      res.status(200).json({
        success: true,
        data: topPerformers,
        count: topPerformers.length
      });
    } catch (error) {
      console.error("Error getting top performers:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get top performers",
        message: errorMessage
      });
    }
  }

  /**
   * Get yearly summary statistics
   * GET /api/evaluations/summary/:year
   */
  static async getYearlySummary(req: Request, res: Response): Promise<void> {
    try {
      const { year } = req.params;

      if (!year || typeof year !== 'string') {
        res.status(400).json({
          success: false,
          error: "Year parameter is required"
        });
        return;
      }

      const yearNum = parseInt(year, 10);

      if (isNaN(yearNum)) {
        res.status(400).json({
          success: false,
          error: "Invalid year parameter"
        });
        return;
      }

      const summary = await EvaluationService.getYearlySummary(yearNum);

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error("Error getting yearly summary:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to get yearly summary",
        message: errorMessage
      });
    }
  }

  /**
   * Check if entity has evaluations
   * GET /api/evaluations/entity/:entityId/exists
   */
  static async checkEntityHasEvaluations(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;

      if (!entityId || typeof entityId !== 'string') {
        res.status(400).json({
          success: false,
          error: "Invalid entity ID"
        });
        return;
      }

      const hasEvaluations = await EvaluationService.hasEvaluations(entityId);
      const count = await EvaluationService.getEvaluationCount(entityId);

      res.status(200).json({
        success: true,
        data: {
          has_evaluations: hasEvaluations,
          evaluation_count: count
        }
      });
    } catch (error) {
      console.error("Error checking entity evaluations:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to check entity evaluations",
        message: errorMessage
      });
    }
  }
}

export default EvaluationController;