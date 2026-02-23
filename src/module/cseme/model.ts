import { db } from "../../config/db.ts";

/* ===== TYPES ===== */

export type DataStatus = "verified" | "estimated" | "provisional";
export type DatasetStatus = "draft" | "published";

/* ===== CRAFT INTERFACES ===== */

export interface HscodeData {
  hs_code: string;
  description: string;
  chapter: string;
  duty_rate: string;
  gst_rate: string;
  export_markets: string[];
}

export interface WindowData {
  production_months: string[];
  peak_season: string;
  off_season: string;
  seasonal_factor: number;
}

export interface CreateCraftInput {
  name: string;
  craft_key: string;
  hscode_data: HscodeData;
  window_data: WindowData;
}

export interface UpdateCraftInput {
  name?: string;
  craft_key?: string;
  hscode_data?: HscodeData;
  window_data?: WindowData;
}

export interface Craft {
  id: string;
  name: string;
  craft_key: string;
  hscode_data: HscodeData;
  window_data: WindowData;
  created_at: string;
}

/* ===== DATASET INTERFACES ===== */

export interface CreateDatasetInput {
  title: string;
}

export interface Dataset {
  id: string;
  title: string;
  status: DatasetStatus;
  published_at: string | null;
  created_at: string;
}

/* ===== ECON DATA INTERFACES ===== */

export interface CreateEconDataInput {
  dataset_id: string;
  craft_id: string;
  fy_label: string;
  production_cr: number;
  export_cr: number;
  total_employment: number;
  data_status: DataStatus;
}

export interface UpdateEconDataInput {
  production_cr?: number;
  export_cr?: number;
  total_employment?: number;
  data_status?: DataStatus;
}

export interface EconData {
  id: string;
  dataset_id: string;
  craft_id: string;
  fy_label: string;
  production_cr: number;
  export_cr: number;
  total_employment: number;
  data_status: DataStatus;
  created_at: string;
}

export interface EconDataWithCraft extends EconData {
  craft_name: string;
  craft_key: string;
  hscode_data: HscodeData;
  window_data: WindowData;
}

/* ===== DASHBOARD SUMMARY INTERFACE ===== */

export interface DashboardSummary {
  craft_name: string;
  craft_key: string;
  fy_label: string;
  production_cr: number;
  export_cr: number;
  total_employment: number;
  data_status: DataStatus;
}

/* ===== MODEL CLASS ===== */

class CsemeModel {
  /* -------- CRAFTS -------- */

  static async createCraft(payload: CreateCraftInput): Promise<Craft> {
    const query = `
      INSERT INTO content.cseme_crafts (
        name,
        craft_key,
        hscode_data,
        window_data
      )
      VALUES ($1, $2, $3::jsonb, $4::jsonb)
      RETURNING *
    `;

    const values = [
      payload.name,
      payload.craft_key,
      JSON.stringify(payload.hscode_data),
      JSON.stringify(payload.window_data),
    ];

    const result = await db.query<Craft>(query, values);
    return result.rows[0]!;
  }

