import type { Request, Response, NextFunction } from "express";
import CraftEntityService from "./service.ts";
import { GovernmentEntityUploader } from "./uploader.ts";
import type { EntityStatus, EntityType } from "./model.ts";

class CraftEntityController {
  /**
   * Create a standard entity (ARTISAN, BUSINESS, INSTITUTION_NGO)
   * POST /api/entities
   * Content-Type: application/json
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a government entity with document uploads
   * POST /api/entities/government
   * Content-Type: multipart/form-data
   *
   * Form fields:
   *   - data: JSON string of the entity payload (everything except files)
   *   - authorization_letter: file (optional)
   *   - accreditation_certificates: file(s) (optional)
   *   - appointment_orders: file(s) (optional)
   *   - registration_documents: file(s) (optional)
   */
  static async createGovernment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Parse the JSON payload sent as a form field named "data"
      let parsedData: Record<string, unknown>;
      try {
        parsedData = JSON.parse(req.body.data as string);
      } catch {
        res.status(400).json({
          id: null,
          reference_id: null,
          status: "ERROR",
          message: "Invalid JSON in 'data' field",
        });
        return;
      }

      // Upload documents to Cloudinary if any files were attached
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const documents = await GovernmentEntityUploader.upload(files);

      const payload = {
        ...parsedData,
        entity_type: "GOVERNMENT_POLICY_INSTITUTION" as const,
        documents: documents ?? null,
        status: "pending" as const,
      };

      const result = await CraftEntityService.createEntity(payload as any);

      if (result.status === "ERROR") {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
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
        res.status(400).json({ success: false, message: "Entity ID is required" });
        return;
      }
      const entity = await CraftEntityService.getEntityById(id);
      if (!entity) {
        res.status(404).json({ success: false, message: "Craft entity not found" });
        return;
      }
      res.status(200).json({ success: true, data: entity });
    } catch (error) {
      next(error);
    }
  }

  /**
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
        res.status(400).json({ success: false, message: "Entity ID is required" });
        return;
      }
      const entity = await CraftEntityService.getEntityByIdWithEvaluation(id);
      if (!entity) {
        res.status(404).json({ success: false, message: "Craft entity not found" });
        return;
      }
      res.status(200).json({ success: true, data: entity });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/entities
   */
  static async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { search, entity_type, status, page, limit } = req.query;
      const filters: Record<string, unknown> = {};
      if (search) filters.search = search as string;
      if (entity_type) filters.entity_type = entity_type as EntityType | "all";
      if (status) filters.status = status as EntityStatus | "all";
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await CraftEntityService.getAllEntities(
        Object.keys(filters).length > 0 ? (filters as any) : undefined
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
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
        res.status(400).json({ success: false, message: "Entity ID is required in URL params" });
        return;
      }
      if (!status) {
        res.status(400).json({ success: false, message: "Status is required in request body" });
        return;
      }
      const result = await CraftEntityService.updateEntityStatus(id, status);
      res.status(200).json({ success: true, data: result, message: `Entity status updated to ${status}` });
    } catch (error) {
      next(error);
    }
  }

  /**
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
        res.status(400).json({ success: false, message: "Entity ID is required" });
        return;
      }
      const deleted = await CraftEntityService.deleteEntity(id);
      if (!deleted) {
        res.status(500).json({ success: false, message: "Failed to delete entity" });
        return;
      }
      res.status(200).json({ success: true, message: "Entity deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default CraftEntityController;