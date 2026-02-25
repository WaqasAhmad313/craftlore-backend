import type { Request, Response } from "express";
import { CRVASService } from "./service.ts";
import { sendSuccess, sendCreated, sendError } from "./response.ts";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateIndicatorInput,
  UpdateIndicatorInput,
  CreateDataPointInput,
  CreateAssessmentInput,
  UpdateAssessmentInput,
} from "./model.ts";

/* ===== Typed Express Params ===== */
interface CategoryIdParams { categoryId: string; }
interface CategorySlugParams { slug: string; }
interface IndicatorParams { categoryId: string; indicatorId: string; }
interface DataPointParams { categoryId: string; indicatorId: string; timePeriod: string; }
interface AssessmentIdParams { assessmentId: string; }

export class CRVASController {

  /* ===========================
     PUBLIC
  =========================== */

  static async getDashboard(req: Request, res: Response): Promise<Response> {
    try {
      const data = await CRVASService.getDashboardData();
      return sendSuccess(res, data, "Dashboard data retrieved successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async getCategoryBySlug(req: Request<CategorySlugParams>, res: Response): Promise<Response> {
    try {
      const { slug } = req.params;
      const category = await CRVASService.getCategoryBySlug(slug);
      return sendSuccess(res, category, `Category "${slug}" retrieved successfully`);
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }

  /* ===========================
     ADMIN: CATEGORIES
  =========================== */

  static async createCategory(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateCategoryInput;
      const category = await CRVASService.createCategory(payload);
      return sendCreated(res, category, "Category created successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async getAllCategories(req: Request, res: Response): Promise<Response> {
    try {
      const categories = await CRVASService.getAllCategories();
      return sendSuccess(res, categories, "Categories retrieved successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async getCategoryById(req: Request<CategoryIdParams>, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.categoryId);
      const category = await CRVASService.getCategoryById(id);
      return sendSuccess(res, category, "Category retrieved successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }

  static async updateCategory(req: Request<CategoryIdParams>, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.categoryId);
      const payload = req.body as UpdateCategoryInput;
      const category = await CRVASService.updateCategory(id, payload);
      return sendSuccess(res, category, "Category updated successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async deleteCategory(req: Request<CategoryIdParams>, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.categoryId);
      await CRVASService.deleteCategory(id);
      return sendSuccess(res, null, "Category deleted successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }

  /* ===========================
     ADMIN: INDICATORS
  =========================== */

  static async addIndicator(req: Request<CategoryIdParams>, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.categoryId);
      const payload = req.body as CreateIndicatorInput;
      const category = await CRVASService.addIndicator(id, payload);
      return sendCreated(res, category, "Indicator added successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async updateIndicator(req: Request<IndicatorParams>, res: Response): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId } = req.params;
      const payload = req.body as UpdateIndicatorInput;
      const category = await CRVASService.updateIndicator(categoryId, indicatorId, payload);
      return sendSuccess(res, category, "Indicator updated successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async deleteIndicator(req: Request<IndicatorParams>, res: Response): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId } = req.params;
      const category = await CRVASService.deleteIndicator(categoryId, indicatorId);
      return sendSuccess(res, category, "Indicator deleted successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }

  /* ===========================
     ADMIN: DATA POINTS
  =========================== */

  static async addDataPoint(req: Request<IndicatorParams>, res: Response): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId } = req.params;
      const payload = req.body as CreateDataPointInput;
      const category = await CRVASService.addDataPoint(categoryId, indicatorId, payload);
      return sendCreated(res, category, "Data point added successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async updateDataPoint(req: Request<DataPointParams>, res: Response): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId, timePeriod } = req.params;
      const category = await CRVASService.updateDataPoint(categoryId, indicatorId, timePeriod, req.body);
      return sendSuccess(res, category, "Data point updated successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async deleteDataPoint(req: Request<DataPointParams>, res: Response): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId, timePeriod } = req.params;
      const category = await CRVASService.deleteDataPoint(categoryId, indicatorId, timePeriod);
      return sendSuccess(res, category, "Data point deleted successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }

  /* ===========================
     ADMIN: ASSESSMENTS
  =========================== */

  static async createAssessment(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateAssessmentInput;
      const assessment = await CRVASService.createAssessment(payload);
      return sendCreated(res, assessment, "Assessment created successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async getAllAssessments(req: Request, res: Response): Promise<Response> {
    try {
      const assessments = await CRVASService.getAllAssessments();
      return sendSuccess(res, assessments, "Assessments retrieved successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async getAssessmentById(req: Request<AssessmentIdParams>, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.assessmentId);
      const assessment = await CRVASService.getAssessmentById(id);
      return sendSuccess(res, assessment, "Assessment retrieved successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }

  static async updateAssessment(req: Request<AssessmentIdParams>, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.assessmentId);
      const payload = req.body as UpdateAssessmentInput;
      const assessment = await CRVASService.updateAssessment(id, payload);
      return sendSuccess(res, assessment, "Assessment updated successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }

  static async deleteAssessment(req: Request<AssessmentIdParams>, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.assessmentId);
      await CRVASService.deleteAssessment(id);
      return sendSuccess(res, null, "Assessment deleted successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }
}