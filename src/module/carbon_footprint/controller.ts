import type { Request, Response } from "express";
import {
  CategoryService,
  SubcategoryService,
  ProductService,
  CalculatorService,
  CarbonFactorLibraryService,
  UserCalculatorService,
  NotFoundError,
  ValidationError,
} from "./service.ts";
import {
  asObject,
  getString,
  getOptionalString,
  getNumber,
  getOptionalNumber,
  getBoolean,
  getInt,
  parseStatus,
  parseCalculatorType,
  parseConfidence,
  sendSuccess,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendServerError,
  generateSlug,
} from "./helpers.ts";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateSubcategoryInput,
  UpdateSubcategoryInput,
  CreateProductInput,
  UpdateProductInput,
  CreateCalculatorInput,
  UpdateCalculatorInput,
  CreateCarbonFactorInput,
  UpdateCarbonFactorInput,
  UserCalculationInput,
  CalculatorType,
} from "./types.ts";

// =============================================================
// Shared error handler — maps custom errors to correct HTTP codes
// =============================================================

function handleError(res: Response, e: unknown, fallback: string): Response {
  if (e instanceof NotFoundError) return sendNotFound(res, e.message);
  if (e instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: e.message,
      errors: e.details,
    });
  }
  if (e instanceof Error && e.message.includes("already exists")) {
    return sendBadRequest(res, e.message);
  }
  return sendServerError(res, e, fallback);
}

// =============================================================
// CategoryController
// =============================================================

export class CategoryController {
  /** POST /api/admin/categories */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const body = asObject(req.body);
      const name = getString(body, "name");
      if (!name) return sendBadRequest(res, "name is required");

      const input: CreateCategoryInput = {
        name,
        slug: getOptionalString(body, "slug") ?? generateSlug(name),
        display_order: getOptionalNumber(body, "display_order") ?? 0,
        icon: getOptionalString(body, "icon"),
        status: parseStatus(body["status"], "active"),
      };

      const row = await CategoryService.create(input);
      return sendSuccess(res, row, 201);
    } catch (e) {
      return handleError(res, e, "Failed to create category");
    }
  }

  /** GET /api/admin/categories */
  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const limit = getInt(req.query["limit"], 50, 1, 200);
      const offset = getInt(req.query["offset"], 0, 0, 50000);

      const result = await CategoryService.list({ limit, offset });
      return sendSuccess(res, result);
    } catch (e) {
      return handleError(res, e, "Failed to list categories");
    }
  }

  /** GET /api/admin/categories/:id */
  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const row = await CategoryService.getById(id);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to get category");
    }
  }

  /** PUT /api/admin/categories/:id */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const body = asObject(req.body);
      const input: UpdateCategoryInput = {
        name: getOptionalString(body, "name"),
        slug: getOptionalString(body, "slug"),
        display_order: getOptionalNumber(body, "display_order"),
        icon: getOptionalString(body, "icon"),
        status: parseStatus(body["status"], "active") !== "active"
          ? parseStatus(body["status"], "active")
          : body["status"] !== undefined
          ? parseStatus(body["status"], "active")
          : undefined,
      };

      const row = await CategoryService.update(id, input);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to update category");
    }
  }

  /** DELETE /api/admin/categories/:id */
  static async remove(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      await CategoryService.delete(id);
      return sendSuccess(res, { deleted: true });
    } catch (e) {
      return handleError(res, e, "Failed to delete category");
    }
  }
}

// =============================================================
// SubcategoryController
// =============================================================

export class SubcategoryController {
  /** POST /api/admin/subcategories */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const body = asObject(req.body);
      const name = getString(body, "name");
      const category_id = getNumber(body, "category_id");

      if (!name) return sendBadRequest(res, "name is required");
      if (!category_id) return sendBadRequest(res, "category_id is required");

      const input: CreateSubcategoryInput = {
        category_id,
        name,
        slug: getOptionalString(body, "slug") ?? generateSlug(name),
        display_order: getOptionalNumber(body, "display_order") ?? 0,
        status: parseStatus(body["status"], "active"),
      };

