import MreModel, { type MreMarketRateRow, type MreModifierRow } from "./model.ts";

class MreService {
  static async listRates(filters: { craft_type?: string; region?: string; rate_type?: string }): Promise<MreMarketRateRow[]> {
    return MreModel.listRates(filters);
  }

  static async createRate(payload: Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">): Promise<MreMarketRateRow> {
    return MreModel.createRate(payload);
  }

  static async updateRate(id: string, patch: Partial<Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">>): Promise<MreMarketRateRow> {
    const updated = await MreModel.updateRate(id, patch);
    if (!updated) throw new Error("Rate not found");
    return updated;
  }

  static async deleteRate(id: string): Promise<void> {
    const ok = await MreModel.deleteRate(id);
    if (!ok) throw new Error("Rate not found");
  }

  /** Bulk import (frontend currently loops rows and inserts one-by-one) :contentReference[oaicite:12]{index=12} */
  static async bulkImportRates(rows: Array<Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">>): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      try {
        await MreModel.createRate(rows[idx]!);
        success++;
      } catch (e: unknown) {
        failed++;
        const msg = e instanceof Error ? e.message : "Unknown error";
        errors.push(`Row ${idx + 1}: ${msg}`);
      }
    }

    return { success, failed, errors: errors.slice(0, 50) };
  }

  /** Categories (stored inside modifiers table) */
  static async listCategories(): Promise<MreModifierRow[]> {
    return MreModel.listCategories();
  }

  static async createCategory(payload: { category_name: string; category_description?: string | null }): Promise<MreModifierRow> {
    return MreModel.createCategory(payload);
  }

  static async listModifiers(): Promise<MreModifierRow[]> {
    const [mods, cats] = await Promise.all([MreModel.listModifiers(), MreModel.listCategories()]);

    // Attach category object so the frontend can show "category_name" without a join. :contentReference[oaicite:13]{index=13}
    const catMap = new Map<string, MreModifierRow>();
    for (const c of cats) catMap.set(c.id, c);

    return mods.map((m) => ({
      ...m,
      // Keep an extra field shape compatible-ish with how Supabase join was used:
      // modifier.mre_modifier_categories?.category_name
      // We can mimic that with:
      mre_modifier_categories: m.category_id ? catMap.get(m.category_id) ?? null : null,
    })) as unknown as MreModifierRow[];
  }

  static async createModifier(payload: Omit<MreModifierRow,
    "id" | "created_at" | "updated_at" | "is_category" | "category_name" | "category_description"
  >): Promise<MreModifierRow> {
    return MreModel.createModifier(payload);
  }

  static async updateModifier(id: string, patch: Partial<MreModifierRow>): Promise<MreModifierRow> {
    const updated = await MreModel.updateModifier(id, patch);
    if (!updated) throw new Error("Modifier not found");
    return updated;
  }

  static async deleteModifier(id: string): Promise<void> {
    const ok = await MreModel.deleteModifier(id);
    if (!ok) throw new Error("Modifier not found");
  }

  static async toggleModifierActive(id: string): Promise<MreModifierRow> {
    const updated = await MreModel.toggleModifierActive(id);
    if (!updated) throw new Error("Modifier not found");
    return updated;
  }
}

export default MreService;
