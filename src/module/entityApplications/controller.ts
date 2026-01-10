import type { Request, Response, NextFunction } from "express";
import CraftEntityService from "./service.ts";
import type { EntityStatus, EntityType } from "./model.ts";

class CraftEntityController {
  /**
   * Create a new craft entity
   * POST /api/entities
   */
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await CraftEntityService.createEntity(req.body);

      if (result.status === "ERROR") {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get entity by ID (basic info without evaluations)
   * GET /api/entities/:id
   */
  static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ 
          success: false,
          message: "Entity ID is required" 
        });
        return;
      }

      const entity = await CraftEntityService.getEntityById(id);

      if (!entity) {
        res.status(404).json({ 
          success: false,
          message: "Craft entity not found" 
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: entity
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get entity by ID with evaluation scores (for admin detail view)
   * GET /api/admin/entities/:id
   */
  static async getByIdWithEvaluation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ 
          success: false,
          message: "Entity ID is required" 
        });
        return;
      }

      const entity = await CraftEntityService.getEntityByIdWithEvaluation(id);

      if (!entity) {
        res.status(404).json({ 
          success: false,
          message: "Craft entity not found" 
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: entity
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all entities with filters and pagination (for admin table view)
   * GET /api/admin/entities?search=...&entity_type=...&status=...&page=1&limit=10
   */
  static async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        search,
        entity_type,
        status,
        page,
        limit
      } = req.query;

      // Build filters object - only include properties that are actually defined
      const filters: any = {};
      
      if (search) filters.search = search as string;
      if (entity_type) filters.entity_type = entity_type as EntityType | 'all';
      if (status) filters.status = status as EntityStatus | 'all';
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await CraftEntityService.getAllEntities(
        Object.keys(filters).length > 0 ? filters : undefined
      );

      res.status(200).json({
        success: true,
        data: result
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update entity status
   * PUT /api/admin/entities/:id/status
   */
  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body as { status?: EntityStatus };

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Entity ID is required in URL params"
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          message: "Status is required in request body"
        });
        return;
      }

      const result = await CraftEntityService.updateEntityStatus(id, status);

      res.status(200).json({
        success: true,
        data: result,
        message: `Entity status updated to ${status}`
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete entity
   * DELETE /api/admin/entities/:id
   */
  static async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Entity ID is required"
        });
        return;
      }

      const deleted = await CraftEntityService.deleteEntity(id);

      if (!deleted) {
        res.status(500).json({
          success: false,
          message: "Failed to delete entity"
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Entity deleted successfully"
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export default CraftEntityController;