// =============================================================
// helpers.ts — CLEE Calculator Module
// Pure utility functions. No DB access, no req/res.
// =============================================================

import type { Response } from "express";
import type {
  CalculatorConfig,
  CalculatorField,
  CalculatorType,
  FieldOption,
  FieldRole,
  FieldType,
  RatingThreshold,
  Status,
} from "./types.ts";

// -------------------------------------------------------------
// Type guards
// -------------------------------------------------------------

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

// -------------------------------------------------------------
// Request body parsers
// -------------------------------------------------------------

export function asObject(v: unknown): Record<string, unknown> {
  if (isPlainObject(v)) return v;
  return {};
}

export function getString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
}

export function getOptionalString(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const v = obj[key];
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}

export function getNumber(
  obj: Record<string, unknown>,
  key: string
): number | null {
  const v = obj[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function getOptionalNumber(
  obj: Record<string, unknown>,
  key: string
): number | undefined {
  const v = getNumber(obj, key);
  return v === null ? undefined : v;
}

export function getBoolean(
  obj: Record<string, unknown>,
  key: string
): boolean | undefined {
  const v = obj[key];
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export function getInt(
  v: unknown,
  defaultVal: number,
  min: number,
  max: number
): number {
  const n =
    typeof v === "string"
      ? Number(v)
      : typeof v === "number"
      ? v
      : defaultVal;
  if (!Number.isFinite(n)) return defaultVal;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function getObject(
  obj: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  const v = obj[key];
  if (isPlainObject(v)) return v;
  return {};
}

// -------------------------------------------------------------
// Status & enum validators
// -------------------------------------------------------------

const VALID_STATUSES: Status[] = ["active", "draft", "archived"];
const VALID_CALCULATOR_TYPES: CalculatorType[] = [
  "material",
  "chemical",
  "durability",
];
const VALID_FIELD_TYPES: FieldType[] = [
  "dropdown",
  "multiselect",
  "number",
  "dimension",
  "distance",
  "text",
];
const VALID_FIELD_ROLES: FieldRole[] = [
  "base",
  "additive",
  "percent_modifier",
  "informational",
];

export function parseStatus(v: unknown, fallback: Status = "draft"): Status {
  if (typeof v === "string" && VALID_STATUSES.includes(v as Status)) {
    return v as Status;
  }
  return fallback;
}

export function parseCalculatorType(v: unknown): CalculatorType | null {
  if (
    typeof v === "string" &&
    VALID_CALCULATOR_TYPES.includes(v as CalculatorType)
  ) {
    return v as CalculatorType;
  }
  return null;
}

export function parseFieldType(v: unknown): FieldType | null {
  if (typeof v === "string" && VALID_FIELD_TYPES.includes(v as FieldType)) {
    return v as FieldType;
  }
  return null;
}

export function parseFieldRole(v: unknown): FieldRole | null {
  if (typeof v === "string" && VALID_FIELD_ROLES.includes(v as FieldRole)) {
    return v as FieldRole;
  }
  return null;
}

// -------------------------------------------------------------
// JSONB config validator
// -------------------------------------------------------------

export interface ConfigValidationError {
  path: string;
  message: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  config?: CalculatorConfig;
}

export function validateCalculatorConfig(
  raw: unknown
): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];

  if (!isPlainObject(raw)) {
    return {
      valid: false,
      errors: [{ path: "config", message: "config must be an object" }],
    };
  }

  // --- fields ---
  if (!isArray(raw["fields"])) {
    errors.push({ path: "config.fields", message: "fields must be an array" });
    return { valid: false, errors };
  }

  const fields: CalculatorField[] = [];

  for (let i = 0; i < (raw["fields"] as unknown[]).length; i++) {
    const f = (raw["fields"] as unknown[])[i];
    const p = `config.fields[${i}]`;

    if (!isPlainObject(f)) {
      errors.push({ path: p, message: "each field must be an object" });
      continue;
    }

    const key = getString(f, "key");
    const label = getString(f, "label");
    const fieldType = parseFieldType(f["type"]);
    const fieldRole = parseFieldRole(f["role"]);
    const required =
      typeof f["required"] === "boolean" ? f["required"] : true;
    const display_order =
      typeof f["display_order"] === "number" ? f["display_order"] : i;

    if (!key) errors.push({ path: `${p}.key`, message: "key is required" });
    if (!label) errors.push({ path: `${p}.label`, message: "label is required" });
    if (!fieldType) errors.push({ path: `${p}.type`, message: `type must be one of: ${VALID_FIELD_TYPES.join(", ")}` });
    if (!fieldRole) errors.push({ path: `${p}.role`, message: `role must be one of: ${VALID_FIELD_ROLES.join(", ")}` });

    if (!key || !label || !fieldType || !fieldRole) continue;

    // options
    const rawOptions = f["options"];
    const options: FieldOption[] = [];

    if (isArray(rawOptions)) {
      for (let j = 0; j < rawOptions.length; j++) {
        const o = rawOptions[j];
        const op = `${p}.options[${j}]`;

        if (!isPlainObject(o)) {
          errors.push({ path: op, message: "each option must be an object" });
          continue;
        }

        const oLabel = getString(o, "label");
        const oValue = getNumber(o, "value");
        const oUnit = getString(o, "unit");

        if (!oLabel) errors.push({ path: `${op}.label`, message: "option label required" });
        if (oValue === null) errors.push({ path: `${op}.value`, message: "option value must be a number" });
        if (!oUnit) errors.push({ path: `${op}.unit`, message: "option unit required" });

        if (!oLabel || oValue === null || !oUnit) continue;

        options.push({
          label: oLabel,
          value: oValue,
          unit: oUnit,
          justification: getString(o, "justification"),
          source: getOptionalString(o, "source"),
          display_order:
            typeof o["display_order"] === "number" ? o["display_order"] : j,
        });
      }
    }

    fields.push({
      key,
      label,
      type: fieldType,
      role: fieldRole,
      required,
      unit: getOptionalString(f, "unit"),
      placeholder: getOptionalString(f, "placeholder"),
      display_order,
      options,
    });
  }

  // --- rating_thresholds (optional) ---
  let rating_thresholds: RatingThreshold[] | undefined;
  const rawThresholds = raw["rating_thresholds"];

  if (rawThresholds !== undefined && rawThresholds !== null) {
    if (!isArray(rawThresholds)) {
      errors.push({
        path: "config.rating_thresholds",
        message: "rating_thresholds must be an array",
      });
    } else {
      rating_thresholds = [];
      for (let i = 0; i < rawThresholds.length; i++) {
        const t = rawThresholds[i];
        const tp = `config.rating_thresholds[${i}]`;

        if (!isPlainObject(t)) {
          errors.push({ path: tp, message: "each threshold must be an object" });
          continue;
        }

        const max_score = getNumber(t, "max_score");
        const label = getString(t, "label");
        const color = getString(t, "color");

        if (max_score === null) errors.push({ path: `${tp}.max_score`, message: "max_score must be a number" });
        if (!label) errors.push({ path: `${tp}.label`, message: "label required" });
        if (!color) errors.push({ path: `${tp}.color`, message: "color required" });

        if (max_score === null || !label || !color) continue;

        rating_thresholds.push({ max_score, label, color });
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    config: {
      fields,
      ...(rating_thresholds !== undefined ? { rating_thresholds } : {}),
    },
  };
}

// -------------------------------------------------------------
// Response helpers
// -------------------------------------------------------------

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({ success: true, data });
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: string
): Response {
  const body: Record<string, unknown> = { success: false, message };
  if (error) body["error"] = error;
  return res.status(statusCode).json(body);
}

export function sendNotFound(res: Response, message: string): Response {
  return sendError(res, message, 404);
}

export function sendBadRequest(res: Response, message: string): Response {
  return sendError(res, message, 400);
}

export function sendServerError(
  res: Response,
  e: unknown,
  fallbackMessage: string
): Response {
  const error = e instanceof Error ? e.message : "Unknown error";
  console.error(fallbackMessage, e);
  return sendError(res, fallbackMessage, 500, error);
}

// -------------------------------------------------------------
// Slug generator
// -------------------------------------------------------------

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// -------------------------------------------------------------
// Numeric helpers
// -------------------------------------------------------------

export function pgNumericToNumber(v: string | null): number {
  if (v === null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}