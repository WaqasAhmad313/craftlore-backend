// -------------------------------------------------------------
// Shared primitives
// -------------------------------------------------------------

export type Status = "active" | "draft" | "archived";

export type CalculatorType = "material" | "chemical" | "durability";

export type FieldType =
  | "dropdown"
  | "multiselect"
  | "number"
  | "dimension"
  | "distance"
  | "text";

export type FieldRole =
  | "base"              // base score value
  | "additive"          // flat score added to total
  | "percent_modifier"  // percent applied on total (negative = reduction)
  | "informational";    // shown to user, ignored in scoring

export type ConfidenceLevel = "low" | "medium" | "high";

// -------------------------------------------------------------
// JSONB shape — config stored inside calculators.config
// -------------------------------------------------------------

export interface FieldOption {
  label: string;
  value: number;           // score value
  unit: string;            // pts | percent | score etc.
  justification: string;   // why this value — shown in result breakdown
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

export interface RatingThreshold {
  max_score: number;       // score below or equal to this gets this label
  label: string;           // e.g. "Highly Sustainable"
  color: string;           // green | yellow | red
}

// The full JSONB config stored in calculators.config
export interface CalculatorConfig {
  fields: CalculatorField[];
  rating_thresholds?: RatingThreshold[];
}

// -------------------------------------------------------------
// DB row types — raw rows returned from postgres
// -------------------------------------------------------------

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface SubcategoryRow {
  id: number;
  category_id: number;
  name: string;
  slug: string;
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

// -------------------------------------------------------------
// Service input / output types
// -------------------------------------------------------------

// --- Category ---

export interface CreateCategoryInput {
  name: string;
  slug: string;
  status?: Status;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  status?: Status;
}

// --- Subcategory ---

export interface CreateSubcategoryInput {
  category_id: number;
  name: string;
  slug: string;
  status?: Status;
}

export interface UpdateSubcategoryInput {
  name?: string;
  slug?: string;
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
  status?: Status;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string;
  image_url?: string;
  ecommerce_url?: string;
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

// --- User-facing calculator ---

export interface CalculatorConfigResponse {
  calculator_id: number;
  type: CalculatorType;
  name: string;
  description: string | null;
  status: Status;
  fields: CalculatorField[];
  rating_thresholds: RatingThreshold[] | null;
}

export interface UserCalculationInput {
  product_id: number;
  calculator_type: CalculatorType;
  inputs: Record<string, unknown>;  // field_key → value(s)
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
    justification: string;
  }>;
}

export type CalculationResult = ScoreCalculationResult;

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