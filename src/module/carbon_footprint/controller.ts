import type { Request, Response } from "express";
import { CarbonFactorModel, CraftCalculatorModel, type FactorUnit } from "./model.ts";
import { CarbonCalculatorService, CarbonDashboardService, type CalculationRequest } from "./service.ts";

/** ---------------- Controller ---------------- */

export class CarbonController {
  /** GET /api/carbon/calculators */
  static async listCalculators(req: Request, res: Response): Promise<Response> {
    try {
      const rows = await CarbonCalculatorService.listCalculators();
      return res.status(200).json({ success: true, data: rows });
    } catch (e: unknown) {
      return fail(res, e, "Failed to list calculators");
    }
  }

  /** GET /api/carbon/calculators/:craftId */
  static async getCalculator(req: Request, res: Response): Promise<Response> {
    try {
      const craftId = (req.params.craftId ?? "").trim();
      const row = await CarbonCalculatorService.getCalculator(craftId);
      if (!row) return res.status(404).json({ success: false, message: "Calculator not found" });
      return res.status(200).json({ success: true, data: row });
    } catch (e: unknown) {
      return fail(res, e, "Failed to get calculator");
    }
  }

  /** POST /api/carbon/calculate */
  static async calculate(req: Request, res: Response): Promise<Response> {
    try {
      const body = asObject(req.body);

      const craft_id = getString(body, "craft_id");
      const mode = getString(body, "mode") as "estimated" | "detailed";
      const inputs = getObject(body, "inputs");
      const save = getBoolean(body, "save");

      if (!craft_id) return res.status(400).json({ success: false, message: "craft_id is required" });
      if (mode !== "estimated" && mode !== "detailed")
        return res.status(400).json({ success: false, message: "mode must be estimated|detailed" });

      const calcReq: CalculationRequest = {
        craft_id,
        mode,
        inputs,
        ...(typeof save === "boolean" ? { save } : {}),
        // optional admin context from auth middleware later
        requested_by: getString(body, "requested_by") || undefined,
      };

      const out = await CarbonCalculatorService.calculate(calcReq);
      return res.status(200).json({ success: true, data: out });
    } catch (e: unknown) {
      return fail(res, e, "Calculation failed");
    }
  }

  /** GET /api/carbon/dashboard/summary */
  static async dashboardSummary(_req: Request, res: Response): Promise<Response> {
    try {
      const out = await CarbonDashboardService.getSummary();
      return res.status(200).json({ success: true, data: out });
    } catch (e: unknown) {
      return fail(res, e, "Failed to load dashboard summary");
    }
  }
}

export class CarbonAdminController {
  /** GET /api/admin/carbon/factors */
  static async listFactors(req: Request, res: Response): Promise<Response> {
    try {
      const factor_type = typeof req.query.factor_type === "string" ? req.query.factor_type : undefined;
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const is_active =
        typeof req.query.is_active === "string"
          ? req.query.is_active === "true"
          : typeof req.query.is_active === "boolean"
            ? req.query.is_active
            : undefined;

      const limit = clampInt(req.query.limit, 50, 1, 200);
      const offset = clampInt(req.query.offset, 0, 0, 50000);

      const rows = await CarbonFactorModel.list({ factor_type, is_active, q, limit, offset });
      return res.status(200).json({ success: true, data: rows });
    } catch (e: unknown) {
      return CarbonAdminController.fail(res, e, "Failed to list factors");
    }
  }

  /** PUT /api/admin/carbon/factors  (upsert by type+key) */
  static async upsertFactor(req: Request, res: Response): Promise<Response> {
    try {
      const body = asObject(req.body);

      const factor_type = getString(body, "factor_type");
      const factor_key = getString(body, "factor_key");
      const display_name = getString(body, "display_name");
      const unit = getString(body, "unit") as FactorUnit;
      const value = getOptionalNumber(body, "value"); // allow null
      const meta = body["meta"] ?? {};
      const is_active = getOptionalBoolean(body, "is_active") ?? true;

      // guardrails (admin has control, but we prevent nonsense)
      if (!factor_type || !factor_key || !display_name || !unit) {
        return res.status(400).json({
          success: false,
          message: "factor_type, factor_key, display_name, unit are required",
        });
      }

      const allowedUnits: FactorUnit[] = [
        "kg_per_kg",
        "kg_per_item",
        "kg_per_shipment",
        "kg_per_m2",
        "percent",
        "config",
      ];
      if (!allowedUnits.includes(unit)) {
        return res.status(400).json({ success: false, message: `Invalid unit: ${unit}` });
      }

      // change tracking fields (optional)
      const updated_by = getString(body, "updated_by") || undefined;
      const change_note = getString(body, "change_note") || undefined;

      const row = await CarbonFactorModel.upsert({
        factor_type,
        factor_key,
        display_name,
        unit,
        value,
        meta,
        is_active,
        updated_by,
        change_note,
      });

      return res.status(200).json({ success: true, data: row });
    } catch (e: unknown) {
      return CarbonAdminController.fail(res, e, "Failed to upsert factor");
    }
  }

  /** PUT /api/admin/carbon/calculators/:craftId */
  static async updateCalculator(req: Request, res: Response): Promise<Response> {
    try {
      const craftId = (req.params.craftId ?? "").trim();
      if (!craftId) return res.status(400).json({ success: false, message: "craftId is required" });

      const body = asObject(req.body);
      const craft_name = getString(body, "craft_name");
      const category = typeof body["category"] === "string" ? (body["category"] as string) : null;
      const config = body["config"];
      const is_active = getOptionalBoolean(body, "is_active") ?? true;

      if (!craft_name) return res.status(400).json({ success: false, message: "craft_name is required" });
      if (!isPlainObject(config)) return res.status(400).json({ success: false, message: "config must be object" });

      // guardrails: ensure minimum keys exist to prevent admin breaking frontend
      const required = ["options", "factor_map", "calculation"];
      for (const k of required) {
        if (!(k in config)) {
          return res.status(400).json({ success: false, message: `config missing required key: ${k}` });
        }
      }

      const row = await CraftCalculatorModel.upsert({
        craft_id: craftId,
        craft_name,
        category,
        config,
        is_active,
      });

      return res.status(200).json({ success: true, data: row });
    } catch (e: unknown) {
      return CarbonAdminController.fail(res, e, "Failed to update calculator");
    }
  }

  private static fail(res: Response, e: unknown, msg: string): Response {
    const err = e instanceof Error ? e.message : "Unknown error";
    console.error(msg, e);
    return res.status(500).json({ success: false, message: msg, error: err });
  }
}

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : def;
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function asObject(v: unknown): Record<string, unknown> {
  if (typeof v === "object" && v !== null && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function getString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
}

function getObject(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = obj[key];
  if (typeof v === "object" && v !== null && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function getBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
  const v = obj[key];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return undefined;
}

function getOptionalBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
  return getBoolean(obj, key);
}

function getOptionalNumber(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  if (v === null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail(res: Response, e: unknown, msg: string): Response {
  const err = e instanceof Error ? e.message : "Unknown error";
  console.error(msg, e);
  return res.status(500).json({ success: false, message: msg, error: err });
}
