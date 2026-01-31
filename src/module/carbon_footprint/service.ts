import {
  type CalculatorMode,
  CarbonCalculationModel,
  CarbonFactorModel,
  type CarbonFactorRow,
  CraftCalculatorModel,
  type CraftCalculatorRow,
  type FactorUnit,
} from "./model.ts";

/** -------- Public result types -------- */

export type ConfidenceLevel = "low" | "medium" | "high";

export interface CalculationRequest {
  craft_id: string;
  mode: CalculatorMode;
  inputs: Record<string, unknown>;
  save?: boolean; // default true
  requested_by?: string;
}

export interface CalculationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface CalculationComponentBreakdown {
  name: string;
  factor_type: string;
  factor_key: string;
  unit: FactorUnit;
  value: number;
  applied_as: string; // weight_based/per_item/etc
  co2: number;
}

export interface CalculationResponse {
  craft_id: string;
  mode: CalculatorMode;
  total_kg_co2e: number;
  weight_kg: number | null;
  breakdown: CalculationComponentBreakdown[];
  modifiers: Array<{ name: string; factor_type: string; factor_key: string; percent: number }>;
  missing_factors: Array<{ factor_type: string; factor_key: string; reason: string }>;
  warnings: CalculationWarning[];
  confidence: ConfidenceLevel;
  saved_calculation_id?: number;
}

/** -------- Internal config types (validated at runtime) -------- */

type ApplyType =
  | "weight_based"
  | "area_based"
  | "per_item"
  | "per_shipment"
  | "multi_per_item"
  | "percent_on_subtotal";

interface FixedFactorRef {
  factor_type: string;
  factor_key: string;
}

interface CalcComponent {
  name: string;
  apply: ApplyType;

  // normal (user-selected)
  factor_field?: string;
  factor_type?: string;

  // fixed (not user-selected)
  factor_fixed?: FixedFactorRef;
}

interface CalcModifier {
  name: string;
  apply: "percent_on_subtotal";
  factor_field: string;
  factor_type?: string; // can be overridden by factor_map
}

interface CalculatorConfig {
  craft_id?: string;
  aliases?: Record<string, Record<string, string>>;
  factor_map: Record<string, string>;
  options: Record<string, Array<{ label?: string; value: string }>>;
  modes?: unknown;
  calculation: {
    components: CalcComponent[];
    modifiers?: CalcModifier[];
  };
}

/** ---------------- Service ---------------- */

export class CarbonCalculatorService {
  static async listCalculators() {
    return CraftCalculatorModel.listActive();
  }

  static async getCalculator(craftId: string) {
    const row = await CraftCalculatorModel.getById(craftId);
    if (!row || !row.is_active) return null;
    return row;
  }

