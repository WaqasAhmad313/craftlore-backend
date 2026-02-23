import CsemeModel from "./model.ts";
import type {
  CreateCraftInput,
  UpdateCraftInput,
  CreateDatasetInput,
  CreateEconDataInput,
  UpdateEconDataInput,
  Craft,
  Dataset,
  EconData,
  EconDataWithCraft,
  DashboardSummary,
  DataStatus,
} from "./model.ts";

export class CsemeService {
  /* -------- VALIDATION HELPERS -------- */

  private static validateFyLabel(fyLabel: string): boolean {
    // expects format like "2024-25" or "2024-2025"
    return /^\d{4}-\d{2,4}$/.test(fyLabel);
  }

  private static validateNonNegative(value: number, fieldName: string): void {
    if (value < 0) {
      throw new Error(`${fieldName} cannot be negative`);
    }
  }

  private static validateProductionExportRatio(
    productionCr: number,
    exportCr: number
  ): void {
    if (exportCr > productionCr) {
      throw new Error(
        "Export value cannot be greater than production value"
      );
    }
  }

  /* -------- CRAFTS -------- */

  static async createCraft(payload: CreateCraftInput): Promise<Craft> {
    if (!payload.name?.trim()) {
      throw new Error("Craft name is required");
    }
    if (!payload.craft_key?.trim()) {
      throw new Error("Craft key is required");
    }
    if (!/^[a-z0-9_]+$/.test(payload.craft_key)) {
      throw new Error(
        "Craft key must be lowercase letters, numbers, or underscores only"
      );
    }

    // Check for duplicate craft_key
    const existing = await CsemeModel.getCraftByKey(payload.craft_key);
    if (existing) {
      throw new Error(`Craft with key "${payload.craft_key}" already exists`);
    }

    // Validate hscode_data fields
    if (!payload.hscode_data.hs_code?.trim()) {
      throw new Error("HS code is required");
    }
    if (!payload.hscode_data.description?.trim()) {
      throw new Error("HS code description is required");
    }
    if (
      !payload.hscode_data.export_markets ||
      payload.hscode_data.export_markets.length === 0
    ) {
      throw new Error("At least one export market is required");
    }

    // Validate window_data fields
    if (
      !payload.window_data.production_months ||
      payload.window_data.production_months.length === 0
    ) {
      throw new Error("At least one production month is required");
    }
    if (!payload.window_data.peak_season?.trim()) {
      throw new Error("Peak season is required");
    }
    if (
      payload.window_data.seasonal_factor < 0 ||
      payload.window_data.seasonal_factor > 1
    ) {
      throw new Error("Seasonal factor must be between 0 and 1");
    }

    return CsemeModel.createCraft({
      ...payload,
      name: payload.name.trim(),
      craft_key: payload.craft_key.trim(),
    });
  }

  static async getCraftById(id: string): Promise<Craft | null> {
    return CsemeModel.getCraftById(id);
  }

  static async getAllCrafts(): Promise<Craft[]> {
    return CsemeModel.getAllCrafts();
  }

  static async updateCraft(
    id: string,
    payload: UpdateCraftInput
  ): Promise<Craft | null> {
    const existing = await CsemeModel.getCraftById(id);
    if (!existing) {
      throw new Error("Craft not found");
    }

    if (payload.name !== undefined && !payload.name.trim()) {
      throw new Error("Craft name cannot be empty");
    }
    if (payload.craft_key !== undefined) {
      if (!payload.craft_key.trim()) {
        throw new Error("Craft key cannot be empty");
      }
      if (!/^[a-z0-9_]+$/.test(payload.craft_key)) {
        throw new Error(
          "Craft key must be lowercase letters, numbers, or underscores only"
        );
      }
      // Check key conflict only if it's changing
      if (payload.craft_key !== existing.craft_key) {
        const conflict = await CsemeModel.getCraftByKey(payload.craft_key);
        if (conflict) {
          throw new Error(
            `Craft with key "${payload.craft_key}" already exists`
          );
        }
      }
    }
    if (
      payload.window_data?.seasonal_factor !== undefined &&
      (payload.window_data.seasonal_factor < 0 ||
        payload.window_data.seasonal_factor > 1)
    ) {
      throw new Error("Seasonal factor must be between 0 and 1");
    }

    return CsemeModel.updateCraft(id, payload);
  }

  static async deleteCraft(id: string): Promise<boolean> {
    const existing = await CsemeModel.getCraftById(id);
    if (!existing) {
      throw new Error("Craft not found");
    }
    return CsemeModel.deleteCraft(id);
  }

  /* -------- DATASETS -------- */

  static async createDataset(payload: CreateDatasetInput): Promise<Dataset> {
    if (!payload.title?.trim()) {
      throw new Error("Dataset title is required");
    }
    return CsemeModel.createDataset({ title: payload.title.trim() });
  }

  static async getDatasetById(id: string): Promise<Dataset | null> {
    return CsemeModel.getDatasetById(id);
  }

  static async getAllDatasets(): Promise<Dataset[]> {
    return CsemeModel.getAllDatasets();
  }

  static async getPublishedDataset(): Promise<Dataset | null> {
    return CsemeModel.getPublishedDataset();
  }

  static async publishDataset(id: string): Promise<Dataset | null> {
    const existing = await CsemeModel.getDatasetById(id);
    if (!existing) {
      throw new Error("Dataset not found");
    }
    if (existing.status === "published") {
      throw new Error("Dataset is already published");
    }

    // Check that dataset has at least some econ data before publishing
    const fyLabels = await CsemeModel.getAvailableFyLabels(id);
    if (fyLabels.length === 0) {
      throw new Error(
        "Cannot publish an empty dataset. Add economic data first."
      );
    }

    return CsemeModel.publishDataset(id);
  }

