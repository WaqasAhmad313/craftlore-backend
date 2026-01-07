import type { Request, Response, NextFunction } from "express";
import CraftEntityService from "./service.ts";
import type { EntityStatus } from "./model.ts";

class CraftEntityController {
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

  static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "Entity ID is required" });
        return;
      }

      const entity = await CraftEntityService.getEntityById(id);

      if (!entity) {
        res.status(404).json({ message: "Craft entity not found" });
        return;
      }

      res.status(200).json(entity);
      return;
    } catch (error) {
      next(error);
    }
  }

  static async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = req.query.status as EntityStatus | undefined;

      if (status && !["pending", "verified", "blocked"].includes(status)) {
        res.status(400).json({ message: "Invalid status filter" });
        return;
      }

      const entities = await CraftEntityService.getAllEntities(status);

      res.status(200).json(entities);
      return;
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { reference_id, status } = req.body as {
        reference_id?: string;
        status?: EntityStatus;
      };

      if (!reference_id || !status) {
        res.status(400).json({
          message: "reference_id and status are required",
        });
        return;
      }

      const result = await CraftEntityService.updateEntityStatus(
        reference_id,
        status
      );

      res.status(200).json(result);
      return;
    } catch (error) {
      next(error);
    }
  }
}

export default CraftEntityController;
