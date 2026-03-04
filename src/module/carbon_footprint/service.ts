// =============================================================
// service.ts — Calculator Module
// All business logic. Calls models. Never touches req/res.
// =============================================================

import {
  CategoryModel,
  SubcategoryModel,
  ProductModel,
  CalculatorModel,
  CarbonFactorLibraryModel,
} from "./model.ts";
import { validateCalculatorConfig, generateSlug, round4, pgNumericToNumber } from "./helpers.ts";
import type {
  CalculatorConfig,
  CalculatorRow,
  CalculatorType,
  CarbonCalculationResult,
  CarbonFactorLibraryRow,
  CategoryRow,
  BreakdownItem,
  CalculationResult,
  CalculatorConfigResponse,
  ConfidenceLevel,
  CreateCarbonFactorInput,
  CreateCalculatorInput,
  CreateCategoryInput,
  CreateProductInput,
  CreateSubcategoryInput,
  FieldOption,
  PaginatedResult,
  PaginationParams,
  Placement,
  PlacementResult,
  ProductRow,
  ScoreCalculationResult,
  SubcategoryRow,
  UpdateCarbonFactorInput,
  UpdateCalculatorInput,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateSubcategoryInput,
  UserCalculationInput,
} from "./types.ts";
import { isPlainObject } from "./helpers.ts";

// =============================================================
// CategoryService
// =============================================================

export class CategoryService {
  static async create(
    input: CreateCategoryInput
  ): Promise<CategoryRow> {
    const slug = input.slug || generateSlug(input.name);

    const existing = await CategoryModel.findBySlug(slug);
    if (existing) {
      throw new Error(`A category with slug "${slug}" already exists`);
    }

    return CategoryModel.create({ ...input, slug });
  }

  static async list(
    params: PaginationParams
  ): Promise<PaginatedResult<CategoryRow>> {
    const [data, total] = await Promise.all([
      CategoryModel.findAll(params),
      CategoryModel.countAll(),
    ]);
    return { data, total, limit: params.limit, offset: params.offset };
  }

  static async getById(id: number): Promise<CategoryRow> {
    const row = await CategoryModel.findById(id);
    if (!row) throw new NotFoundError(`Category ${id} not found`);
    return row;
  }

  static async update(
    id: number,
    input: UpdateCategoryInput
  ): Promise<CategoryRow> {
    await CategoryService.getById(id); // ensure exists

    if (input.slug) {
      const existing = await CategoryModel.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new Error(`Slug "${input.slug}" is already in use`);
      }
    }

    const updated = await CategoryModel.update(id, input);
    if (!updated) throw new NotFoundError(`Category ${id} not found`);
    return updated;
  }

  static async delete(id: number): Promise<void> {
    await CategoryService.getById(id); // ensure exists
    await CategoryModel.delete(id);
  }
}

// =============================================================
// SubcategoryService
// =============================================================

export class SubcategoryService {
  static async create(
    input: CreateSubcategoryInput
  ): Promise<SubcategoryRow> {
    // ensure parent exists
    const parent = await CategoryModel.findById(input.category_id);
    if (!parent) {
      throw new NotFoundError(`Category ${input.category_id} not found`);
    }

    const slug = input.slug || generateSlug(input.name);
    const existing = await SubcategoryModel.findBySlug(slug);
    if (existing) {
      throw new Error(`A subcategory with slug "${slug}" already exists`);
    }

    return SubcategoryModel.create({ ...input, slug });
  }

  static async listByCategoryId(
    categoryId: number,
    params: PaginationParams
  ): Promise<PaginatedResult<SubcategoryRow>> {
    const [data, total] = await Promise.all([
      SubcategoryModel.findByCategoryId(categoryId, params),
      SubcategoryModel.countByCategoryId(categoryId),
    ]);
    return { data, total, limit: params.limit, offset: params.offset };
  }

  static async getById(id: number): Promise<SubcategoryRow> {
    const row = await SubcategoryModel.findById(id);
    if (!row) throw new NotFoundError(`Subcategory ${id} not found`);
    return row;
  }

  static async update(
    id: number,
    input: UpdateSubcategoryInput
  ): Promise<SubcategoryRow> {
    await SubcategoryService.getById(id);

    if (input.slug) {
      const existing = await SubcategoryModel.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new Error(`Slug "${input.slug}" is already in use`);
      }
    }

