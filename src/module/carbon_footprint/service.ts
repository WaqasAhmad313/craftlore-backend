import { CarbonFootprintModel } from "./model.ts";

export class CarbonFootprintService {
  
  /**
   * HYBRID CALCULATOR - works for both quick estimate AND professional assessment
   * Automatically detects mode based on input
   */
  static async calculate(params: any, userId?: number, sessionId?: string): Promise<any> {
    // Detect mode based on input structure
    const isProfessionalMode = params.materials && params.processes;
    
    if (isProfessionalMode) {
      return this.calculateProfessional(params, userId, sessionId);
    } else {
      return this.calculateQuick(params, userId, sessionId);
    }
  }

  /**
   * QUICK MODE: Calculate using dropdown selections
   */
  private static async calculateQuick(params: any, userId?: number, sessionId?: string): Promise<any> {
    const productWeights = await CarbonFootprintModel.getConfig('product_weights');
    const weight = params.product_size ? productWeights[params.product_size]?.avg / 1000 : 0.25;

    const breakdown = { material: 0, production: 0, dyeing: 0, embroidery: 0, packaging: 0, logistics: 0 };

    // Material
    if (params.material) {
      const materials = await CarbonFootprintModel.getFactorsByType('material');
      const material = materials.find(f => f.factor_key === params.material);
      if (material?.factor_data.co2_value) breakdown.material = material.factor_data.co2_value * weight;
    }

    // Production
    if (params.production_process) {
      const productions = await CarbonFootprintModel.getFactorsByType('production');
      const production = productions.find(f => f.factor_key === params.production_process);
      if (production?.factor_data.co2_value) breakdown.production = production.factor_data.co2_value;
    }

    // Dyeing
    if (params.dye_type) {
      const dyes = await CarbonFootprintModel.getFactorsByType('dyeing');
      const dye = dyes.find(f => f.factor_key === params.dye_type);
      if (dye?.factor_data.co2_value) breakdown.dyeing = dye.factor_data.co2_value * weight;
    }

    // Embroidery
    if (params.embroidery && params.embroidery !== 'None') {
      const embroideries = await CarbonFootprintModel.getFactorsByType('embroidery');
      const embroidery = embroideries.find(f => f.factor_key === params.embroidery);
      if (embroidery?.factor_data.base_co2) {
        let impact = embroidery.factor_data.base_co2;
        if (params.embroidery_coverage && embroidery.factor_data.coverage_multipliers) {
          const multiplier = embroidery.factor_data.coverage_multipliers[params.embroidery_coverage];
          if (multiplier) impact *= multiplier;
        }
        if (params.embroidery_thread && embroidery.factor_data.thread_adjustments) {
          const adjustment = embroidery.factor_data.thread_adjustments[params.embroidery_thread];
          if (adjustment) impact += adjustment;
        }
        breakdown.embroidery = impact;
      }
    }

    // Packaging
    if (params.packaging && Array.isArray(params.packaging)) {
      const packagings = await CarbonFootprintModel.getFactorsByType('packaging');
      breakdown.packaging = params.packaging.reduce((sum: number, pkg: string) => {
        const item = packagings.find(f => f.factor_key === pkg);
        return sum + (item?.factor_data.co2_value || 0);
      }, 0);
    }

    // Logistics
    if (params.logistics) {
      const logistics = await CarbonFootprintModel.getFactorsByType('logistics');
      const logistic = logistics.find(f => f.factor_key === params.logistics);
      if (logistic?.factor_data.co2_value) breakdown.logistics = logistic.factor_data.co2_value;
    }

    const subtotal = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    // Certifications
    let certificationOffset = 0;
    if (params.certifications && Array.isArray(params.certifications)) {
      const certs = await CarbonFootprintModel.getFactorsByType('certification');
      const totalOffset = params.certifications.reduce((sum: number, cert: string) => {
        const item = certs.find(f => f.factor_key === cert);
        return sum + (item?.factor_data.co2_value || 0);
      }, 0);
      certificationOffset = (subtotal * totalOffset) / 100;
    }

    const finalCO2 = Math.max(0, subtotal + certificationOffset);
    const comparisons = await this.getBaselineComparisons(finalCO2);

    const result = {
      calculation_mode: 'quick_estimate',
      total_co2: finalCO2,
      breakdown,
      certification_offset: certificationOffset,
      comparisons,
      sustainability_rating: this.getSustainabilityRating(finalCO2),
    };

    await CarbonFootprintModel.saveCalculation({
      calculation_type: 'quick_estimate',
      user_id: userId,
      session_id: sessionId,
      product_config: params,
      calculation_result: result,
      total_co2: finalCO2,
      confidence_level: this.determineConfidence(params),
      region: params.region || 'kashmir',
    });

    return result;
  }