  static async calculate(req: CalculationRequest): Promise<CalculationResponse> {
    const craftId = req.craft_id.trim();
    const mode = req.mode;

    const craft = await CraftCalculatorModel.getById(craftId);
    if (!craft || !craft.is_active) {
      throw new Error(`Craft calculator not found: ${craftId}`);
    }

    const config = parseCalculatorConfig(craft);

    // 1) normalize inputs
    const normalizedInputs = normalizeInputs(req.inputs, config.aliases);

    // 2) resolve weight (kg)
    const { weightKg, warnings: weightWarnings } = resolveWeightKg(mode, normalizedInputs, config);
    const warnings: CalculationWarning[] = [...weightWarnings];

    // 3) collect factor requests from components + modifiers
    const factorRequests = collectFactorRequests(config, normalizedInputs);

    // 4) fetch factors + lookup
    const factors = await CarbonFactorModel.getActiveByTypeAndKeys(factorRequests);
    const lookup = buildFactorLookup(factors);

    // 5) compute
    const missing_factors: Array<{ factor_type: string; factor_key: string; reason: string }> = [];
    const breakdown: CalculationComponentBreakdown[] = [];
    const modifiers: Array<{ name: string; factor_type: string; factor_key: string; percent: number }> = [];

    let subtotal = 0;

    for (const comp of config.calculation.components) {
      // Fixed factor: apply directly (no input needed)
      if (comp.factor_fixed) {
        const r = applyFactor(
          {
            name: comp.name,
            apply: comp.apply,
            factor_type: comp.factor_fixed.factor_type,
            factor_field: "(fixed)",
          },
          comp.factor_fixed.factor_key,
          lookup,
          weightKg,
          null,
          warnings,
          missing_factors,
        );

        if (r) {
          breakdown.push(r);
          subtotal += r.co2;
        }
        continue;
      }

      // Field-driven factor: read selection(s) from inputs
      if (!comp.factor_field) {
        warnings.push({ code: "invalid_component", message: `Component ${comp.name} missing factor_field` });
        continue;
      }

      const factorType = resolveFactorType(config, comp.factor_field, comp.factor_type);
      if (!factorType) {
        warnings.push({
          code: "invalid_component",
          message: `Component ${comp.name} missing factor_type and no factor_map override`,
          field: comp.factor_field,
        });
        continue;
      }

      const { keys, err } = resolveSelectedKeys(comp.factor_field, normalizedInputs);
      if (err) {
        warnings.push({ code: "missing_input", message: err, field: comp.factor_field });
        continue;
      }

      if (comp.apply === "multi_per_item") {
        for (const key of keys) {
          const r = applyFactor(
            { name: comp.name, apply: comp.apply, factor_type: factorType, factor_field: comp.factor_field },
            key,
            lookup,
            weightKg,
            null,
            warnings,
            missing_factors,
          );
          if (r) {
            breakdown.push(r);
            subtotal += r.co2;
          }
        }
        continue;
      }

      const key = keys[0];
      if (!key) continue;

      const r = applyFactor(
        { name: comp.name, apply: comp.apply, factor_type: factorType, factor_field: comp.factor_field },
        key,
        lookup,
        weightKg,
        null,
        warnings,
        missing_factors,
      );
      if (r) {
        breakdown.push(r);
        subtotal += r.co2;
      }
    }

    // modifiers (percent on subtotal)
    const modifierList = config.calculation.modifiers ?? [];
    let percentSum = 0;

    for (const mod of modifierList) {
      const factorType = resolveFactorType(config, mod.factor_field, mod.factor_type);
      if (!factorType) {
        warnings.push({
          code: "invalid_modifier",
          message: `Modifier ${mod.name} missing factor_type and no factor_map override`,
          field: mod.factor_field,
        });
        continue;
      }

      const { keys, err } = resolveSelectedKeys(mod.factor_field, normalizedInputs);
      if (err) {
        warnings.push({ code: "missing_input", message: err, field: mod.factor_field });
        continue;
      }

      for (const key of keys) {
        const f = lookup.get(`${factorType}::${key}`);
        if (!f) {
          missing_factors.push({ factor_type: factorType, factor_key: key, reason: "factor_not_found" });
          continue;
        }
        if (f.unit !== "percent") {
          warnings.push({
            code: "unit_mismatch",
            message: `Modifier ${mod.name} expects percent but got ${f.unit} (${factorType}/${key})`,
            field: mod.factor_field,
          });
          missing_factors.push({ factor_type: factorType, factor_key: key, reason: "unit_mismatch" });
          continue;
        }
        const v = numericOrZero(f.value);
        percentSum += v;
        modifiers.push({ name: mod.name, factor_type: factorType, factor_key: key, percent: v });
      }
    }

    const total = round4(subtotal * (1 + percentSum / 100));

    const confidence = inferConfidence({
      mode,
      missingCount: missing_factors.length,
      factorConfidences: extractConfidenceLevels(factors),
      warningsCount: warnings.length,
    });

    const resultPayload = {
      craft_id: craftId,
      mode,
      total_kg_co2e: total,
      weight_kg: weightKg,
      breakdown,
      modifiers,
      missing_factors,
      warnings,
      confidence,
      calculated_at: new Date().toISOString(),
    };

    // Save by default
    let savedId: number | undefined;
    if (req.save !== false) {
      const saved = await CarbonCalculationModel.create({
        craft_id: craftId,
        mode,
        inputs: normalizedInputs,
        result: resultPayload,
      });
      savedId = saved.id;
    }

    return {
      craft_id: craftId,
      mode,
      total_kg_co2e: total,
      weight_kg: weightKg,
      breakdown,
      modifiers,
      missing_factors,
      warnings,
      confidence,
      ...(savedId ? { saved_calculation_id: savedId } : {}),
    };
  }
}