    const updated = await SubcategoryModel.update(id, input);
    if (!updated) throw new NotFoundError(`Subcategory ${id} not found`);
    return updated;
  }

  static async delete(id: number): Promise<void> {
    await SubcategoryService.getById(id);
    await SubcategoryModel.delete(id);
  }
}

// =============================================================
// ProductService
// =============================================================

export class ProductService {
  static async create(input: CreateProductInput): Promise<ProductRow> {
    const parent = await SubcategoryModel.findById(input.subcategory_id);
    if (!parent) {
      throw new NotFoundError(`Subcategory ${input.subcategory_id} not found`);
    }

    const slug = input.slug || generateSlug(input.name);
    const existing = await ProductModel.findBySlug(slug);
    if (existing) {
      throw new Error(`A product with slug "${slug}" already exists`);
    }

    return ProductModel.create({ ...input, slug });
  }

  static async listBySubcategoryId(
    subcategoryId: number,
    params: PaginationParams
  ): Promise<PaginatedResult<ProductRow>> {
    const [data, total] = await Promise.all([
      ProductModel.findBySubcategoryId(subcategoryId, params),
      ProductModel.countBySubcategoryId(subcategoryId),
    ]);
    return { data, total, limit: params.limit, offset: params.offset };
  }

  static async getById(id: number): Promise<ProductRow> {
    const row = await ProductModel.findById(id);
    if (!row) throw new NotFoundError(`Product ${id} not found`);
    return row;
  }

  static async update(
    id: number,
    input: UpdateProductInput
  ): Promise<ProductRow> {
    await ProductService.getById(id);

    if (input.slug) {
      const existing = await ProductModel.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new Error(`Slug "${input.slug}" is already in use`);
      }
    }

    const updated = await ProductModel.update(id, input);
    if (!updated) throw new NotFoundError(`Product ${id} not found`);
    return updated;
  }

  static async delete(id: number): Promise<void> {
    await ProductService.getById(id);
    await ProductModel.delete(id);
  }
}

// =============================================================
// CalculatorService
// =============================================================

export class CalculatorService {
  static async create(input: CreateCalculatorInput): Promise<CalculatorRow> {
    const product = await ProductModel.findById(input.product_id);
    if (!product) {
      throw new NotFoundError(`Product ${input.product_id} not found`);
    }

    // one calculator per type per product
    const existing = await CalculatorModel.findByProductIdAndType(
      input.product_id,
      input.type
    );
    if (existing) {
      throw new Error(
        `A ${input.type} calculator already exists for product ${input.product_id}`
      );
    }

    const validation = validateCalculatorConfig(input.config);
    if (!validation.valid) {
      throw new ValidationError("Invalid calculator config", validation.errors);
    }

    return CalculatorModel.create({
      ...input,
      config: validation.config!,
    });
  }

  static async listByProductId(productId: number): Promise<CalculatorRow[]> {
    const product = await ProductModel.findById(productId);
    if (!product) throw new NotFoundError(`Product ${productId} not found`);
    return CalculatorModel.findByProductId(productId);
  }

  static async getById(id: number): Promise<CalculatorRow> {
    const row = await CalculatorModel.findById(id);
    if (!row) throw new NotFoundError(`Calculator ${id} not found`);
    return row;
  }

  static async update(
    id: number,
    input: UpdateCalculatorInput
  ): Promise<CalculatorRow> {
    await CalculatorService.getById(id);

    if (input.config !== undefined) {
      const validation = validateCalculatorConfig(input.config);
      if (!validation.valid) {
        throw new ValidationError("Invalid calculator config", validation.errors);
      }
      input.config = validation.config!;
    }

    const updated = await CalculatorModel.update(id, input);
    if (!updated) throw new NotFoundError(`Calculator ${id} not found`);
    return updated;
  }