      const row = await SubcategoryService.create(input);
      return sendSuccess(res, row, 201);
    } catch (e) {
      return handleError(res, e, "Failed to create subcategory");
    }
  }

  /** GET /api/admin/subcategories/:categoryId */
  static async listByCategoryId(req: Request, res: Response): Promise<Response> {
    try {
      const categoryId = parseParamId(req.params["categoryId"]);
      if (!categoryId) return sendBadRequest(res, "categoryId must be a positive integer");

      const limit = getInt(req.query["limit"], 50, 1, 200);
      const offset = getInt(req.query["offset"], 0, 0, 50000);

      const result = await SubcategoryService.listByCategoryId(categoryId, { limit, offset });
      return sendSuccess(res, result);
    } catch (e) {
      return handleError(res, e, "Failed to list subcategories");
    }
  }

  /** GET /api/admin/subcategories/:id */
  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const row = await SubcategoryService.getById(id);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to get subcategory");
    }
  }

  /** PUT /api/admin/subcategories/:id */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const body = asObject(req.body);
      const input: UpdateSubcategoryInput = {
        name: getOptionalString(body, "name"),
        slug: getOptionalString(body, "slug"),
        display_order: getOptionalNumber(body, "display_order"),
        status: body["status"] !== undefined
          ? parseStatus(body["status"], "draft")
          : undefined,
      };

      const row = await SubcategoryService.update(id, input);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to update subcategory");
    }
  }

  /** DELETE /api/admin/subcategories/:id */
  static async remove(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      await SubcategoryService.delete(id);
      return sendSuccess(res, { deleted: true });
    } catch (e) {
      return handleError(res, e, "Failed to delete subcategory");
    }
  }
}

// =============================================================
// ProductController
// =============================================================

export class ProductController {
  /** POST /api/admin/products */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const body = asObject(req.body);
      const name = getString(body, "name");
      const subcategory_id = getNumber(body, "subcategory_id");

      if (!name) return sendBadRequest(res, "name is required");
      if (!subcategory_id) return sendBadRequest(res, "subcategory_id is required");

      const input: CreateProductInput = {
        subcategory_id,
        name,
        slug: getOptionalString(body, "slug") ?? generateSlug(name),
        description: getOptionalString(body, "description"),
        image_url: getOptionalString(body, "image_url"),
        ecommerce_url: getOptionalString(body, "ecommerce_url"),
        display_order: getOptionalNumber(body, "display_order") ?? 0,
        status: parseStatus(body["status"], "active"),
      };

      const row = await ProductService.create(input);
      return sendSuccess(res, row, 201);
    } catch (e) {
      return handleError(res, e, "Failed to create product");
    }
  }

  /** GET /api/admin/products/:subcategoryId */
  static async listBySubcategoryId(req: Request, res: Response): Promise<Response> {
    try {
      const subcategoryId = parseParamId(req.params["subcategoryId"]);
      if (!subcategoryId) return sendBadRequest(res, "subcategoryId must be a positive integer");

      const limit = getInt(req.query["limit"], 50, 1, 200);
      const offset = getInt(req.query["offset"], 0, 0, 50000);

      const result = await ProductService.listBySubcategoryId(subcategoryId, { limit, offset });
      return sendSuccess(res, result);
    } catch (e) {
      return handleError(res, e, "Failed to list products");
    }
  }

  /** GET /api/admin/products/detail/:id */
  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const row = await ProductService.getById(id);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to get product");
    }
  }

  /** PUT /api/admin/products/:id */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const body = asObject(req.body);
      const input: UpdateProductInput = {
        name: getOptionalString(body, "name"),
        slug: getOptionalString(body, "slug"),
        description: getOptionalString(body, "description"),
        image_url: getOptionalString(body, "image_url"),
        ecommerce_url: getOptionalString(body, "ecommerce_url"),
        display_order: getOptionalNumber(body, "display_order"),
        status: body["status"] !== undefined
          ? parseStatus(body["status"], "draft")
          : undefined,
      };

      const row = await ProductService.update(id, input);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to update product");
    }
  }

  /** DELETE /api/admin/products/:id */
  static async remove(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      await ProductService.delete(id);
      return sendSuccess(res, { deleted: true });
    } catch (e) {
      return handleError(res, e, "Failed to delete product");
    }
  }
}

// =============================================================
// CalculatorController
// =============================================================

export class CalculatorController {
  /** POST /api/admin/calculators */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const body = asObject(req.body);
      const name = getString(body, "name");
      const product_id = getNumber(body, "product_id");
      const type = parseCalculatorType(body["type"]);

      if (!name) return sendBadRequest(res, "name is required");
      if (!product_id) return sendBadRequest(res, "product_id is required");
      if (!type) return sendBadRequest(res, "type must be: carbon | material | chemical | durability");

      const rawConfig = body["config"];
      if (typeof rawConfig !== "object" || rawConfig === null || Array.isArray(rawConfig)) {
        return sendBadRequest(res, "config must be an object");
      }

      const input: CreateCalculatorInput = {
        product_id,
        type,
        name,
        description: getOptionalString(body, "description"),
        config: rawConfig as CreateCalculatorInput["config"],
        status: parseStatus(body["status"], "draft"),
      };

