// -------------------------------------------------------------
// Shared primitives
// -------------------------------------------------------------

export type Status = "active" | "draft" | "archived";

export type CalculatorType = "carbon" | "material" | "chemical" | "durability";

export type FieldType =
  | "dropdown"
  | "multiselect"
  | "number"
  | "dimension"
  | "distance"
  | "text";

export type FieldRole =
  | "base"        // multiplied by weight → main CO2 component
  | "additive"    // flat value added to subtotal
  | "percent_modifier"  // percent applied on subtotal (negative = reduction)
  | "informational";    // shown to user, ignored in formula

export type ConfidenceLevel = "low" | "medium" | "high";

// -------------------------------------------------------------
// JSONB shape — config stored inside calculators.config
// -------------------------------------------------------------

export interface FieldOption {
  label: string;
  value: number;           // CO2 value or score value
  unit: string;            // kg_co2_per_kg | kg_co2_per_item | percent | score etc.
  justification: string;   // why this value — shown in Defender section
  source?: string;         // study, reference, or note
  display_order: number;
}

export interface CalculatorField {
  key: string;             // unique within this calculator e.g. "material_type"
  label: string;           // shown to user e.g. "Material Type"
  type: FieldType;
  role: FieldRole;
  required: boolean;
  unit?: string;           // for number/dimension/distance fields e.g. "kg" "cm"
  placeholder?: string;    // for text/number fields
  display_order: number;
  options: FieldOption[];  // empty array for number/dimension/text fields
}

export interface FormulaConfig {
  base_field: string;      // field key whose value is the base factor
  weight_field?: string;   // field key that provides weight (for weight_based calc)
  additives: string[];     // field keys added flat to subtotal
  percent_modifiers: string[]; // field keys applied as percent on subtotal
}

export interface PlacementCondition {
  always?: true;
  co2_above?: number;
  co2_below?: number;
  score_above?: number;
  score_below?: number;
}

export interface Placement {
  condition: PlacementCondition;
  headline: string;        // emotional hook
  body: string;            // the guilt/pride narrative
  cta_label: string;       // button text
  cta_url: string;         // ecommerce link
  display_order: number;
}

export interface RatingThreshold {
  max_score: number;       // score below or equal to this gets this label
  label: string;           // e.g. "Highly Sustainable"
  color: string;           // green | yellow | red
}

// The full JSONB config stored in calculators.config
export interface CalculatorConfig {
  fields: CalculatorField[];
  formula?: FormulaConfig;           // only for carbon calculator
  placements?: Placement[];          // only for carbon calculator
  rating_thresholds?: RatingThreshold[]; // only for material/chemical/durability
}

// -------------------------------------------------------------
// DB row types — raw rows returned from postgres
// -------------------------------------------------------------

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  display_order: number;
  icon: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface SubcategoryRow {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  display_order: number;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: number;
  subcategory_id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  ecommerce_url: string | null;
  display_order: number;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface CalculatorRow {
  id: number;
  product_id: number;
  type: CalculatorType;
  name: string;
  description: string | null;
  config: unknown;   // raw JSONB — parsed in service layer
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface CarbonFactorLibraryRow {
  id: number;
  name: string;
  category: string | null;
  value: string;     // pg numeric → string
  unit: string;
  justification: string | null;
  source: string | null;
  confidence: ConfidenceLevel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------
// Service input / output types
// -------------------------------------------------------------

// --- Category ---

export interface CreateCategoryInput {
  name: string;
  slug: string;
  display_order?: number;
  icon?: string;
  status?: Status;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  display_order?: number;
  icon?: string;
  status?: Status;
}

// --- Subcategory ---

export interface CreateSubcategoryInput {
  category_id: number;
  name: string;
  slug: string;
  display_order?: number;
  status?: Status;
}

export interface UpdateSubcategoryInput {
  name?: string;
  slug?: string;
  display_order?: number;
  status?: Status;
}

// --- Product ---

export interface CreateProductInput {
  subcategory_id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  ecommerce_url?: string;
  display_order?: number;
  status?: Status;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string;
  image_url?: string;
  ecommerce_url?: string;
  display_order?: number;
  status?: Status;
}

// --- Calculator ---

export interface CreateCalculatorInput {
  product_id: number;
  type: CalculatorType;
  name: string;
  description?: string;
  config: CalculatorConfig;
  status?: Status;
}

export interface UpdateCalculatorInput {
  name?: string;
  description?: string;
  config?: CalculatorConfig;
  status?: Status;
}

export interface PatchFieldsInput {
  fields: CalculatorField[];
}

export interface PatchFormulaInput {
  formula: FormulaConfig;
}

export interface PatchPlacementsInput {
  placements: Placement[];
}

// --- Carbon Factors Library ---

export interface CreateCarbonFactorInput {
  name: string;
  category?: string;
  value: number;
  unit: string;
  justification?: string;
  source?: string;
  confidence?: ConfidenceLevel;
}

export interface UpdateCarbonFactorInput {
  name?: string;
  category?: string;
  value?: number;
  unit?: string;
  justification?: string;
  source?: string;
  confidence?: ConfidenceLevel;
  is_active?: boolean;
}

// --- User-facing calculator ---

export interface CalculatorConfigResponse {
  calculator_id: number;
  type: CalculatorType;
  name: string;
  description: string | null;
  fields: CalculatorField[];
  formula: FormulaConfig | null;
  rating_thresholds: RatingThreshold[] | null;
}

export interface UserCalculationInput {
  product_id: number;
  calculator_type: CalculatorType;
  inputs: Record<string, unknown>;  // field_key → value(s)
}

export interface BreakdownItem {
  field_key: string;
  field_label: string;
  selected_option: string;
  co2_value: number;
  unit: string;
  role: FieldRole;
  justification: string;
  reduction_tip?: string; // shown if this field has high impact
}

export interface PlacementResult {
  headline: string;
  body: string;
  cta_label: string;
  cta_url: string;
}

export interface CarbonCalculationResult {
  total_kg_co2e: number;
  breakdown: BreakdownItem[];
  modifiers: Array<{
    field_key: string;
    field_label: string;
    selected_option: string;
    percent: number;
  }>;
  placement: PlacementResult | null;
  confidence: ConfidenceLevel;
  warnings: string[];
}

export interface ScoreCalculationResult {
  total_score: number;
  rating: string;
  color: string;
  breakdown: Array<{
    field_key: string;
    field_label: string;
    selected_option: string;
    score: number;
  }>;
}

export type CalculationResult = CarbonCalculationResult | ScoreCalculationResult;

// --- Pagination ---

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}