  // Patch only the fields array inside config
  static async patchFields(
    id: number,
    fields: unknown
  ): Promise<CalculatorRow> {
    const calc = await CalculatorService.getById(id);
    const existingConfig = parseConfig(calc.config);

    const validation = validateCalculatorConfig({ ...existingConfig, fields });
    if (!validation.valid) {
      throw new ValidationError("Invalid fields config", validation.errors);
    }

    const updated = await CalculatorModel.patchConfig(id, {
      fields: validation.config!.fields,
    });
    if (!updated) throw new NotFoundError(`Calculator ${id} not found`);
    return updated;
  }

  // Patch only the formula inside config
  static async patchFormula(
    id: number,
    formula: unknown
  ): Promise<CalculatorRow> {
    const calc = await CalculatorService.getById(id);
    if (calc.type !== "carbon") {
      throw new Error("Formula config only applies to carbon calculators");
    }

    const existingConfig = parseConfig(calc.config);
    const validation = validateCalculatorConfig({ ...existingConfig, formula });
    if (!validation.valid) {
      throw new ValidationError("Invalid formula config", validation.errors);
    }

    const updated = await CalculatorModel.patchConfig(id, {
      formula: validation.config!.formula,
    });
    if (!updated) throw new NotFoundError(`Calculator ${id} not found`);
    return updated;
  }

  // Patch only the placements array inside config
  static async patchPlacements(
    id: number,
    placements: unknown
  ): Promise<CalculatorRow> {
    const calc = await CalculatorService.getById(id);
    if (calc.type !== "carbon") {
      throw new Error("Placements only apply to carbon calculators");
    }

    const existingConfig = parseConfig(calc.config);
    const validation = validateCalculatorConfig({
      ...existingConfig,
      placements,
    });
    if (!validation.valid) {
      throw new ValidationError("Invalid placements config", validation.errors);
    }

    const updated = await CalculatorModel.patchConfig(id, {
      placements: validation.config!.placements,
    });
    if (!updated) throw new NotFoundError(`Calculator ${id} not found`);
    return updated;
  }

  static async delete(id: number): Promise<void> {
    await CalculatorService.getById(id);
    await CalculatorModel.delete(id);
  }
}

// =============================================================
// CarbonFactorLibraryService
// =============================================================

export class CarbonFactorLibraryService {
  static async create(
    input: CreateCarbonFactorInput
  ): Promise<CarbonFactorLibraryRow> {
    return CarbonFactorLibraryModel.create(input);
  }

  static async list(params: {
    category?: string;
    is_active?: boolean;
    search?: string;
    limit: number;
    offset: number;
  }): Promise<PaginatedResult<CarbonFactorLibraryRow>> {
    const [data, total] = await Promise.all([
      CarbonFactorLibraryModel.findAll(params),
      CarbonFactorLibraryModel.countAll(params),
    ]);
    return { data, total, limit: params.limit, offset: params.offset };
  }

  static async getById(id: number): Promise<CarbonFactorLibraryRow> {
    const row = await CarbonFactorLibraryModel.findById(id);
    if (!row) throw new NotFoundError(`Carbon factor ${id} not found`);
    return row;
  }

  static async update(
    id: number,
    input: UpdateCarbonFactorInput
  ): Promise<CarbonFactorLibraryRow> {
    await CarbonFactorLibraryService.getById(id);
    const updated = await CarbonFactorLibraryModel.update(id, input);
    if (!updated) throw new NotFoundError(`Carbon factor ${id} not found`);
    return updated;
  }

  static async delete(id: number): Promise<void> {
    await CarbonFactorLibraryService.getById(id);
    await CarbonFactorLibraryModel.delete(id);
  }
}

// =============================================================
// UserCalculatorService — user-facing calculation engine
// =============================================================

export class UserCalculatorService {
  // Returns the form config for a product's calculator
  static async getConfig(
    productId: number,
    type: CalculatorType
  ): Promise<CalculatorConfigResponse> {
    const product = await ProductModel.findById(productId);
    if (!product) throw new NotFoundError(`Product ${productId} not found`);

    const calc = await CalculatorModel.findByProductIdAndType(productId, type);
    if (!calc || calc.status !== "active") {
      throw new NotFoundError(
        `No active ${type} calculator found for product ${productId}`
      );
    }

    const config = parseConfig(calc.config);

    return {
      calculator_id: calc.id,
      type: calc.type,
      name: calc.name,
      description: calc.description,
      fields: config.fields,
      formula: config.formula ?? null,
      rating_thresholds: config.rating_thresholds ?? null,
    };
  }

