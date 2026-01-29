import { db } from "../../../config/db.ts";

export interface AppraisalValuationRow {
  id: string;
  appraisal_id: number;
  rule_version_id: string | null;

  fair_value_min: string;
  fair_value_max: string;
  fair_value_midpoint: string;
  confidence_score: string | null;

  breakdown: unknown;
  created_at: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Keeps the same external behavior as before:
 * - getValuationByAppraisalId() returns a valuation object (not a DB row)
 * - computeAndSaveValuation() returns the valuation object
 */
class FveService {
  static async getValuationByAppraisalId(appraisalId: string): Promise<Record<string, unknown> | null> {
    const result = await db.query<AppraisalValuationRow>(
      `
      SELECT
        id,
        appraisal_id,
        rule_version_id,
        fair_value_min,
        fair_value_max,
        fair_value_midpoint,
        confidence_score,
        breakdown,
        created_at
      FROM public.appraisal_valuations
      WHERE appraisal_id = $1
      LIMIT 1
      `,
      [appraisalId],
    );

    const row = result.rows[0];
    if (!row) return null;

    // Return the same shape your UI expects (material_cost, labor_cost, etc.)
    // We stored those inside breakdown.
    const breakdown = asRecord(row.breakdown);

    return {
      // components (if available)
      material_cost: asNumber(breakdown.material_cost),
      labor_cost: asNumber(breakdown.labor_cost),
      craftsmanship_premium: asNumber(breakdown.craftsmanship_premium),
      provenance_adjustment: asNumber(breakdown.provenance_adjustment),

      // valuation summary
      fair_value_min: Number(row.fair_value_min),
      fair_value_max: Number(row.fair_value_max),
      fair_value_midpoint: Number(row.fair_value_midpoint),
      confidence_score: row.confidence_score === null ? null : Number(row.confidence_score),
      currency: typeof breakdown.currency === "string" ? breakdown.currency : "INR",

      // metadata (won’t break anything if ignored)
      meta: {
        id: row.id,
        appraisal_id: row.appraisal_id,
        rule_version_id: row.rule_version_id,
        created_at: row.created_at,
      },
    };
  }

  static async deleteValuationByAppraisalId(appraisalId: string): Promise<void> {
    await db.query(`DELETE FROM public.appraisal_valuations WHERE appraisal_id = $1`, [appraisalId]);
  }

  static async computeAndSaveValuation(args: {
    appraisalId: string;
    pamPayload: unknown;
  }): Promise<Record<string, unknown>> {
    const valuation = this.computeValuation(args.pamPayload);

    // Map into table columns
    const fairMin = asNumber(valuation.fair_value_min);
    const fairMax = asNumber(valuation.fair_value_max);
    const fairMid = asNumber(valuation.fair_value_midpoint);
    const confidence = asNumber(valuation.confidence_score);

    // Store remaining details in breakdown jsonb
    const breakdown = {
      material_cost: asNumber(valuation.material_cost),
      labor_cost: asNumber(valuation.labor_cost),
      craftsmanship_premium: asNumber(valuation.craftsmanship_premium),
      provenance_adjustment: asNumber(valuation.provenance_adjustment),
      currency: typeof valuation.currency === "string" ? valuation.currency : "INR",
      // You can add more later without schema changes
      rule_snapshot: {
        version: "v1",
        note: "Basic valuation formula snapshot stored with result",
      },
    };

    const query = `
      INSERT INTO public.appraisal_valuations (
        appraisal_id,
        fair_value_min,
        fair_value_max,
        fair_value_midpoint,
        confidence_score,
        breakdown
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT (appraisal_id)
      DO UPDATE SET
        fair_value_min = EXCLUDED.fair_value_min,
        fair_value_max = EXCLUDED.fair_value_max,
        fair_value_midpoint = EXCLUDED.fair_value_midpoint,
        confidence_score = EXCLUDED.confidence_score,
        breakdown = EXCLUDED.breakdown,
        created_at = NOW()
      RETURNING id
    `;

    await db.query(query, [
      args.appraisalId,
      fairMin,
      fairMax,
      fairMid,
      confidence,
      JSON.stringify(breakdown),
    ]);

    // Return the valuation object exactly like before
    return valuation;
  }

  /** Produces fields used by the UI (material_cost, labor_cost, etc.) */
  static computeValuation(pamPayload: unknown): Record<string, unknown> {
    const root = asRecord(pamPayload);

    const materials = Array.isArray(root.materials) ? root.materials : [];
    const labor = asRecord(root.labor);
    const craftsmanship = asRecord(root.craftsmanship);
    const provenance = asRecord(root.provenance);

    const materialCost = materials.reduce((sum, m) => {
      const mm = asRecord(m);
      const qty = asNumber(mm.quantity);
      const unitCost = asNumber(mm.unit_cost);
      return sum + qty * unitCost;
    }, 0);

    const tier = String(labor.skill_tier ?? "journeyman").toLowerCase();
    const hours = asNumber(labor.hours_spent);

    const hourly =
      tier === "master" ? 900 :
      tier === "expert" ? 700 :
      tier === "journeyman" ? 450 :
      tier === "apprentice" ? 250 :
      450;

    const laborCost = hours * hourly;

    const complexity = asNumber(craftsmanship.complexity_score, 5);
    const mastery = asNumber(craftsmanship.technique_mastery_score, 5);
    const innovation = asNumber(craftsmanship.innovation_factor, 1);

    const craftsmanshipPremium =
      (materialCost + laborCost) *
      (0.05 + (complexity / 10) * 0.10 + (mastery / 10) * 0.08) *
      Math.max(0.8, Math.min(1.5, innovation));

    const giVerified = Boolean(provenance.gi_verified);
    const provenanceAdjustment = giVerified ? (materialCost + laborCost) * 0.08 : 0;

    const midpoint = materialCost + laborCost + craftsmanshipPremium + provenanceAdjustment;
    const fairMin = Math.max(0, midpoint * 0.9);
    const fairMax = midpoint * 1.1;

    const confidence =
      Math.round(
        50 +
        (giVerified ? 20 : 0) +
        Math.min(15, Math.max(0, mastery * 1.5)) +
        Math.min(15, Math.max(0, complexity * 1.2)),
      );

    return {
      material_cost: Math.round(materialCost),
      labor_cost: Math.round(laborCost),
      craftsmanship_premium: Math.round(craftsmanshipPremium),
      provenance_adjustment: Math.round(provenanceAdjustment),
      fair_value_midpoint: Math.round(midpoint),
      fair_value_min: Math.round(fairMin),
      fair_value_max: Math.round(fairMax),
      confidence_score: Math.max(0, Math.min(100, confidence)),
      currency: "INR",
    };
  }
}

export default FveService;