      const row = await CalculatorService.create(input);
      return sendSuccess(res, row, 201);
    } catch (e) {
      return handleError(res, e, "Failed to create calculator");
    }
  }

  /** GET /api/admin/calculators/product/:productId */
  static async listByProductId(req: Request, res: Response): Promise<Response> {
    try {
      const productId = parseParamId(req.params["productId"]);
      if (!productId) return sendBadRequest(res, "productId must be a positive integer");

      const rows = await CalculatorService.listByProductId(productId);
      return sendSuccess(res, rows);
    } catch (e) {
      return handleError(res, e, "Failed to list calculators");
    }
  }

  /** GET /api/admin/calculators/:id */
  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const row = await CalculatorService.getById(id);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to get calculator");
    }
  }

  /** PUT /api/admin/calculators/:id */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const body = asObject(req.body);
      const rawConfig = body["config"];

      const input: UpdateCalculatorInput = {
        name: getOptionalString(body, "name"),
        description: getOptionalString(body, "description"),
        status: body["status"] !== undefined
          ? parseStatus(body["status"], "draft")
          : undefined,
        config: (rawConfig !== undefined && typeof rawConfig === "object" && rawConfig !== null && !Array.isArray(rawConfig))
          ? rawConfig as UpdateCalculatorInput["config"]
          : undefined,
      };

      const row = await CalculatorService.update(id, input);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to update calculator");
    }
  }

  /** PATCH /api/admin/calculators/:id/fields */
  static async patchFields(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const body = asObject(req.body);
      const fields = body["fields"];
      if (!Array.isArray(fields)) return sendBadRequest(res, "fields must be an array");

      const row = await CalculatorService.patchFields(id, fields);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to patch calculator fields");
    }
  }

  /** PATCH /api/admin/calculators/:id/formula */
  static async patchFormula(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const body = asObject(req.body);
      const formula = body["formula"];
      if (typeof formula !== "object" || formula === null || Array.isArray(formula)) {
        return sendBadRequest(res, "formula must be an object");
      }

      const row = await CalculatorService.patchFormula(id, formula);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to patch calculator formula");
    }
  }

  /** PATCH /api/admin/calculators/:id/placements */
  static async patchPlacements(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const body = asObject(req.body);
      const placements = body["placements"];
      if (!Array.isArray(placements)) return sendBadRequest(res, "placements must be an array");

      const row = await CalculatorService.patchPlacements(id, placements);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to patch calculator placements");
    }
  }

  /** DELETE /api/admin/calculators/:id */
  static async remove(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      await CalculatorService.delete(id);
      return sendSuccess(res, { deleted: true });
    } catch (e) {
      return handleError(res, e, "Failed to delete calculator");
    }
  }
}

// =============================================================
// CarbonFactorLibraryController
// =============================================================

export class CarbonFactorLibraryController {
  /** POST /api/admin/carbon-factors */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const body = asObject(req.body);
      const name = getString(body, "name");
      const value = getNumber(body, "value");
      const unit = getString(body, "unit");

      if (!name) return sendBadRequest(res, "name is required");
      if (value === null) return sendBadRequest(res, "value is required and must be a number");
      if (!unit) return sendBadRequest(res, "unit is required");

      const input: CreateCarbonFactorInput = {
        name,
        category: getOptionalString(body, "category"),
        value,
        unit,
        justification: getOptionalString(body, "justification"),
        source: getOptionalString(body, "source"),
        confidence: parseConfidence(body["confidence"], "low"),
      };