  // Runs the calculation and returns full result with breakdown
  static async calculate(input: UserCalculationInput): Promise<CalculationResult> {
    const calc = await CalculatorModel.findByProductIdAndType(
      input.product_id,
      input.calculator_type
    );

    if (!calc || calc.status !== "active") {
      throw new NotFoundError(
        `No active ${input.calculator_type} calculator found for product ${input.product_id}`
      );
    }
    const config = parseConfig(calc.config);

    if (input.calculator_type === "carbon") {
      return runCarbonCalculation(config, input.inputs);
    } else {
      return runScoreCalculation(config, input.inputs);
    }
  }
}

// =============================================================
// Calculation engines
// =============================================================

function runCarbonCalculation(
  config: CalculatorConfig,
  inputs: Record<string, unknown>
): CarbonCalculationResult {
  const warnings: string[] = [];
  const breakdown: BreakdownItem[] = [];
  const modifiers: CarbonCalculationResult["modifiers"] = [];

  if (!config.formula) {
    throw new Error("This calculator has no formula configured");
  }

  const formula = config.formula;

  // Build field lookup map for quick access
  const fieldMap = new Map(config.fields.map((f) => [f.key, f]));

  // Resolve weight
  const weightKg = resolveWeight(inputs, formula.weight_field, warnings);

  let subtotal = 0;

  // --- Base field ---
  const baseField = fieldMap.get(formula.base_field);
  if (baseField) {
    const result = applyFieldValue(baseField, inputs, weightKg, warnings);
    if (result) {
      breakdown.push(result);
      subtotal += result.co2_value;
    }
  } else {
    warnings.push(`Base field "${formula.base_field}" not found in config`);
  }

  // --- Additives ---
  for (const key of formula.additives) {
    const field = fieldMap.get(key);
    if (!field) {
      warnings.push(`Additive field "${key}" not found in config`);
      continue;
    }
    const result = applyFieldValue(field, inputs, weightKg, warnings);
    if (result) {
      breakdown.push(result);
      subtotal += result.co2_value;
    }
  }

  // --- Percent modifiers ---
  let percentSum = 0;

  for (const key of formula.percent_modifiers) {
    const field = fieldMap.get(key);
    if (!field) {
      warnings.push(`Modifier field "${key}" not found in config`);
      continue;
    }

    const selected = resolveSelectedOptions(field, inputs);
    for (const opt of selected) {
      percentSum += opt.value;
      modifiers.push({
        field_key: field.key,
        field_label: field.label,
        selected_option: opt.label,
        percent: opt.value,
      });
    }
  }

  const total = round4(subtotal * (1 + percentSum / 100));

  // --- Reduction tips: flag fields contributing > 30% of subtotal ---
  for (const item of breakdown) {
    if (subtotal > 0 && item.co2_value / subtotal > 0.3) {
      item.reduction_tip = buildReductionTip(item.field_key, item.selected_option, config);
    }
  }

  // --- Placement ---
  const placement = resolvePlacement(config.placements ?? [], total);

  // --- Confidence ---
  const confidence = inferConfidence(breakdown.length, warnings.length);

  return {
    total_kg_co2e: total,
    breakdown,
    modifiers,
    placement,
    confidence,
    warnings,
  };
}

function runScoreCalculation(
  config: CalculatorConfig,
  inputs: Record<string, unknown>
): ScoreCalculationResult {
  const breakdown: ScoreCalculationResult["breakdown"] = [];
  let totalScore = 0;

  for (const field of config.fields) {
    if (field.role === "informational") continue;

    const selected = resolveSelectedOptions(field, inputs);
    for (const opt of selected) {
      breakdown.push({
        field_key: field.key,
        field_label: field.label,
        selected_option: opt.label,
        score: opt.value,
      });
      totalScore += opt.value;
    }
  }

  const thresholds = config.rating_thresholds ?? [];
  const sorted = [...thresholds].sort((a, b) => a.max_score - b.max_score);
  const match = sorted.find((t) => totalScore <= t.max_score);

  return {
    total_score: round4(totalScore),
    rating: match?.label ?? "Unknown",
    color: match?.color ?? "gray",
    breakdown,
  };
}