  /**
   * PROFESSIONAL MODE: Calculate using detailed custom values
   */
  private static async calculateProfessional(params: any, userId?: number, sessionId?: string): Promise<any> {
    const materialsCO2 = params.materials.reduce((sum: number, m: any) => sum + (m.qty * m.ef), 0);
    const processesCO2 = params.processes.reduce((sum: number, p: any) => sum + (p.activity * p.ef), 0);
    const localTransportCO2 = params.local_transport?.reduce((sum: number, leg: any) => {
      const tonneKm = leg.distance_km * (leg.weight_kg / 1000);
      return sum + (tonneKm * leg.ef_per_tkm);
    }, 0) || 0;

    let shippingCO2 = 0;
    if (params.shipping && params.shipping.length > 0) {
      let chargeableWeight = params.package_info?.actual_weight_kg || 0;
      if (params.package_info) {
        const volumetricWeight = (params.package_info.length_cm * params.package_info.width_cm * params.package_info.height_cm) / params.package_info.divisor;
        chargeableWeight = Math.max(params.package_info.actual_weight_kg, volumetricWeight);
      }
      shippingCO2 = params.shipping.reduce((sum: number, leg: any) => {
        const weight = (leg.mode === 'air' || leg.mode === 'courier') ? chargeableWeight : leg.weight_kg;
        const tonneKm = leg.distance_km * (weight / 1000);
        return sum + (tonneKm * leg.ef_per_tkm);
      }, 0);
    }

    let totalCO2 = materialsCO2 + processesCO2 + localTransportCO2;
    if (params.system_boundary === 'destination_port' || params.system_boundary === 'customer_estimate') {
      totalCO2 += shippingCO2;
    }

    const breakdown = {
      material: materialsCO2,
      production: processesCO2,
      dyeing: 0,
      embroidery: 0,
      packaging: 0,
      logistics: params.system_boundary === 'destination_port' || params.system_boundary === 'customer_estimate' ? shippingCO2 : localTransportCO2,
    };

    const comparisons = await this.getBaselineComparisons(totalCO2);

    const result = {
      calculation_mode: 'professional_assessment',
      total_co2: totalCO2,
      breakdown,
      system_boundary: params.system_boundary,
      data_tier: params.data_tier,
      comparisons,
      sustainability_rating: this.getSustainabilityRating(totalCO2),
    };

    await CarbonFootprintModel.saveCalculation({
      calculation_type: 'professional_assessment',
      user_id: userId,
      session_id: sessionId,
      product_config: params,
      calculation_result: result,
      total_co2: totalCO2,
      confidence_level: 'high',
      region: 'kashmir',
      system_boundary: params.system_boundary,
      data_tier: params.data_tier,
    });

    return result;
  }

  /**
   * Compare multiple products
   */
  static async compareProducts(products: any[], userId?: number, sessionId?: string): Promise<any> {
    const results = [];

    for (const product of products) {
      if (product.gi_product_id) {
        const giProduct = await CarbonFootprintModel.getGiProductWithBaseline(product.gi_product_id);
        if (giProduct.baseline && giProduct.baseline.total_co2) {
          results.push({
            name: product.product_name || giProduct.name,
            co2: giProduct.baseline.total_co2,
            breakdown: {
              material: giProduct.baseline.material_co2,
              production: giProduct.baseline.production_co2,
              dyeing: giProduct.baseline.dyeing_co2,
              embroidery: giProduct.baseline.embroidery_co2,
              packaging: giProduct.baseline.packaging_co2,
              logistics: giProduct.baseline.logistics_co2,
            },
            sustainability_rating: this.getSustainabilityRating(giProduct.baseline.total_co2),
          });
        }
      } else if (product.variation) {
        const calcResult = await this.calculate(product.variation);
        results.push({
          name: product.product_name,
          co2: calcResult.total_co2,
          breakdown: calcResult.breakdown,
          sustainability_rating: calcResult.sustainability_rating,
        });
      }
    }

    const sorted = [...results].sort((a, b) => a.co2 - b.co2);
    const comparisonResult = {
      products: results,
      best_choice: sorted[0]?.name || '',
      worst_choice: sorted[sorted.length - 1]?.name || '',
    };

    await CarbonFootprintModel.saveCalculation({
      calculation_type: 'comparison',
      user_id: userId,
      session_id: sessionId,
      product_config: { products },
      calculation_result: comparisonResult,
      total_co2: 0,
    });

    return comparisonResult;
  }

  private static async getBaselineComparisons(productCO2: number): Promise<any[]> {
    const baselines = await CarbonFootprintModel.getBaselines();
    return baselines.map(baseline => {
      const baselineCO2 = baseline.factor_data.avg_co2 || ((baseline.factor_data.min_co2 + baseline.factor_data.max_co2) / 2);
      const percentageBetter = ((baselineCO2 - productCO2) / baselineCO2) * 100;
      return {
        baseline_key: baseline.factor_key,
        baseline_name: baseline.factor_data.display_name || baseline.factor_key,
        baseline_co2: baselineCO2,
        percentage_better: Math.round(percentageBetter * 10) / 10,
      };
    });
  }

  private static determineConfidence(params: any): 'high' | 'medium' | 'low' {
    let dataPoints = 0;
    if (params.material) dataPoints++;
    if (params.production_process) dataPoints++;
    if (params.dye_type) dataPoints++;
    if (params.embroidery) dataPoints++;
    if (params.packaging) dataPoints++;
    if (params.logistics) dataPoints++;
    if (dataPoints >= 5) return 'high';
    if (dataPoints >= 3) return 'medium';
    return 'low';
  }

  private static getSustainabilityRating(co2: number): any {
    if (co2 < 5) return { rating: 'Excellent', stars: 5, color: '#10b981' };
    if (co2 < 10) return { rating: 'Very Good', stars: 4, color: '#84cc16' };
    if (co2 < 15) return { rating: 'Good', stars: 3, color: '#eab308' };
    if (co2 < 25) return { rating: 'Fair', stars: 2, color: '#f97316' };
    return { rating: 'Needs Improvement', stars: 1, color: '#ef4444' };
  }
}