      const row = await CarbonFactorLibraryService.create(input);
      return sendSuccess(res, row, 201);
    } catch (e) {
      return handleError(res, e, "Failed to create carbon factor");
    }
  }

  /** GET /api/admin/carbon-factors */
  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const category = typeof req.query["category"] === "string"
        ? req.query["category"]
        : undefined;
      const search = typeof req.query["search"] === "string"
        ? req.query["search"]
        : undefined;
      const is_active = req.query["is_active"] === "true"
        ? true
        : req.query["is_active"] === "false"
        ? false
        : undefined;
      const limit = getInt(req.query["limit"], 50, 1, 200);
      const offset = getInt(req.query["offset"], 0, 0, 50000);

      const result = await CarbonFactorLibraryService.list({
        category,
        search,
        is_active,
        limit,
        offset,
      });
      return sendSuccess(res, result);
    } catch (e) {
      return handleError(res, e, "Failed to list carbon factors");
    }
  }

  /** GET /api/admin/carbon-factors/:id */
  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const row = await CarbonFactorLibraryService.getById(id);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to get carbon factor");
    }
  }

  /** PUT /api/admin/carbon-factors/:id */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      const body = asObject(req.body);
      const input: UpdateCarbonFactorInput = {
        name: getOptionalString(body, "name"),
        category: getOptionalString(body, "category"),
        value: getOptionalNumber(body, "value"),
        unit: getOptionalString(body, "unit"),
        justification: getOptionalString(body, "justification"),
        source: getOptionalString(body, "source"),
        confidence: body["confidence"] !== undefined
          ? parseConfidence(body["confidence"], "low")
          : undefined,
        is_active: body["is_active"] !== undefined
          ? getBoolean(body, "is_active")
          : undefined,
      };

      const row = await CarbonFactorLibraryService.update(id, input);
      return sendSuccess(res, row);
    } catch (e) {
      return handleError(res, e, "Failed to update carbon factor");
    }
  }

  /** DELETE /api/admin/carbon-factors/:id */
  static async remove(req: Request, res: Response): Promise<Response> {
    try {
      const id = parseParamId(req.params["id"]);
      if (!id) return sendBadRequest(res, "id must be a positive integer");

      await CarbonFactorLibraryService.delete(id);
      return sendSuccess(res, { deleted: true });
    } catch (e) {
      return handleError(res, e, "Failed to delete carbon factor");
    }
  }
}

// =============================================================
// PublicCalculatorController — user-facing
// =============================================================

export class PublicCalculatorController {
  /** GET /api/calculator/categories */
  static async getCategories(req: Request, res: Response): Promise<Response> {
    try {
      const limit = getInt(req.query["limit"], 100, 1, 200);
      const offset = getInt(req.query["offset"], 0, 0, 50000);
      const result = await CategoryService.list({ limit, offset });
      return sendSuccess(res, result);
    } catch (e) {
      return handleError(res, e, "Failed to get categories");
    }
  }

  /** GET /api/calculator/subcategories/:categoryId */
  static async getSubcategories(req: Request, res: Response): Promise<Response> {
    try {
      const categoryId = parseParamId(req.params["categoryId"]);
      if (!categoryId) return sendBadRequest(res, "categoryId must be a positive integer");

      const result = await SubcategoryService.listByCategoryId(categoryId, {
        limit: 100,
        offset: 0,
      });
      return sendSuccess(res, result);
    } catch (e) {
      return handleError(res, e, "Failed to get subcategories");
    }
  }

  /** GET /api/calculator/products/:subcategoryId */
  static async getProducts(req: Request, res: Response): Promise<Response> {
    try {
      const subcategoryId = parseParamId(req.params["subcategoryId"]);
      if (!subcategoryId) return sendBadRequest(res, "subcategoryId must be a positive integer");

      const result = await ProductService.listBySubcategoryId(subcategoryId, {
        limit: 100,
        offset: 0,
      });
      return sendSuccess(res, result);
    } catch (e) {
      return handleError(res, e, "Failed to get products");
    }
  }

  /** GET /api/calculator/config/:productId?type=carbon */
  static async getConfig(req: Request, res: Response): Promise<Response> {
    try {
      const productId = parseParamId(req.params["productId"]);
      if (!productId) return sendBadRequest(res, "productId must be a positive integer");

      const type = parseCalculatorType(req.query["type"]) ?? "carbon" as CalculatorType;

      const config = await UserCalculatorService.getConfig(productId, type);
      return sendSuccess(res, config);
    } catch (e) {
      return handleError(res, e, "Failed to get calculator config");
    }
  }

  /** POST /api/calculator/calculate/:productId */
  static async calculate(req: Request, res: Response): Promise<Response> {
    try {
      const productId = parseParamId(req.params["productId"]);
      if (!productId) return sendBadRequest(res, "productId must be a positive integer");

      const body = asObject(req.body);
      const calculator_type = parseCalculatorType(body["calculator_type"]) ?? "carbon" as CalculatorType;
      const rawInputs = body["inputs"];

      if (typeof rawInputs !== "object" || rawInputs === null || Array.isArray(rawInputs)) {
        return sendBadRequest(res, "inputs must be an object");
      }

      const input: UserCalculationInput = {
        product_id: productId,
        calculator_type,
        inputs: rawInputs as Record<string, unknown>,
      };

      const result = await UserCalculatorService.calculate(input);
      return sendSuccess(res, result);
    } catch (e) {
      return handleError(res, e, "Calculation failed");
    }
  }
}

// =============================================================
// Shared local helpers
// =============================================================

function parseParamId(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}