// =============================================================
// Calculation helpers
// =============================================================

function resolveWeight(
  inputs: Record<string, unknown>,
  weightField: string | undefined,
  warnings: string[]
): number | null {
  if (!weightField) return null;

  const raw = inputs[weightField];
  if (typeof raw === "number" && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }

  warnings.push(
    `Weight field "${weightField}" missing or invalid — weight-based calculation skipped`
  );
  return null;
}

function resolveSelectedOptions(
  field: { key: string; options: FieldOption[]; type: string },
  inputs: Record<string, unknown>
): FieldOption[] {
  const optMap = new Map(field.options.map((o) => [o.label.toLowerCase().trim(), o]));
  const raw = inputs[field.key ?? ""];

  if (typeof raw === "string") {
    const opt = optMap.get(raw.toLowerCase().trim());
    return opt ? [opt] : [];
  }

  if (Array.isArray(raw)) {
    const results: FieldOption[] = [];
    for (const v of raw) {
      if (typeof v === "string") {
        const opt = optMap.get(v.toLowerCase().trim());
        if (opt) results.push(opt);
      }
    }
    return results;
  }

  return [];
}

function applyFieldValue(
  field: { key: string; label: string; type: string; role: string; options: FieldOption[] },
  inputs: Record<string, unknown>,
  weightKg: number | null,
  warnings: string[]
): BreakdownItem | null {
  const selected = resolveSelectedOptions(field, inputs);

  if (selected.length === 0) {
    warnings.push(`No selection found for field "${field.key}"`);
    return null;
  }

  const opt = selected[0]!;
  let co2Value = opt.value;

  // If unit contains "per_kg", multiply by weight
  if (opt.unit.includes("per_kg")) {
    if (weightKg === null) {
      warnings.push(
        `Field "${field.key}" requires weight but none provided — using raw value`
      );
    } else {
      co2Value = round4(opt.value * weightKg);
    }
  }

  return {
    field_key: field.key,
    field_label: field.label,
    selected_option: opt.label,
    co2_value: co2Value,
    unit: opt.unit,
    role: field.role as BreakdownItem["role"],
    justification: opt.justification,
  };
}

function buildReductionTip(
  fieldKey: string,
  selectedOption: string,
  config: CalculatorConfig
): string {
  const field = config.fields.find((f) => f.key === fieldKey);
  if (!field) return "";

  // Find the option with lowest co2 value in the same field
  const sorted = [...field.options].sort((a, b) => a.value - b.value);
  const lowest = sorted[0];

  if (!lowest || lowest.label === selectedOption) return "";

  return `Switching to "${lowest.label}" could significantly reduce this component's footprint`;
}

function resolvePlacement(
  placements: Placement[],
  totalCo2: number
): PlacementResult | null {
  const sorted = [...placements].sort(
    (a, b) => a.display_order - b.display_order
  );

  for (const p of sorted) {
    const c = p.condition;

    if (c.always) return toPlacementResult(p);
    if (c.co2_above !== undefined && totalCo2 > c.co2_above) return toPlacementResult(p);
    if (c.co2_below !== undefined && totalCo2 < c.co2_below) return toPlacementResult(p);
  }

  return null;
}

function toPlacementResult(p: Placement): PlacementResult {
  return {
    headline: p.headline,
    body: p.body,
    cta_label: p.cta_label,
    cta_url: p.cta_url,
  };
}

function inferConfidence(
  breakdownCount: number,
  warningsCount: number
): ConfidenceLevel {
  if (warningsCount > 2 || breakdownCount === 0) return "low";
  if (warningsCount > 0) return "medium";
  return "high";
}

// =============================================================
// Config parser — safely extracts CalculatorConfig from JSONB
// =============================================================

function parseConfig(raw: unknown): CalculatorConfig {
  if (!isPlainObject(raw)) throw new Error("Calculator config is invalid");

  const result = validateCalculatorConfig(raw);
  if (!result.valid || !result.config) {
    throw new Error(
      `Calculator config failed validation: ${result.errors.map((e) => e.message).join(", ")}`
    );
  }

  return result.config;
}

// =============================================================
// Custom error classes
// =============================================================

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  readonly details: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    details: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}