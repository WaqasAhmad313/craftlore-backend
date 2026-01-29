import type { Request, Response } from "express";
import { z } from "zod";
import MreService from "./service.ts";

const JsonObjectSchema = z
  .unknown()
  .optional()
  .transform((v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}))
  .pipe(z.record(z.string(), z.unknown()));

const NullableDateString = z
  .string()
  .min(1)
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? null : v));

const NullableString = z
  .string()
  .min(1)
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? null : v));

const RateSchema = z.object({
  craft_type: z.string().min(1),
  region: z.string().min(1),
  rate_type: z.enum(["wholesale", "retail", "export"]),
  current_rate: z.number().finite().nonnegative(),
  currency: z.string().min(1).default("INR"),
  trend_direction: z.enum(["up", "down", "stable"]).default("stable"),
  trend_percentage: z.number().finite().default(0),
  effective_from: z.string().min(1),
  effective_until: NullableDateString,

  // DB shape:
  source_name: z.string().min(1).nullable().optional().transform((v) => (v === undefined ? null : v)),
  source_meta: JsonObjectSchema.default({}),
});

const RatePatchSchema = RateSchema.partial();

const BulkImportSchema = z.object({
  rows: z.array(RateSchema).min(1),
});

// Accept both "description" and "category_description" (don’t make API users guess)
const CategorySchema = z.object({
  category_name: z.string().min(1),
  description: NullableString,
  category_description: NullableString,
});

const ModifierSchema = z.object({
  modifier_name: z.string().min(1),

  // support either; frontend will be adjusted, but keep this flexible
  category_id: z.string().min(1).optional().nullable(),
  category_name: z.string().min(1).optional(),

  description: NullableString,
  modifier_type: z.enum(["percentage", "multiplier", "fixed_amount"]),
  modifier_value: z.number().finite(),

  craft_type: NullableString,
  region: NullableString,
  rate_type: z.enum(["all", "retail", "wholesale", "export"]).default("all"),

  specification_key: NullableString,
  specification_value: NullableString,

  priority: z.number().int().default(0),
  is_stackable: z.boolean().default(true),
  is_active: z.boolean().default(true),

  effective_from: z.string().min(1),

  example_calculation: NullableString,
  meta: JsonObjectSchema.default({}),
});

const ModifierPatchSchema = ModifierSchema.partial();

export default class MreController {
  static async listRates(req: Request, res: Response): Promise<Response> {
    const craft_type = typeof req.query.craft_type === "string" ? req.query.craft_type : undefined;
    const region = typeof req.query.region === "string" ? req.query.region : undefined;
    const rate_type = typeof req.query.rate_type === "string" ? req.query.rate_type : undefined;

    try {
      const data = await MreService.listRates({ craft_type, region, rate_type });
      return res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load rates";
      return res.status(500).json({ success: false, message });
    }
  }

  static async createRate(req: Request, res: Response): Promise<Response> {
    const parsed = RateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid rate", issues: parsed.error.issues });
    }

    try {
      const created = await MreService.createRate(parsed.data);
      return res.status(201).json({ success: true, data: created });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create rate";
      return res.status(500).json({ success: false, message });
    }
  }

  static async updateRate(req: Request, res: Response): Promise<Response> {
    const parsed = RatePatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid patch", issues: parsed.error.issues });
    }

    try {
      const updated = await MreService.updateRate(req.params.id as string, parsed.data);
      return res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update rate";
      return res.status(500).json({ success: false, message });
    }
  }

  static async deleteRate(req: Request, res: Response): Promise<Response> {
    try {
      await MreService.deleteRate(req.params.id as string);
      return res.status(200).json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete rate";
      return res.status(500).json({ success: false, message });
    }
  }

  static async bulkImport(req: Request, res: Response): Promise<Response> {
    const parsed = BulkImportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid bulk payload", issues: parsed.error.issues });
    }

    try {
      const result = await MreService.bulkImportRates(parsed.data.rows);
      return res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Bulk import failed";
      return res.status(500).json({ success: false, message });
    }
  }

  /** Categories */
  static async listCategories(_req: Request, res: Response): Promise<Response> {
    try {
      const data = await MreService.listCategories();
      return res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load categories";
      return res.status(500).json({ success: false, message });
    }
  }

  static async createCategory(req: Request, res: Response): Promise<Response> {
    const parsed = CategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid category", issues: parsed.error.issues });
    }

    // Normalize so service/model always gets one field name
    const payload = {
      category_name: parsed.data.category_name,
      category_description: parsed.data.category_description ?? parsed.data.description ?? null,
    };

    try {
      const created = await MreService.createCategory(payload);
      return res.status(201).json({ success: true, data: created });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create category";
      return res.status(500).json({ success: false, message });
    }
  }

  /** Modifiers */
  static async listModifiers(_req: Request, res: Response): Promise<Response> {
    try {
      const data = await MreService.listModifiers();
      return res.status(200).json({ success: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load modifiers";
      return res.status(500).json({ success: false, message });
    }
  }

  static async createModifier(req: Request, res: Response): Promise<Response> {
    const parsed = ModifierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid modifier", issues: parsed.error.issues });
    }

    // Enforce: need either category_name or category_id
    const category_name = parsed.data.category_name ?? null;
    const category_id = parsed.data.category_id ?? null;

    if (!category_name && !category_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid modifier",
        issues: [{ path: ["category_name"], message: "category_name or category_id is required" }],
      });
    }

    // Normalize optional nullable fields so TS matches service/model types (no undefined)
    const payload = {
      ...parsed.data,
      category_name, // string | null
      category_id,   // string | null
      craft_type: parsed.data.craft_type ?? null,
      region: parsed.data.region ?? null,
      description: parsed.data.description ?? null,
      specification_key: parsed.data.specification_key ?? null,
      specification_value: parsed.data.specification_value ?? null,
      example_calculation: parsed.data.example_calculation ?? null,
      meta: parsed.data.meta ?? {},
    };

    try {
      const created = await MreService.createModifier(payload as never);
      return res.status(201).json({ success: true, data: created });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create modifier";
      return res.status(500).json({ success: false, message });
    }
  }

  static async updateModifier(req: Request, res: Response): Promise<Response> {
    const parsed = ModifierPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Invalid patch", issues: parsed.error.issues });
    }

    // Normalize undefined -> null for fields your model/service treat as nullable
    const patch = {
      ...parsed.data,
      craft_type: parsed.data.craft_type ?? undefined, // patch semantics: omit means "no change"
      region: parsed.data.region ?? undefined,
      description: parsed.data.description ?? undefined,
      specification_key: parsed.data.specification_key ?? undefined,
      specification_value: parsed.data.specification_value ?? undefined,
      example_calculation: parsed.data.example_calculation ?? undefined,
      meta: parsed.data.meta ?? undefined,
    };

    try {
      const updated = await MreService.updateModifier(req.params.id as string, patch as never);
      return res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update modifier";
      return res.status(500).json({ success: false, message });
    }
  }

  static async deleteModifier(req: Request, res: Response): Promise<Response> {
    try {
      await MreService.deleteModifier(req.params.id as string);
      return res.status(200).json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete modifier";
      return res.status(500).json({ success: false, message });
    }
  }

  static async toggleModifierActive(req: Request, res: Response): Promise<Response> {
    try {
      const updated = await MreService.toggleModifierActive(req.params.id as string);
      return res.status(200).json({ success: true, data: updated });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to toggle modifier";
      return res.status(500).json({ success: false, message });
    }
  }
}
