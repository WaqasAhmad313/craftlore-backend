import { randomUUID } from "crypto";
import CRVASModel from "./model.ts";
import type {
  RiskCategory,
  Assessment,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateIndicatorInput,
  UpdateIndicatorInput,
  CreateDataPointInput,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  Indicator,
  DataPoint,
} from "./model.ts";

export class CRVASService {

  /* ===========================
     PUBLIC
  =========================== */

  static async getDashboardData(): Promise<{
    categories: RiskCategory[];
    assessment: Assessment | null;
  }> {
    const [categories, assessment] = await Promise.all([
      CRVASModel.getAllActiveCategories(),
      CRVASModel.getLatestPublishedAssessment(),
    ]);

    return { categories, assessment };
  }

  static async getCategoryBySlug(slug: string): Promise<RiskCategory> {
    const category = await CRVASModel.getCategoryBySlug(slug);

    if (!category) {
      throw new Error(`Risk category "${slug}" not found`);
    }

    // Filter to only active indicators for public view
    category.indicators = (category.indicators ?? []).filter(
      (i) => i.is_active === true
    );

    return category;
  }

  /* ===========================
     ADMIN: CATEGORIES
  =========================== */

  static async createCategory(payload: CreateCategoryInput): Promise<RiskCategory> {
    if (!payload.name?.trim()) throw new Error("Category name is required");
    if (!payload.slug?.trim()) throw new Error("Category slug is required");

    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(payload.slug)) {
      throw new Error("Slug must be lowercase letters, numbers, and hyphens only");
    }

    return CRVASModel.createCategory(payload);
  }

  static async getAllCategories(): Promise<RiskCategory[]> {
    return CRVASModel.getAllCategories();
  }

  static async getCategoryById(id: number): Promise<RiskCategory> {
    const category = await CRVASModel.getCategoryById(id);
    if (!category) throw new Error(`Category with id "${id}" not found`);
    return category;
  }

  static async updateCategory(id: number, payload: UpdateCategoryInput): Promise<RiskCategory> {
    if (payload.slug !== undefined) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(payload.slug)) {
        throw new Error("Slug must be lowercase letters, numbers, and hyphens only");
      }
    }

    const updated = await CRVASModel.updateCategory(id, payload);
    if (!updated) throw new Error(`Category with id "${id}" not found`);
    return updated;
  }

  static async deleteCategory(id: number): Promise<void> {
    const deleted = await CRVASModel.deleteCategory(id);
    if (!deleted) throw new Error(`Category with id "${id}" not found`);
  }

  /* ===========================
     ADMIN: INDICATORS
  =========================== */

  static async addIndicator(categoryId: number, payload: CreateIndicatorInput): Promise<RiskCategory> {
    if (!payload.name?.trim()) throw new Error("Indicator name is required");

    // Ensure category exists first
    await this.getCategoryById(categoryId);

    const newIndicator: Indicator = {
      id: randomUUID(),
      name: payload.name.trim(),
      description: payload.description ?? null,
      unit: payload.unit ?? null,
      is_active: payload.is_active ?? true,
      display_order: payload.display_order ?? 0,
      data: payload.data ?? [],
    };

    const updated = await CRVASModel.addIndicator(categoryId, newIndicator);
    if (!updated) throw new Error("Failed to add indicator");
    return updated;
  }

  static async updateIndicator(
    categoryId: number,
    indicatorId: string,
    payload: UpdateIndicatorInput
  ): Promise<RiskCategory> {
    const updated = await CRVASModel.updateIndicator(categoryId, indicatorId, payload);
    if (!updated) throw new Error(`Indicator "${indicatorId}" not found in category "${categoryId}"`);
    return updated;
  }

  static async deleteIndicator(categoryId: number, indicatorId: string): Promise<RiskCategory> {
    const updated = await CRVASModel.deleteIndicator(categoryId, indicatorId);
    if (!updated) throw new Error(`Indicator "${indicatorId}" not found in category "${categoryId}"`);
    return updated;
  }

  /* ===========================
     ADMIN: DATA POINTS
  =========================== */

  static async addDataPoint(
    categoryId: number,
    indicatorId: string,
    payload: CreateDataPointInput
  ): Promise<RiskCategory> {
    if (!payload.time_period?.trim()) throw new Error("time_period is required");
    if (payload.value === undefined || payload.value === null) throw new Error("value is required");
    if (!payload.risk_level) throw new Error("risk_level is required");

    const validLevels = ["low", "medium", "high", "critical"];
    if (!validLevels.includes(payload.risk_level)) {
      throw new Error(`risk_level must be one of: ${validLevels.join(", ")}`);
    }

    const dataPoint: DataPoint = {
      time_period: payload.time_period.trim(),
      value: Number(payload.value),
      risk_level: payload.risk_level,
      notes: payload.notes ?? null,
    };

    const updated = await CRVASModel.addDataPoint(categoryId, indicatorId, dataPoint);
    if (!updated) throw new Error(`Indicator "${indicatorId}" not found in category "${categoryId}"`);
    return updated;
  }

  static async updateDataPoint(
    categoryId: number,
    indicatorId: string,
    timePeriod: string,
    payload: Partial<DataPoint>
  ): Promise<RiskCategory> {
    const updated = await CRVASModel.updateDataPoint(categoryId, indicatorId, timePeriod, payload);
    if (!updated) throw new Error(`Data point "${timePeriod}" not found`);
    return updated;
  }

  static async deleteDataPoint(
    categoryId: number,
    indicatorId: string,
    timePeriod: string
  ): Promise<RiskCategory> {
    const updated = await CRVASModel.deleteDataPoint(categoryId, indicatorId, timePeriod);
    if (!updated) throw new Error(`Data point "${timePeriod}" not found`);
    return updated;
  }

  /* ===========================
     ADMIN: ASSESSMENTS
  =========================== */

  static async createAssessment(payload: CreateAssessmentInput): Promise<Assessment> {
    if (!payload.time_period?.trim()) throw new Error("time_period is required");
    return CRVASModel.createAssessment(payload);
  }

  static async getAllAssessments(): Promise<Assessment[]> {
    return CRVASModel.getAllAssessments();
  }

  static async getAssessmentById(id: number): Promise<Assessment> {
    const assessment = await CRVASModel.getAssessmentById(id);
    if (!assessment) throw new Error(`Assessment with id "${id}" not found`);
    return assessment;
  }

  static async updateAssessment(id: number, payload: UpdateAssessmentInput): Promise<Assessment> {
    const updated = await CRVASModel.updateAssessment(id, payload);
    if (!updated) throw new Error(`Assessment with id "${id}" not found`);
    return updated;
  }

  static async deleteAssessment(id: number): Promise<void> {
    const deleted = await CRVASModel.deleteAssessment(id);
    if (!deleted) throw new Error(`Assessment with id "${id}" not found`);
  }
}