/** ---------------- Dashboard Service ---------------- */

export class CarbonDashboardService {
  static async getSummary(): Promise<
    Array<{
      craft_id: string;
      craft_name: string;
      category: string | null;
      total_kg_co2e: number;
      confidence: ConfidenceLevel;
      missing_factors_count: number;
      warnings_count: number;
      updated_at: string;
      error?: string;
    }>
  > {
    const calculators = await CraftCalculatorModel.listActive();

    const out: Array<{
      craft_id: string;
      craft_name: string;
      category: string | null;
      total_kg_co2e: number;
      confidence: ConfidenceLevel;
      missing_factors_count: number;
      warnings_count: number;
      updated_at: string;
      error?: string;
    }> = [];

    for (const c of calculators) {
      try {
        const full = await CraftCalculatorModel.getById(c.craft_id);
        if (!full) continue;

        const cfg = parseCalculatorConfig(full);
        const defaults = extractEstimatedDefaults(cfg);

        const res = await CarbonCalculatorService.calculate({
          craft_id: c.craft_id,
          mode: "estimated",
          inputs: defaults,
          save: false,
        });

        out.push({
          craft_id: c.craft_id,
          craft_name: c.craft_name,
          category: c.category,
          total_kg_co2e: res.total_kg_co2e,
          confidence: res.confidence,
          missing_factors_count: res.missing_factors.length,
          warnings_count: res.warnings.length,
          updated_at: c.updated_at,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error(`Dashboard summary skipped craft ${c.craft_id}:`, e);

        // Don’t crash the endpoint because one craft config is weird.
        out.push({
          craft_id: c.craft_id,
          craft_name: c.craft_name,
          category: c.category,
          total_kg_co2e: 0,
          confidence: "low",
          missing_factors_count: 0,
          warnings_count: 1,
          updated_at: c.updated_at,
          error: msg,
        });
      }
    }

    // sort: worst confidence first, then highest emissions
    return out.sort((a, b) => {
      const rank = (x: ConfidenceLevel) => (x === "low" ? 0 : x === "medium" ? 1 : 2);
      const d = rank(a.confidence) - rank(b.confidence);
      if (d !== 0) return d;
      return b.total_kg_co2e - a.total_kg_co2e;
    });
  }
}

/** ---------------- Helpers ---------------- */

function parseCalculatorConfig(craft: CraftCalculatorRow): CalculatorConfig {
  const cfg = craft.config;

  if (!isPlainObject(cfg)) throw new Error(`Invalid config JSON for craft ${craft.craft_id}`);

  const factor_map = cfg["factor_map"];
  const options = cfg["options"];
  const calculation = cfg["calculation"];

  if (!isPlainObject(factor_map)) throw new Error(`Missing factor_map for ${craft.craft_id}`);
  if (!isPlainObject(options)) throw new Error(`Missing options for ${craft.craft_id}`);
  if (!isPlainObject(calculation)) throw new Error(`Missing calculation for ${craft.craft_id}`);

  const componentsRaw = calculation["components"];
  if (!Array.isArray(componentsRaw)) throw new Error(`calculation.components must be array for ${craft.craft_id}`);

  const components: CalcComponent[] = componentsRaw.map((x) => {
    if (!isPlainObject(x)) throw new Error(`Bad component item in ${craft.craft_id}`);

    const name = asString(x["name"]);
    const apply = asString(x["apply"]) as ApplyType;

    const factor_field = asString(x["factor_field"]);
    const factor_type = asString(x["factor_type"]);

    const fixed = x["factor_fixed"];
    const factor_fixed =
      isPlainObject(fixed)
        ? { factor_type: asString(fixed["factor_type"]), factor_key: asString(fixed["factor_key"]) }
        : undefined;

    const hasFieldRef = factor_field.length > 0; // factor_type may be overridden by factor_map
    const hasFixedRef = !!factor_fixed?.factor_type && !!factor_fixed?.factor_key;

    if (!name || !apply || (!hasFieldRef && !hasFixedRef)) {
      throw new Error(`Invalid component in ${craft.craft_id}`);
    }

    return {
      name,
      apply,
      ...(hasFieldRef ? { factor_field, factor_type: factor_type || undefined } : {}),
      ...(hasFixedRef ? { factor_fixed } : {}),
    };
  });

  const modifiersRaw = calculation["modifiers"];
  const modifiers: CalcModifier[] | undefined = Array.isArray(modifiersRaw)
    ? modifiersRaw.map((x) => {
        if (!isPlainObject(x)) throw new Error(`Bad modifier item in ${craft.craft_id}`);
        const name = asString(x["name"]);
        const factor_field = asString(x["factor_field"]);
        const factor_type = asString(x["factor_type"]);
        if (!name || !factor_field) throw new Error(`Invalid modifier in ${craft.craft_id}`);
        return {
          name,
          apply: "percent_on_subtotal",
          factor_field,
          factor_type: factor_type || undefined, // can be overridden by factor_map
        };
      })
    : undefined;

  const aliases = isPlainObject(cfg["aliases"]) ? (cfg["aliases"] as Record<string, Record<string, string>>) : undefined;

  return {
    craft_id: typeof cfg["craft_id"] === "string" ? cfg["craft_id"] : undefined,
    aliases,
    factor_map: factor_map as Record<string, string>,
    options: options as Record<string, Array<{ label?: string; value: string }>>,
    modes: cfg["modes"],
    calculation: { components, modifiers },
  };
}

/**
 * Prefer factor_map[field] because DB configs may have incorrect component.factor_type.
 * This makes backend tolerant without DB edits.
 */
function resolveFactorType(cfg: CalculatorConfig, field: string, fallback?: string): string | null {
  const mapped = cfg.factor_map[field];
  if (typeof mapped === "string" && mapped.trim().length > 0) return mapped.trim();
  if (typeof fallback === "string" && fallback.trim().length > 0) return fallback.trim();
  return null;
}

function normalizeInputs(
  inputs: Record<string, unknown>,
  aliases?: Record<string, Record<string, string>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(inputs)) {
    if (typeof v === "string") {
      const trimmed = v.trim();
      out[k] = applyAlias(k, trimmed, aliases);
    } else if (Array.isArray(v)) {
      const arr = v
        .map((x) => (typeof x === "string" ? applyAlias(k, x.trim(), aliases) : null))
        .filter((x): x is string => typeof x === "string" && x.length > 0);
      out[k] = arr;
    } else {
      out[k] = v;
    }
  }

  return out;
}

function applyAlias(field: string, value: string, aliases?: Record<string, Record<string, string>>): string {
  if (!aliases) return value;
  const map = aliases[field];
  if (!map) return value;
  return map[value] ?? value;
}

function resolveWeightKg(
  mode: CalculatorMode,
  inputs: Record<string, unknown>,
  cfg: CalculatorConfig,
): { weightKg: number | null; warnings: CalculationWarning[] } {
  const warnings: CalculationWarning[] = [];

  if (mode === "detailed") {
    const w = inputs["weight_g"];
    const grams = toNumber(w);
    if (grams === null) {
      warnings.push({ code: "missing_weight", message: "weight_g is required in detailed mode", field: "weight_g" });
      return { weightKg: null, warnings };
    }
    if (grams <= 0) warnings.push({ code: "invalid_weight", message: "weight_g must be > 0", field: "weight_g" });
    return { weightKg: grams > 0 ? grams / 1000 : null, warnings };
  }

  // estimated: try cfg.modes.estimated.weight_defaults_g
  const modes = cfg.modes;
  if (!isPlainObject(modes)) {
    warnings.push({ code: "missing_weight_defaults", message: "No modes config found for weight defaults" });
    return { weightKg: null, warnings };
  }

  const est = modes["estimated"];
  if (!isPlainObject(est)) {
    warnings.push({ code: "missing_weight_defaults", message: "No estimated mode config found" });
    return { weightKg: null, warnings };
  }

  const wd = est["weight_defaults_g"];
  if (!isPlainObject(wd)) {
    warnings.push({ code: "missing_weight_defaults", message: "weight_defaults_g missing for estimated mode" });
    return { weightKg: null, warnings };
  }

  // detect a "size selector"
  const sizeKeyCandidates = ["product_line_size", "jacket_type", "bag_size", "jewelry_type", "size_preset", "product_type"];
  let selector: string | null = null;
  for (const k of sizeKeyCandidates) {
    if (typeof inputs[k] === "string") {
      selector = (inputs[k] as string).trim();
      break;
    }
  }

  if (!selector) {
    warnings.push({ code: "missing_size_selector", message: "No size selector found to resolve estimated weight" });
    return { weightKg: null, warnings };
  }

  const entry = wd[selector];
  if (!isPlainObject(entry)) {
    warnings.push({
      code: "missing_weight_default_for_selection",
      message: `No weight default found for: ${selector}`,
    });
    return { weightKg: null, warnings };
  }

  const avg = toNumber(entry["avg"]);
  if (avg === null) {
    warnings.push({ code: "invalid_weight_default", message: `Invalid avg weight for ${selector}` });
    return { weightKg: null, warnings };
  }

  return { weightKg: avg / 1000, warnings };
}

function collectFactorRequests(cfg: CalculatorConfig, inputs: Record<string, unknown>) {
  const requests: Array<{ factor_type: string; factor_key: string }> = [];

  const push = (factor_type: string, factor_key: string) => {
    if (!factor_type || !factor_key) return;
    requests.push({ factor_type, factor_key });
  };

  // components
  for (const comp of cfg.calculation.components) {
    if (comp.factor_fixed) {
      push(comp.factor_fixed.factor_type, comp.factor_fixed.factor_key);
      continue;
    }

    if (!comp.factor_field) continue;
    const factorType = resolveFactorType(cfg, comp.factor_field, comp.factor_type);
    if (!factorType) continue;

    const { keys } = resolveSelectedKeys(comp.factor_field, inputs);
    for (const key of keys) push(factorType, key);
  }

  // modifiers
  const modifiers = cfg.calculation.modifiers ?? [];
  for (const mod of modifiers) {
    const factorType = resolveFactorType(cfg, mod.factor_field, mod.factor_type);
    if (!factorType) continue;

    const { keys } = resolveSelectedKeys(mod.factor_field, inputs);
    for (const key of keys) push(factorType, key);
  }

  // dedupe
  const seen = new Set<string>();
  return requests.filter((r) => {
    const k = `${r.factor_type}::${r.factor_key}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function buildFactorLookup(rows: CarbonFactorRow[]) {
  const map = new Map<string, CarbonFactorRow>();
  for (const r of rows) {
    map.set(`${r.factor_type}::${r.factor_key}`, r);
  }
  return map;
}

function resolveSelectedKeys(field: string, inputs: Record<string, unknown>): { keys: string[]; err?: string } {
  const v = inputs[field];
  if (typeof v === "string" && v.trim()) return { keys: [v.trim()] };
  if (Array.isArray(v)) {
    const keys = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
    return { keys };
  }
  return { keys: [], err: `Missing selection for field: ${field}` };
}

function applyFactor(
  comp: { name: string; apply: ApplyType; factor_type: string; factor_field: string },
  factorKey: string,
  lookup: Map<string, CarbonFactorRow>,
  weightKg: number | null,
  areaM2: number | null,
  warnings: CalculationWarning[],
  missing: Array<{ factor_type: string; factor_key: string; reason: string }>,
): CalculationComponentBreakdown | null {
  const f = lookup.get(`${comp.factor_type}::${factorKey}`);
  if (!f) {
    missing.push({ factor_type: comp.factor_type, factor_key: factorKey, reason: "factor_not_found" });
    return null;
  }

  const val = numericOrZero(f.value);

  const expectedUnit = expectedUnitForApply(comp.apply);
  if (expectedUnit && f.unit !== expectedUnit) {
    warnings.push({
      code: "unit_mismatch",
      message: `Component ${comp.name} expects ${expectedUnit} but got ${f.unit} (${comp.factor_type}/${factorKey})`,
      field: comp.factor_field,
    });
    missing.push({ factor_type: comp.factor_type, factor_key: factorKey, reason: "unit_mismatch" });
    return null;
  }

  let co2 = 0;

  switch (comp.apply) {
    case "weight_based": {
      if (weightKg === null) {
        warnings.push({ code: "missing_weight", message: `Weight missing for ${comp.name}`, field: comp.factor_field });
        return null;
      }
      co2 = weightKg * val;
      break;
    }
    case "area_based": {
      if (areaM2 === null) {
        warnings.push({ code: "missing_area", message: `Area missing for ${comp.name}`, field: comp.factor_field });
        return null;
      }
      co2 = areaM2 * val;
      break;
    }
    case "per_item":
    case "per_shipment":
    case "multi_per_item": {
      co2 = val;
      break;
    }
    case "percent_on_subtotal": {
      return null; // handled elsewhere
    }
    default: {
      warnings.push({ code: "unknown_apply", message: `Unknown apply type: ${comp.apply}`, field: comp.factor_field });
      return null;
    }
  }

  return {
    name: comp.name,
    factor_type: comp.factor_type,
    factor_key: factorKey,
    unit: f.unit,
    value: val,
    applied_as: comp.apply,
    co2: round4(co2),
  };
}

function expectedUnitForApply(apply: ApplyType): FactorUnit | null {
  switch (apply) {
    case "weight_based":
      return "kg_per_kg";
    case "area_based":
      return "kg_per_m2";
    case "per_item":
    case "multi_per_item":
      return "kg_per_item";
    case "per_shipment":
      return "kg_per_shipment";
    default:
      return null;
  }
}

function inferConfidence(args: {
  mode: CalculatorMode;
  missingCount: number;
  factorConfidences: Array<"low" | "medium" | "high">;
  warningsCount: number;
}): ConfidenceLevel {
  if (args.missingCount > 0) return "low";

  const lowCount = args.factorConfidences.filter((x) => x === "low").length;
  const total = args.factorConfidences.length || 1;

  const lowRatio = lowCount / total;

  if (args.mode === "detailed" && args.warningsCount === 0 && lowRatio <= 0.2) return "high";
  if (lowRatio <= 0.5) return "medium";
  return "low";
}

function extractConfidenceLevels(rows: CarbonFactorRow[]): Array<"low" | "medium" | "high"> {
  const out: Array<"low" | "medium" | "high"> = [];
  for (const r of rows) {
    const meta = r.meta;
    if (isPlainObject(meta) && typeof meta["confidence"] === "string") {
      const c = meta["confidence"].toLowerCase();
      if (c === "high" || c === "medium" || c === "low") out.push(c);
    }
  }
  return out;
}

function extractEstimatedDefaults(cfg: CalculatorConfig): Record<string, unknown> {
  if (!isPlainObject(cfg.modes)) return {};
  const est = cfg.modes["estimated"];
  if (!isPlainObject(est)) return {};
  const def = est["defaults"];
  if (!isPlainObject(def)) return {};
  return { ...def };
}

function numericOrZero(v: string | null): number {
  if (v === null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
