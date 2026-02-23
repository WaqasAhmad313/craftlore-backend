import type { Request, Response } from "express";
import { CsemeService } from "./service.ts";
import type {
  CreateCraftInput,
  UpdateCraftInput,
  CreateDatasetInput,
  CreateEconDataInput,
  UpdateEconDataInput,
} from "./model.ts";

/* ===== RESPONSE HELPER ===== */

class ResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      ...(message && { message }),
    });
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 400
  ): Response {
    return res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
}

export class CsemeController {
  /* -------- CRAFTS -------- */

  static async createCraft(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateCraftInput;
      const craft = await CsemeService.createCraft(payload);
      return ResponseHandler.success(res, craft, "Craft created successfully", 201);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getCraft(req: Request, res: Response): Promise<Response> {
    try {
      const { craftId } = req.params;
      if (!craftId) {
        return ResponseHandler.error(res, "Craft ID is required", 400);
      }
      const craft = await CsemeService.getCraftById(craftId);
      if (!craft) {
        return ResponseHandler.error(res, "Craft not found", 404);
      }
      return ResponseHandler.success(res, craft);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getAllCrafts(req: Request, res: Response): Promise<Response> {
    try {
      const crafts = await CsemeService.getAllCrafts();
      return ResponseHandler.success(res, crafts);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async updateCraft(req: Request, res: Response): Promise<Response> {
    try {
      const { craftId } = req.params;
      if (!craftId) {
        return ResponseHandler.error(res, "Craft ID is required", 400);
      }
      const payload = req.body as UpdateCraftInput;
      const craft = await CsemeService.updateCraft(craftId, payload);
      if (!craft) {
        return ResponseHandler.error(res, "Craft not found", 404);
      }
      return ResponseHandler.success(res, craft, "Craft updated successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async deleteCraft(req: Request, res: Response): Promise<Response> {
    try {
      const { craftId } = req.params;
      if (!craftId) {
        return ResponseHandler.error(res, "Craft ID is required", 400);
      }
      const deleted = await CsemeService.deleteCraft(craftId);
      if (!deleted) {
        return ResponseHandler.error(res, "Craft not found", 404);
      }
      return ResponseHandler.success(res, null, "Craft deleted successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  /* -------- DATASETS -------- */

  static async createDataset(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateDatasetInput;
      const dataset = await CsemeService.createDataset(payload);
      return ResponseHandler.success(res, dataset, "Dataset created successfully", 201);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getDataset(req: Request, res: Response): Promise<Response> {
    try {
      const { datasetId } = req.params;
      if (!datasetId) {
        return ResponseHandler.error(res, "Dataset ID is required", 400);
      }
      const dataset = await CsemeService.getDatasetById(datasetId);
      if (!dataset) {
        return ResponseHandler.error(res, "Dataset not found", 404);
      }
      return ResponseHandler.success(res, dataset);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getAllDatasets(req: Request, res: Response): Promise<Response> {
    try {
      const datasets = await CsemeService.getAllDatasets();
      return ResponseHandler.success(res, datasets);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getPublishedDataset(req: Request, res: Response): Promise<Response> {
    try {
      const dataset = await CsemeService.getPublishedDataset();
      if (!dataset) {
        return ResponseHandler.error(res, "No published dataset available", 404);
      }
      return ResponseHandler.success(res, dataset);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async publishDataset(req: Request, res: Response): Promise<Response> {
    try {
      const { datasetId } = req.params;
      if (!datasetId) {
        return ResponseHandler.error(res, "Dataset ID is required", 400);
      }
      const dataset = await CsemeService.publishDataset(datasetId);
      if (!dataset) {
        return ResponseHandler.error(res, "Dataset not found", 404);
      }
      return ResponseHandler.success(res, dataset, "Dataset published successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async deleteDataset(req: Request, res: Response): Promise<Response> {
    try {
      const { datasetId } = req.params;
      if (!datasetId) {
        return ResponseHandler.error(res, "Dataset ID is required", 400);
      }
      const deleted = await CsemeService.deleteDataset(datasetId);
      if (!deleted) {
        return ResponseHandler.error(res, "Dataset not found", 404);
      }
      return ResponseHandler.success(res, null, "Dataset deleted successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  /* -------- ECON DATA -------- */

  static async createEconData(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateEconDataInput;
      const econData = await CsemeService.createEconData(payload);
      return ResponseHandler.success(res, econData, "Economic data added successfully", 201);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getEconData(req: Request, res: Response): Promise<Response> {
    try {
      const { econId } = req.params;
      if (!econId) {
        return ResponseHandler.error(res, "Econ data ID is required", 400);
      }
      const econData = await CsemeService.getEconDataById(econId);
      if (!econData) {
        return ResponseHandler.error(res, "Economic data record not found", 404);
      }
      return ResponseHandler.success(res, econData);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getEconDataByDataset(req: Request, res: Response): Promise<Response> {
    try {
      const { datasetId } = req.params;
      if (!datasetId) {
        return ResponseHandler.error(res, "Dataset ID is required", 400);
      }
      const econData = await CsemeService.getEconDataByDataset(datasetId);
      return ResponseHandler.success(res, econData);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getEconDataByCraftAndDataset(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { craftId, datasetId } = req.params;
      if (!craftId || !datasetId) {
        return ResponseHandler.error(res, "Craft ID and Dataset ID are required", 400);
      }
      const econData = await CsemeService.getEconDataByCraftAndDataset(
        craftId,
        datasetId
      );
      return ResponseHandler.success(res, econData);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async updateEconData(req: Request, res: Response): Promise<Response> {
    try {
      const { econId } = req.params;
      if (!econId) {
        return ResponseHandler.error(res, "Econ data ID is required", 400);
      }
      const payload = req.body as UpdateEconDataInput;
      const econData = await CsemeService.updateEconData(econId, payload);
      if (!econData) {
        return ResponseHandler.error(res, "Economic data record not found", 404);
      }
      return ResponseHandler.success(res, econData, "Economic data updated successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async deleteEconData(req: Request, res: Response): Promise<Response> {
    try {
      const { econId } = req.params;
      if (!econId) {
        return ResponseHandler.error(res, "Econ data ID is required", 400);
      }
      const deleted = await CsemeService.deleteEconData(econId);
      if (!deleted) {
        return ResponseHandler.error(res, "Economic data record not found", 404);
      }
      return ResponseHandler.success(res, null, "Economic data deleted successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  /* -------- DASHBOARD -------- */

  static async getDashboardSummary(req: Request, res: Response): Promise<Response> {
    try {
      const { fy_label } = req.query;
      const summary = await CsemeService.getDashboardSummary(
        fy_label as string | undefined
      );
      return ResponseHandler.success(res, summary);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getPublishedEconData(req: Request, res: Response): Promise<Response> {
    try {
      const econData = await CsemeService.getPublishedEconData();
      return ResponseHandler.success(res, econData);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getAvailableFyLabels(req: Request, res: Response): Promise<Response> {
    try {
      const fyLabels = await CsemeService.getAvailableFyLabels();
      return ResponseHandler.success(res, fyLabels);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }
}