  static async getCraftById(id: string): Promise<Craft | null> {
    const result = await db.query<Craft>(
      `SELECT * FROM content.cseme_crafts WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getCraftByKey(craftKey: string): Promise<Craft | null> {
    const result = await db.query<Craft>(
      `SELECT * FROM content.cseme_crafts WHERE craft_key = $1 LIMIT 1`,
      [craftKey]
    );
    return result.rows[0] ?? null;
  }

  static async getAllCrafts(): Promise<Craft[]> {
    const result = await db.query<Craft>(
      `SELECT * FROM content.cseme_crafts ORDER BY name ASC`
    );
    return result.rows;
  }

  static async updateCraft(id: string, payload: UpdateCraftInput): Promise<Craft | null> {
    const fields: string[] = [];
    const values: (string | null)[] = [];
    let paramIndex = 1;

    if (payload.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(payload.name);
    }
    if (payload.craft_key !== undefined) {
      fields.push(`craft_key = $${paramIndex++}`);
      values.push(payload.craft_key);
    }
    if (payload.hscode_data !== undefined) {
      fields.push(`hscode_data = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(payload.hscode_data));
    }
    if (payload.window_data !== undefined) {
      fields.push(`window_data = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(payload.window_data));
    }

    if (fields.length === 0) {
      return this.getCraftById(id);
    }

    values.push(id);

    const query = `
      UPDATE content.cseme_crafts
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query<Craft>(query, values);
    return result.rows[0] ?? null;
  }

  static async deleteCraft(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM content.cseme_crafts WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /* -------- DATASETS -------- */

  static async createDataset(payload: CreateDatasetInput): Promise<Dataset> {
    const result = await db.query<Dataset>(
      `
      INSERT INTO content.cseme_datasets (title)
      VALUES ($1)
      RETURNING *
      `,
      [payload.title]
    );
    return result.rows[0]!;
  }

  static async getDatasetById(id: string): Promise<Dataset | null> {
    const result = await db.query<Dataset>(
      `SELECT * FROM content.cseme_datasets WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getAllDatasets(): Promise<Dataset[]> {
    const result = await db.query<Dataset>(
      `SELECT * FROM content.cseme_datasets ORDER BY created_at DESC`
    );
    return result.rows;
  }

  static async getPublishedDataset(): Promise<Dataset | null> {
    const result = await db.query<Dataset>(
      `
      SELECT * FROM content.cseme_datasets
      WHERE status = 'published'
      ORDER BY published_at DESC
      LIMIT 1
      `
    );
    return result.rows[0] ?? null;
  }

  static async publishDataset(id: string): Promise<Dataset | null> {
    const result = await db.query<Dataset>(
      `
      UPDATE content.cseme_datasets
      SET status = 'published', published_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async deleteDataset(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM content.cseme_datasets WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /* -------- ECON DATA -------- */

  static async createEconData(payload: CreateEconDataInput): Promise<EconData> {
    const query = `
      INSERT INTO content.cseme_econ_data (
        dataset_id,
        craft_id,
        fy_label,
        production_cr,
        export_cr,
        total_employment,
        data_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      payload.dataset_id,
      payload.craft_id,
      payload.fy_label,
      payload.production_cr,
      payload.export_cr,
      payload.total_employment,
      payload.data_status,
    ];

    const result = await db.query<EconData>(query, values);
    return result.rows[0]!;
  }

  static async getEconDataById(id: string): Promise<EconData | null> {
    const result = await db.query<EconData>(
      `SELECT * FROM content.cseme_econ_data WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getEconDataByDataset(datasetId: string): Promise<EconDataWithCraft[]> {
    const result = await db.query<EconDataWithCraft>(
      `
      SELECT
        e.*,
        c.name  AS craft_name,
        c.craft_key,
        c.hscode_data,
        c.window_data
      FROM content.cseme_econ_data e
      JOIN content.cseme_crafts c ON c.id = e.craft_id
      WHERE e.dataset_id = $1
      ORDER BY c.name ASC, e.fy_label ASC
      `,
      [datasetId]
    );
    return result.rows;
  }

  static async getEconDataByCraftAndDataset(
    craftId: string,
    datasetId: string
  ): Promise<EconData[]> {
    const result = await db.query<EconData>(
      `
      SELECT * FROM content.cseme_econ_data
      WHERE craft_id = $1 AND dataset_id = $2
      ORDER BY fy_label ASC
      `,
      [craftId, datasetId]
    );
    return result.rows;
  }

  static async updateEconData(
    id: string,
    payload: UpdateEconDataInput
  ): Promise<EconData | null> {
    const fields: string[] = [];
    const values: (number | string | null)[] = [];
    let paramIndex = 1;

    if (payload.production_cr !== undefined) {
      fields.push(`production_cr = $${paramIndex++}`);
      values.push(payload.production_cr);
    }
    if (payload.export_cr !== undefined) {
      fields.push(`export_cr = $${paramIndex++}`);
      values.push(payload.export_cr);
    }
    if (payload.total_employment !== undefined) {
      fields.push(`total_employment = $${paramIndex++}`);
      values.push(payload.total_employment);
    }
    if (payload.data_status !== undefined) {
      fields.push(`data_status = $${paramIndex++}`);
      values.push(payload.data_status);
    }

    if (fields.length === 0) {
      return this.getEconDataById(id);
    }

    values.push(id);

    const query = `
      UPDATE content.cseme_econ_data
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query<EconData>(query, values);
    return result.rows[0] ?? null;
  }

  static async deleteEconData(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM content.cseme_econ_data WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async getDashboardSummary(
    datasetId: string,
    fyLabel: string
  ): Promise<DashboardSummary[]> {
    const result = await db.query<DashboardSummary>(
      `
      SELECT
        c.name        AS craft_name,
        c.craft_key,
        e.fy_label,
        e.production_cr,
        e.export_cr,
        e.total_employment,
        e.data_status
      FROM content.cseme_econ_data e
      JOIN content.cseme_crafts c ON c.id = e.craft_id
      WHERE e.dataset_id = $1 AND e.fy_label = $2
      ORDER BY e.production_cr DESC
      `,
      [datasetId, fyLabel]
    );
    return result.rows;
  }

  static async getAvailableFyLabels(datasetId: string): Promise<string[]> {
    const result = await db.query<{ fy_label: string }>(
      `
      SELECT DISTINCT fy_label
      FROM content.cseme_econ_data
      WHERE dataset_id = $1
      ORDER BY fy_label ASC
      `,
      [datasetId]
    );
    return result.rows.map((r) => r.fy_label);
  }

  static async checkDuplicateEconData(
    datasetId: string,
    craftId: string,
    fyLabel: string
  ): Promise<boolean> {
    const result = await db.query<{ exists: boolean }>(
      `
      SELECT EXISTS(
        SELECT 1 FROM content.cseme_econ_data
        WHERE dataset_id = $1 AND craft_id = $2 AND fy_label = $3
      ) AS exists
      `,
      [datasetId, craftId, fyLabel]
    );
    return result.rows[0]?.exists ?? false;
  }
}

export default CsemeModel;