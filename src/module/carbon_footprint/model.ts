import { db } from "../../config/db.ts";

export type FactorType = 'material' | 'production' | 'dyeing' | 'embroidery' | 'packaging' | 'logistics' | 'certification' | 'baseline' | 'config';
export type CalculationType = 'gi_product' | 'comparison' | 'quick_estimate' | 'professional_assessment';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type SystemBoundary = 'artisan_gate' | 'exporter_gate' | 'destination_port' | 'customer_estimate';
export type DataTier = 'A' | 'B' | 'C';

export interface CarbonFactor {
  id: number;
  factor_type: FactorType;
  factor_key: string;
  factor_data: any;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CarbonCalculation {
  id: number;
  calculation_type: CalculationType;
  user_id: number | null;
  session_id: string | null;
  product_config: any;
  calculation_result: any;
  total_co2: number;
  confidence_level: ConfidenceLevel | null;
  region: string;
  system_boundary: SystemBoundary | null;
  data_tier: DataTier | null;
  created_at: string;
}

export interface GiProductBaseline {
  id: number;
  gi_product_id: number;
  baseline_name: string;
  configuration_description: string | null;
  material_co2: number;
  production_co2: number;
  dyeing_co2: number;
  embroidery_co2: number;
  packaging_co2: number;
  logistics_co2: number;
  other_co2: number;
  total_co2: number;
  configuration_details: any | null;
  calculated_by: number | null;
  calculation_method: 'quick_estimate' | 'professional_assessment';
  confidence_level: ConfidenceLevel;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class CarbonFootprintModel {
  /**
   * PAGE 4: UPSERT carbon factor (create if no id, update if id exists)
   */
  static async upsertFactor(params: {
    id?: number;
    factor_type: FactorType;
    factor_key: string;
    factor_data: any;
    is_active?: boolean;
    display_order?: number;
  }): Promise<CarbonFactor> {
    // If ID provided, UPDATE
    if (params.id) {
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (params.factor_type !== undefined) {
        updates.push(`factor_type = $${idx++}`);
        values.push(params.factor_type);
      }
      if (params.factor_key !== undefined) {
        updates.push(`factor_key = $${idx++}`);
        values.push(params.factor_key);
      }
      if (params.factor_data !== undefined) {
        updates.push(`factor_data = $${idx++}`);
        values.push(JSON.stringify(params.factor_data));
      }
      if (params.is_active !== undefined) {
        updates.push(`is_active = $${idx++}`);
        values.push(params.is_active);
      }
      if (params.display_order !== undefined) {
        updates.push(`display_order = $${idx++}`);
        values.push(params.display_order);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(params.id);

      const sql = `UPDATE carbon_factors SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await db.query(sql, values);
      
      if (result.rowCount === 0) throw new Error('Factor not found');
      return result.rows[0];
    } 
    // No ID provided, CREATE
    else {
      const sql = `
        INSERT INTO carbon_factors (factor_type, factor_key, factor_data, is_active, display_order)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [
        params.factor_type,
        params.factor_key,
        JSON.stringify(params.factor_data),
        params.is_active ?? true,
        params.display_order ?? 0
      ];
      const result = await db.query(sql, values);
      return result.rows[0];
    }
  }

  /**
   * PAGE 4: Get single factor by ID
   */
  static async getFactorById(id: number): Promise<CarbonFactor> {
    const result = await db.query('SELECT * FROM carbon_factors WHERE id = $1', [id]);
    if (result.rowCount === 0) throw new Error('Factor not found');
    return result.rows[0];
  }

  /**
   * PAGE 3: Get factors by type (for dropdowns in calculator)
   */
  static async getFactorsByType(factor_type: FactorType, is_active?: boolean): Promise<CarbonFactor[]> {
    const sql = `
      SELECT * FROM carbon_factors
      WHERE factor_type = $1 AND ($2::boolean IS NULL OR is_active = $2)
      ORDER BY display_order ASC, factor_key ASC
    `;
    const result = await db.query(sql, [factor_type, is_active ?? null]);
    return result.rows;
  }

  /**
   * PAGE 4: Get all factors with filters
   */
  static async getAllFactors(params: {
    factor_type?: FactorType;
    is_active?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<CarbonFactor[]> {
    const sql = `
      SELECT * FROM carbon_factors
      WHERE ($1::varchar IS NULL OR factor_type = $1)
        AND ($2::boolean IS NULL OR is_active = $2)
        AND ($3::text IS NULL OR factor_key ILIKE '%' || $3 || '%')
      ORDER BY factor_type ASC, display_order ASC, factor_key ASC
      LIMIT $4 OFFSET $5
    `;
    const values = [
      params.factor_type ?? null,
      params.is_active ?? null,
      params.search ?? null,
      params.limit ?? 100,
      params.offset ?? 0
    ];
    const result = await db.query(sql, values);
    return result.rows;
  }

  /**
   * PAGE 4: Delete a carbon factor
   */
  static async deleteFactor(id: number): Promise<void> {
    const result = await db.query('DELETE FROM carbon_factors WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) throw new Error('Factor not found');
  }

  /**
   * PAGE 3: Get config data (product_weights, etc.)
   */
  static async getConfig(configKey: string): Promise<any> {
    const sql = `SELECT factor_data FROM carbon_factors WHERE factor_type = 'config' AND factor_key = $1`;
    const result = await db.query(sql, [configKey]);
    if (result.rowCount === 0) throw new Error(`Configuration '${configKey}' not found`);
    return result.rows[0].factor_data;
  }

  /**
   * PAGE 1 & 2: Get baseline comparisons (machine-made, fast fashion, synthetic)
   */
  static async getBaselines(): Promise<CarbonFactor[]> {
    return this.getFactorsByType('baseline', true);
  }

  /**
   * PAGE 3: Save calculation for history
   */
  static async saveCalculation(params: {
    calculation_type: CalculationType;
    user_id?: number;
    session_id?: string;
    product_config: any;
    calculation_result: any;
    total_co2: number;
    confidence_level?: ConfidenceLevel;
    region?: string;
    system_boundary?: SystemBoundary;
    data_tier?: DataTier;
  }): Promise<CarbonCalculation> {
    const sql = `
      INSERT INTO carbon_calculations (
        calculation_type, user_id, session_id, product_config,
        calculation_result, total_co2, confidence_level, region,
        system_boundary, data_tier
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      params.calculation_type,
      params.user_id ?? null,
      params.session_id ?? null,
      JSON.stringify(params.product_config),
      JSON.stringify(params.calculation_result),
      params.total_co2,
      params.confidence_level ?? null,
      params.region ?? 'kashmir',
      params.system_boundary ?? null,
      params.data_tier ?? null
    ];
    const result = await db.query(sql, values);
    return result.rows[0];
  }

  /**
   * PAGE 3/4: Get user's calculation history
   */
  static async getUserHistory(userId: number, limit: number = 20): Promise<CarbonCalculation[]> {
    const sql = `
      SELECT * FROM carbon_calculations
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await db.query(sql, [userId, limit]);
    return result.rows;
  }

  /**
   * PAGE 3/4: Get session's calculation history (anonymous users)
   */
  static async getSessionHistory(sessionId: string, limit: number = 20): Promise<CarbonCalculation[]> {
    const sql = `
      SELECT * FROM carbon_calculations
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await db.query(sql, [sessionId, limit]);
    return result.rows;
  }

  /**
   * PAGE 4: Get calculation statistics for admin dashboard
   */
  static async getStatistics(): Promise<{
    total_calculations: number;
    avg_co2_by_type: Array<{ calculation_type: string; avg_co2: number }>;
  }> {
    const totalSql = `SELECT COUNT(*) as total FROM carbon_calculations`;
    const totalResult = await db.query(totalSql);

    const avgSql = `
      SELECT calculation_type, ROUND(AVG(total_co2)::numeric, 2) as avg_co2
      FROM carbon_calculations
      GROUP BY calculation_type
      ORDER BY avg_co2 DESC
    `;
    const avgResult = await db.query(avgSql);

    return {
      total_calculations: parseInt(totalResult.rows[0].total),
      avg_co2_by_type: avgResult.rows
    };
  }

  /**
   * PAGE 4: UPSERT baseline (create or update)
   * Note: For GI product listing, use existing GI product routes
   */
  static async upsertBaseline(params: {
    id?: number;
    gi_product_id: number;
    baseline_name?: string;
    configuration_description?: string;
    material_co2: number;
    production_co2: number;
    dyeing_co2: number;
    embroidery_co2: number;
    packaging_co2: number;
    logistics_co2: number;
    other_co2?: number;
    total_co2: number;
    configuration_details?: any;
    calculated_by?: number;
    calculation_method?: 'quick_estimate' | 'professional_assessment';
    confidence_level?: ConfidenceLevel;
    notes?: string;
  }): Promise<GiProductBaseline> {
    // If ID provided, UPDATE existing baseline
    if (params.id) {
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      // Update baseline_name
      if (params.baseline_name !== undefined) {
        updates.push(`baseline_name = $${idx++}`);
        values.push(params.baseline_name);
      }
      
      // Update configuration_description
      if (params.configuration_description !== undefined) {
        updates.push(`configuration_description = $${idx++}`);
        values.push(params.configuration_description);
      }
      
      // Update CO2 values
      if (params.material_co2 !== undefined) {
        updates.push(`material_co2 = $${idx++}`);
        values.push(params.material_co2);
      }
      
      if (params.production_co2 !== undefined) {
        updates.push(`production_co2 = $${idx++}`);
        values.push(params.production_co2);
      }
      
      if (params.dyeing_co2 !== undefined) {
        updates.push(`dyeing_co2 = $${idx++}`);
        values.push(params.dyeing_co2);
      }
      
      if (params.embroidery_co2 !== undefined) {
        updates.push(`embroidery_co2 = $${idx++}`);
        values.push(params.embroidery_co2);
      }
      
      if (params.packaging_co2 !== undefined) {
        updates.push(`packaging_co2 = $${idx++}`);
        values.push(params.packaging_co2);
      }
      
      if (params.logistics_co2 !== undefined) {
        updates.push(`logistics_co2 = $${idx++}`);
        values.push(params.logistics_co2);
      }
      
      if (params.other_co2 !== undefined) {
        updates.push(`other_co2 = $${idx++}`);
        values.push(params.other_co2);
      }
      
      if (params.total_co2 !== undefined) {
        updates.push(`total_co2 = $${idx++}`);
        values.push(params.total_co2);
      }
      
      // Update configuration_details (JSONB)
      if (params.configuration_details !== undefined) {
        updates.push(`configuration_details = $${idx++}`);
        values.push(JSON.stringify(params.configuration_details));
      }
      
      // Update metadata
      if (params.calculated_by !== undefined) {
        updates.push(`calculated_by = $${idx++}`);
        values.push(params.calculated_by);
      }
      
      if (params.calculation_method !== undefined) {
        updates.push(`calculation_method = $${idx++}`);
        values.push(params.calculation_method);
      }
      
      if (params.confidence_level !== undefined) {
        updates.push(`confidence_level = $${idx++}`);
        values.push(params.confidence_level);
      }
      
      if (params.notes !== undefined) {
        updates.push(`notes = $${idx++}`);
        values.push(params.notes);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(params.id);

      const sql = `UPDATE gi_product_carbon_baselines SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await db.query(sql, values);

      if (result.rowCount === 0) throw new Error('Baseline not found');
      return result.rows[0];
    }
    // No ID, CREATE new baseline
    else {
      // Deactivate existing active baseline
      await db.query(
        'UPDATE gi_product_carbon_baselines SET is_active = false WHERE gi_product_id = $1 AND is_active = true',
        [params.gi_product_id]
      );

      const sql = `
        INSERT INTO gi_product_carbon_baselines (
          gi_product_id, baseline_name, configuration_description,
          material_co2, production_co2, dyeing_co2, embroidery_co2,
          packaging_co2, logistics_co2, other_co2, total_co2,
          configuration_details, calculated_by, calculation_method,
          confidence_level, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      const values = [
        params.gi_product_id,
        params.baseline_name ?? 'Standard Configuration',
        params.configuration_description ?? null,
        params.material_co2,
        params.production_co2,
        params.dyeing_co2,
        params.embroidery_co2,
        params.packaging_co2,
        params.logistics_co2,
        params.other_co2 ?? 0,
        params.total_co2,
        params.configuration_details ? JSON.stringify(params.configuration_details) : null,
        params.calculated_by ?? null,
        params.calculation_method ?? 'quick_estimate',
        params.confidence_level ?? 'medium',
        params.notes ?? null
      ];
      const result = await db.query(sql, values);
      return result.rows[0];
    }
  }

  /**
   * Get baseline with GI product info (for comparison use)
   * Note: For full GI product details, use existing GI product routes
   */
  static async getGiProductWithBaseline(gi_product_id: number): Promise<any> {
    const sql = `
      SELECT 
        p.id, p.name,
        json_build_object(
          'id', b.id,
          'material_co2', b.material_co2,
          'production_co2', b.production_co2,
          'dyeing_co2', b.dyeing_co2,
          'embroidery_co2', b.embroidery_co2,
          'packaging_co2', b.packaging_co2,
          'logistics_co2', b.logistics_co2,
          'total_co2', b.total_co2
        ) as baseline
      FROM gi_products p
      LEFT JOIN gi_product_carbon_baselines b 
        ON p.id = b.gi_product_id AND b.is_active = true
      WHERE p.id = $1
    `;
    const result = await db.query(sql, [gi_product_id]);
    if (result.rowCount === 0) throw new Error('GI product not found');
    return result.rows[0];
  }

  /**
   * PAGE 4: Delete a baseline
   */
  static async deleteBaseline(id: number): Promise<void> {
    const result = await db.query('DELETE FROM gi_product_carbon_baselines WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) throw new Error('Baseline not found');
  }

  /**
   * PAGE 4: Set a baseline as active
   */
  static async setBaselineActive(id: number): Promise<void> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const getBaseline = await client.query(
        'SELECT gi_product_id FROM gi_product_carbon_baselines WHERE id = $1',
        [id]
      );
      if (getBaseline.rowCount === 0) throw new Error('Baseline not found');

      const gi_product_id = getBaseline.rows[0].gi_product_id;

      await client.query(
        'UPDATE gi_product_carbon_baselines SET is_active = false WHERE gi_product_id = $1',
        [gi_product_id]
      );

      await client.query(
        'UPDATE gi_product_carbon_baselines SET is_active = true WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}