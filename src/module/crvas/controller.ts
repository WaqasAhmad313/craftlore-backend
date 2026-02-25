import type { Request, Response } from "express";
import { CRVASService } from "./service.ts";
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
interface CategoryIdParams {
  categoryId: string;
}

interface CategorySlugParams {
  slug: string;
}

interface IndicatorParams {
  categoryId: string;
  indicatorId: string;
}

interface DataPointParams {
  categoryId: string;
  indicatorId: string;
  timePeriod: string;
}

interface AssessmentIdParams {
  assessmentId: string;
}

export class CRVASController {

  /* ===========================
     PUBLIC
  =========================== */

  static async getDashboard(req: Request, res: Response): Promise<Response> {
    try {
      const data = await CRVASService.getDashboardData();
      return res.json(data);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getCategoryBySlug(
    req: Request<CategorySlugParams>,
    res: Response
  ): Promise<Response> {
    try {
      const { slug } = req.params;
      const category = await CRVASService.getCategoryBySlug(slug);
      return res.json(category);
    } catch (error: unknown) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }

  /* ===========================
     ADMIN: CATEGORIES
  =========================== */

  static async createCategory(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateCategoryInput;
      const category = await CRVASService.createCategory(payload);
      return res.status(201).json(category);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getAllCategories(req: Request, res: Response): Promise<Response> {
    try {
      const categories = await CRVASService.getAllCategories();
      return res.json(categories);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getCategoryById(
    req: Request<CategoryIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const id = Number(req.params.categoryId);
      const category = await CRVASService.getCategoryById(id);
      return res.json(category);
    } catch (error: unknown) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }

  static async updateCategory(
    req: Request<CategoryIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const id = Number(req.params.categoryId);
      const payload = req.body as UpdateCategoryInput;
      const category = await CRVASService.updateCategory(id, payload);
      return res.json(category);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async deleteCategory(
    req: Request<CategoryIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const id = Number(req.params.categoryId);
      await CRVASService.deleteCategory(id);
      return res.json({ message: "Category deleted successfully" });
    } catch (error: unknown) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }

  /* ===========================
     ADMIN: INDICATORS
  =========================== */

  static async addIndicator(
    req: Request<CategoryIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const id = Number(req.params.categoryId);
      const payload = req.body as CreateIndicatorInput;
      const category = await CRVASService.addIndicator(id, payload);
      return res.status(201).json(category);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async updateIndicator(
    req: Request<IndicatorParams>,
    res: Response
  ): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId } = req.params;
      const payload = req.body as UpdateIndicatorInput;
      const category = await CRVASService.updateIndicator(categoryId, indicatorId, payload);
      return res.json(category);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async deleteIndicator(
    req: Request<IndicatorParams>,
    res: Response
  ): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId } = req.params;
      const category = await CRVASService.deleteIndicator(categoryId, indicatorId);
      return res.json(category);
    } catch (error: unknown) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }

  /* ===========================
     ADMIN: DATA POINTS
  =========================== */

  static async addDataPoint(
    req: Request<IndicatorParams>,
    res: Response
  ): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId } = req.params;
      const payload = req.body as CreateDataPointInput;
      const category = await CRVASService.addDataPoint(categoryId, indicatorId, payload);
      return res.status(201).json(category);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async updateDataPoint(
    req: Request<DataPointParams>,
    res: Response
  ): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId, timePeriod } = req.params;
      const category = await CRVASService.updateDataPoint(categoryId, indicatorId, timePeriod, req.body);
      return res.json(category);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async deleteDataPoint(
    req: Request<DataPointParams>,
    res: Response
  ): Promise<Response> {
    try {
      const categoryId = Number(req.params.categoryId);
      const { indicatorId, timePeriod } = req.params;
      const category = await CRVASService.deleteDataPoint(categoryId, indicatorId, timePeriod);
      return res.json(category);
    } catch (error: unknown) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }

  /* ===========================
     ADMIN: ASSESSMENTS
  =========================== */

  static async createAssessment(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body as CreateAssessmentInput;
      const assessment = await CRVASService.createAssessment(payload);
      return res.status(201).json(assessment);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getAllAssessments(req: Request, res: Response): Promise<Response> {
    try {
      const assessments = await CRVASService.getAllAssessments();
      return res.json(assessments);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getAssessmentById(
    req: Request<AssessmentIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const id = Number(req.params.assessmentId);
      const assessment = await CRVASService.getAssessmentById(id);
      return res.json(assessment);
    } catch (error: unknown) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }

  static async updateAssessment(
    req: Request<AssessmentIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const id = Number(req.params.assessmentId);
      const payload = req.body as UpdateAssessmentInput;
      const assessment = await CRVASService.updateAssessment(id, payload);
      return res.json(assessment);
    } catch (error: unknown) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  static async deleteAssessment(
    req: Request<AssessmentIdParams>,
    res: Response
  ): Promise<Response> {
    try {
      const id = Number(req.params.assessmentId);
      await CRVASService.deleteAssessment(id);
      return res.json({ message: "Assessment deleted successfully" });
    } catch (error: unknown) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }
}