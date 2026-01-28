import { db } from "../../../config/db.ts";

export interface FveValuationRow {
  id: string;
  appraisal_id: string;
  valuation: unknown;        // jsonb
  rule_snapshot: unknown;    // jsonb
  computed_at: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

class FveService {
  static async getValuationByAppraisalId(appraisalId: string): Promise<unknown | null> {
    const result = await db.query<FveValuationRow>(
      `SELECT * FROM fve_valuations WHERE appraisal_id = $1 LIMIT 1`,
      [appraisalId],
    );
    return result.rows[0]?.valuation ?? null;
  }

  static async deleteValuationByAppraisalId(appraisalId: string): Promise<void> {
    await db.query(`DELETE FROM fve_valuations WHERE appraisal_id = $1`, [appraisalId]);
  }

  static async computeAndSaveValuation(args: {
    appraisalId: string;
    pamPayload: unknown;
  }): Promise<unknown> {
    const valuation = this.computeValuation(args.pamPayload);

    const ruleSnapshot = {
      version: "v1",
      note: "Basic valuation formula snapshot stored with result",
    };

    const query = `
      INSERT INTO fve_valuations (appraisal_id, valuation, rule_snapshot, computed_at)
      VALUES ($1, $2::jsonb, $3::jsonb, NOW())
      ON CONFLICT (appraisal_id)
      DO UPDATE SET
        valuation = EXCLUDED.valuation,
        rule_snapshot = EXCLUDED.rule_snapshot,
        computed_at = NOW()
      RETURNING *
    `;

    await db.query(query, [args.appraisalId, JSON.stringify(valuation), JSON.stringify(ruleSnapshot)]);
    return valuation;
  }

  /** Produces fields used by the UI (material_cost, labor_cost, etc.) :contentReference[oaicite:11]{index=11} */
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

    // crude but consistent: map skill tier to hourly rate
    const tier = String(labor.skill_tier ?? "journeyman").toLowerCase();
    const hours = asNumber(labor.hours_spent);

    const hourly =
      tier === "master" ? 900 :
      tier === "expert" ? 700 :
      tier === "journeyman" ? 450 :
      tier === "apprentice" ? 250 :
      450;

    const laborCost = hours * hourly;

    const complexity = asNumber(craftsmanship.complexity_score, 5);         // 0-10
    const mastery = asNumber(craftsmanship.technique_mastery_score, 5);    // 0-10
    const innovation = asNumber(craftsmanship.innovation_factor, 1);

    // craftsmanship premium grows with complexity/mastery/innovation
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
