import type { Request, Response } from "express";
import GICraftService from "./service.ts";

class GICraftController {
  /**
   * GET /api/gi-crafts
   * Get all crafts with optional filters
   */
  static async getAllCrafts(req: Request, res: Response): Promise<Response> {
    try {
      const filters = {
        search: req.query.search as string,
        category: req.query.category as string,
      };

      const result = await GICraftService.getAllCrafts(filters);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in getAllCrafts controller:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch crafts",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/gi-crafts/:identifier
   * Get a single craft by ID or slug
   */
  static async getCraftByIdentifier(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const identifier = req.params.identifier as string;

      // Check if identifier is a number (ID) or string (slug)
      const isNumeric = /^\d+$/.test(identifier);

      let result;
      if (isNumeric) {
        const id = parseInt(identifier, 10);
        result = await GICraftService.getCraftById(id);
      } else {
        result = await GICraftService.getCraftBySlug(identifier);
      }

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in getCraftByIdentifier controller:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch craft",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/gi-crafts/categories
   * Get all unique categories
   */
  static async getAllCategories(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const result = await GICraftService.getAllCategories();

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in getAllCategories controller:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/gi-crafts/:id
   * Delete a craft by ID
   */
  static async deleteCraftById(req: Request, res: Response): Promise<Response> {
    console.log("DELETE controller hit with ID:", req.params.id);

    try {
      const idParam = req.params.id;

      if (!idParam) {
        return res
          .status(400)
          .json({ success: false, message: "Craft ID parameter is required" });
      }

      const id = parseInt(idParam, 10);

      if (Number.isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid craft ID" });
      }

      const result = await GICraftService.deleteCraftById(id);

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ success: false, message: error.message });
      }
      return res
        .status(500)
        .json({ success: false, message: "Unknown server error" });
    }
  }

    /**
   * POST /api/gi-crafts
   * Create or update a GI craft
   */
  static async upsertCraft(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body;

      if (!payload || !payload.name || !payload.gi_application_number) {
        return res.status(400).json({
          success: false,
          message: "Required fields are missing",
        });
      }

      const result = await GICraftService.upsertCraft(payload);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // created → 201, updated → 200
      const statusCode =
        result.data?.operation_status === "created" ? 201 : 200;

      return res.status(statusCode).json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error in upsertCraft controller:", error.message);
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unknown server error",
      });
    }
  }

    /**
   * GET /api/gi-crafts/details
   * Get all GI crafts with full details (no filters)
   *
   * Query data:
   * SELECT * FROM get_details_gi_products();
   */
  static async getAllCraftDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const result = await GICraftService.getAllCraftDetails();

      return res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error in getAllCraftDetails controller:", error.message);
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unknown server error",
      });
    }
  }
}

export default GICraftController;