  static async deleteDataset(id: string): Promise<boolean> {
    const existing = await CsemeModel.getDatasetById(id);
    if (!existing) {
      throw new Error("Dataset not found");
    }
    if (existing.status === "published") {
      throw new Error(
        "Cannot delete a published dataset. It is currently live."
      );
    }
    return CsemeModel.deleteDataset(id);
  }

  /* -------- ECON DATA -------- */

  static async createEconData(payload: CreateEconDataInput): Promise<EconData> {
    // Validate dataset exists
    const dataset = await CsemeModel.getDatasetById(payload.dataset_id);
    if (!dataset) {
      throw new Error("Dataset not found");
    }
    if (dataset.status === "published") {
      throw new Error("Cannot add data to a published dataset");
    }

    // Validate craft exists
    const craft = await CsemeModel.getCraftById(payload.craft_id);
    if (!craft) {
      throw new Error("Craft not found");
    }

    // Validate fy_label format
    if (!this.validateFyLabel(payload.fy_label)) {
      throw new Error(
        "Invalid financial year format. Use format like 2024-25 or 2024-2025"
      );
    }

    // Validate numeric values
    this.validateNonNegative(payload.production_cr, "Production value");
    this.validateNonNegative(payload.export_cr, "Export value");
    this.validateNonNegative(payload.total_employment, "Total employment");
    this.validateProductionExportRatio(
      payload.production_cr,
      payload.export_cr
    );

    // Check for duplicate
    const isDuplicate = await CsemeModel.checkDuplicateEconData(
      payload.dataset_id,
      payload.craft_id,
      payload.fy_label
    );
    if (isDuplicate) {
      throw new Error(
        `Data for this craft and year (${payload.fy_label}) already exists in this dataset`
      );
    }

    return CsemeModel.createEconData(payload);
  }

  static async getEconDataById(id: string): Promise<EconData | null> {
    return CsemeModel.getEconDataById(id);
  }

  static async getEconDataByDataset(
    datasetId: string
  ): Promise<EconDataWithCraft[]> {
    const dataset = await CsemeModel.getDatasetById(datasetId);
    if (!dataset) {
      throw new Error("Dataset not found");
    }
    return CsemeModel.getEconDataByDataset(datasetId);
  }

  static async getEconDataByCraftAndDataset(
    craftId: string,
    datasetId: string
  ): Promise<EconData[]> {
    const craft = await CsemeModel.getCraftById(craftId);
    if (!craft) {
      throw new Error("Craft not found");
    }
    const dataset = await CsemeModel.getDatasetById(datasetId);
    if (!dataset) {
      throw new Error("Dataset not found");
    }
    return CsemeModel.getEconDataByCraftAndDataset(craftId, datasetId);
  }

  static async updateEconData(
    id: string,
    payload: UpdateEconDataInput
  ): Promise<EconData | null> {
    const existing = await CsemeModel.getEconDataById(id);
    if (!existing) {
      throw new Error("Economic data record not found");
    }

    // Prevent editing data in a published dataset
    const dataset = await CsemeModel.getDatasetById(existing.dataset_id);
    if (dataset?.status === "published") {
      throw new Error("Cannot edit data in a published dataset");
    }

    // Use existing values for ratio validation if only one side is being updated
    const newProduction = payload.production_cr ?? existing.production_cr;
    const newExport = payload.export_cr ?? existing.export_cr;

    if (payload.production_cr !== undefined) {
      this.validateNonNegative(payload.production_cr, "Production value");
    }
    if (payload.export_cr !== undefined) {
      this.validateNonNegative(payload.export_cr, "Export value");
    }
    if (payload.total_employment !== undefined) {
      this.validateNonNegative(payload.total_employment, "Total employment");
    }

    this.validateProductionExportRatio(newProduction, newExport);

    return CsemeModel.updateEconData(id, payload);
  }

  static async deleteEconData(id: string): Promise<boolean> {
    const existing = await CsemeModel.getEconDataById(id);
    if (!existing) {
      throw new Error("Economic data record not found");
    }
    const dataset = await CsemeModel.getDatasetById(existing.dataset_id);
    if (dataset?.status === "published") {
      throw new Error("Cannot delete data from a published dataset");
    }
    return CsemeModel.deleteEconData(id);
  }

  /* -------- DASHBOARD -------- */

  static async getDashboardSummary(fyLabel?: string): Promise<DashboardSummary[]> {
    const dataset = await CsemeModel.getPublishedDataset();
    if (!dataset) {
      throw new Error("No published dataset available");
    }

    // If no fy_label provided, use the latest available one
    let targetFy = fyLabel;
    if (!targetFy) {
      const fyLabels = await CsemeModel.getAvailableFyLabels(dataset.id);
      if (fyLabels.length === 0) {
        throw new Error("No data available in published dataset");
      }
      targetFy = fyLabels[fyLabels.length - 1]!;
    }

    return CsemeModel.getDashboardSummary(dataset.id, targetFy);
  }

  static async getPublishedEconData(): Promise<EconDataWithCraft[]> {
    const dataset = await CsemeModel.getPublishedDataset();
    if (!dataset) {
      throw new Error("No published dataset available");
    }
    return CsemeModel.getEconDataByDataset(dataset.id);
  }

  static async getAvailableFyLabels(): Promise<string[]> {
    const dataset = await CsemeModel.getPublishedDataset();
    if (!dataset) {
      throw new Error("No published dataset available");
    }
    return CsemeModel.getAvailableFyLabels(dataset.id);
  }
}