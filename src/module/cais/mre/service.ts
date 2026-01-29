import MreModel, { type MreMarketRateRow, type MreModifierRow, type MreCategoryRow } from "./model.ts";

class MreService {
  // Rates
  static async listRates(filters: { craft_type?: string; region?: string; rate_type?: string }): Promise<MreMarketRateRow[]> {
    return MreModel.listRates(filters);
  }

  static async createRate(payload: Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">): Promise<MreMarketRateRow> {
    return MreModel.createRate(payload);
  }

  static async updateRate(
    id: string,
    patch: Partial<Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">>
  ): Promise<MreMarketRateRow> {
    const updated = await MreModel.updateRate(id, patch);
    if (!updated) throw new Error("Rate not found");
    return updated;
  }

  static async deleteRate(id: string): Promise<void> {
    const ok = await MreModel.deleteRate(id);
    if (!ok) throw new Error("Rate not found");
  }

  static async bulkImportRates(
    rows: Array<Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
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

  // Categories (stored inside rate_modifiers as meta.category_only=true)
  static async listCategories(): Promise<MreCategoryRow[]> {
    return MreModel.listCategories();
  }

  static async createCategory(payload: { category_name: string; category_description?: string | null }): Promise<MreCategoryRow> {
    return MreModel.createCategory(payload);
  }

  // Modifiers
  static async listModifiers(): Promise<MreModifierRow[]> {
    const [mods, cats] = await Promise.all([MreModel.listModifiers(), MreModel.listCategories()]);

    const catMap = new Map<string, MreCategoryRow>();
    for (const c of cats) catMap.set(c.category_name, c);

    return mods.map((m) => {
      const cat = catMap.get(m.category_name) ?? null;
      return {
        ...m,
        category_id: cat?.id ?? null,
        // mimic Supabase join object used by frontend:
        mre_modifier_categories: cat ? { id: cat.id, category_name: cat.category_name, description: cat.category_description } : null,
      };
    });
  }

  static async createModifier(payload: Omit<MreModifierRow, "id" | "created_at" | "updated_at" | "mre_modifier_categories">): Promise<MreModifierRow> {
    // If frontend sends category_id, convert to category_name (optional support)
    if ((payload as any).category_id && !payload.category_name) {
      const cats = await MreModel.listCategories();
      const cat = cats.find((c) => c.id === (payload as any).category_id);
      if (!cat) throw new Error("Invalid category_id");
      payload.category_name = cat.category_name;
    }

    const created = await MreModel.createModifier(payload);
    const cats = await MreModel.listCategories();
    const cat = cats.find((c) => c.category_name === created.category_name) ?? null;

    return {
      ...created,
      category_id: cat?.id ?? null,
      mre_modifier_categories: cat ? { id: cat.id, category_name: cat.category_name, description: cat.category_description } : null,
    };
  }

  static async updateModifier(id: string, patch: Partial<MreModifierRow>): Promise<MreModifierRow> {
    // Convert category_id -> category_name if needed
    if ((patch as any).category_id && !(patch as any).category_name) {
      const cats = await MreModel.listCategories();
      const cat = cats.find((c) => c.id === (patch as any).category_id);
      if (!cat) throw new Error("Invalid category_id");
      (patch as any).category_name = cat.category_name;
    }

    const updated = await MreModel.updateModifier(id, patch);
    if (!updated) throw new Error("Modifier not found");

    const cats = await MreModel.listCategories();
    const cat = cats.find((c) => c.category_name === updated.category_name) ?? null;

    return {
      ...updated,
      category_id: cat?.id ?? null,
      mre_modifier_categories: cat ? { id: cat.id, category_name: cat.category_name, description: cat.category_description } : null,
    };
  }

  static async deleteModifier(id: string): Promise<void> {
    const ok = await MreModel.deleteModifier(id);
    if (!ok) throw new Error("Modifier not found");
  }

  static async toggleModifierActive(id: string): Promise<MreModifierRow> {
    const updated = await MreModel.toggleModifierActive(id);
    if (!updated) throw new Error("Modifier not found");

    const cats = await MreModel.listCategories();
    const cat = cats.find((c) => c.category_name === updated.category_name) ?? null;

    return {
      ...updated,
      category_id: cat?.id ?? null,
      mre_modifier_categories: cat ? { id: cat.id, category_name: cat.category_name, description: cat.category_description } : null,
    };
  }
}

export default MreService;
