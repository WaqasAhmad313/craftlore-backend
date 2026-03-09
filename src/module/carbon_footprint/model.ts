// =============================================================
// model.ts — CLEE Calculator Module
// Raw DB access only. No business logic.
// =============================================================

import { db } from "../../config/db.ts";
import type {
  CategoryRow,
  CalculatorRow,
  CreateCalculatorInput,
  CreateCategoryInput,
  CreateProductInput,
  CreateSubcategoryInput,
  PaginationParams,
  ProductRow,
  SubcategoryRow,
  UpdateCalculatorInput,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateSubcategoryInput,
} from "./types.ts";

// =============================================================
// CategoryModel
// =============================================================

export class CategoryModel {
  static async create(input: CreateCategoryInput): Promise<CategoryRow> {
    const q = `
      INSERT INTO content.categories
        (name, slug, status)
      VALUES ($1, $2, $3)
      RETURNING id, name, slug, status, created_at, updated_at
    `;
    const r = await db.query<CategoryRow>(q, [
      input.name,
      input.slug,
      input.status ?? "active",
    ]);
    return r.rows[0]!;
  }

  static async findAll(params: PaginationParams): Promise<CategoryRow[]> {
    const q = `
      SELECT id, name, slug, status, created_at, updated_at
      FROM content.categories
      ORDER BY name ASC
      LIMIT $1 OFFSET $2
    `;
    const r = await db.query<CategoryRow>(q, [params.limit, params.offset]);
    return r.rows;
  }

  static async countAll(): Promise<number> {
    const r = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM content.categories"
    );
    return parseInt(r.rows[0]!.count, 10);
  }

  static async findById(id: number): Promise<CategoryRow | null> {
    const q = `
      SELECT id, name, slug, status, created_at, updated_at
      FROM content.categories
      WHERE id = $1
      LIMIT 1
    `;
    const r = await db.query<CategoryRow>(q, [id]);
    return r.rows[0] ?? null;
  }

  static async findBySlug(slug: string): Promise<CategoryRow | null> {
    const q = `
      SELECT id, name, slug, status, created_at, updated_at
      FROM content.categories
      WHERE slug = $1
      LIMIT 1
    `;
    const r = await db.query<CategoryRow>(q, [slug]);
    return r.rows[0] ?? null;
  }

  static async update(
    id: number,
    input: UpdateCategoryInput
  ): Promise<CategoryRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.name !== undefined) { sets.push(`name = $${i++}`); values.push(input.name); }
    if (input.slug !== undefined) { sets.push(`slug = $${i++}`); values.push(input.slug); }
    if (input.status !== undefined) { sets.push(`status = $${i++}`); values.push(input.status); }

    if (sets.length === 0) return CategoryModel.findById(id);

    values.push(id);
    const q = `
      UPDATE content.categories
      SET ${sets.join(", ")}
      WHERE id = $${i}
      RETURNING id, name, slug, status, created_at, updated_at
    `;
    const r = await db.query<CategoryRow>(q, values);
    return r.rows[0] ?? null;
  }

  static async delete(id: number): Promise<boolean> {
    const r = await db.query(
      "DELETE FROM content.categories WHERE id = $1",
      [id]
    );
    return (r.rowCount ?? 0) > 0;
  }
}

// =============================================================
// SubcategoryModel
// =============================================================

export class SubcategoryModel {
  static async create(input: CreateSubcategoryInput): Promise<SubcategoryRow> {
    const q = `
      INSERT INTO content.subcategories
        (category_id, name, slug, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, category_id, name, slug, status, created_at, updated_at
    `;
    const r = await db.query<SubcategoryRow>(q, [
      input.category_id,
      input.name,
      input.slug,
      input.status ?? "active",
    ]);
    return r.rows[0]!;
  }

  static async findByCategoryId(
    categoryId: number,
    params: PaginationParams
  ): Promise<SubcategoryRow[]> {
    const q = `
      SELECT id, category_id, name, slug, status, created_at, updated_at
      FROM content.subcategories
      WHERE category_id = $1
      ORDER BY name ASC
      LIMIT $2 OFFSET $3
    `;
    const r = await db.query<SubcategoryRow>(q, [
      categoryId,
      params.limit,
      params.offset,
    ]);
    return r.rows;
  }

  static async countByCategoryId(categoryId: number): Promise<number> {
    const r = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM content.subcategories WHERE category_id = $1",
      [categoryId]
    );
    return parseInt(r.rows[0]!.count, 10);
  }

  static async findById(id: number): Promise<SubcategoryRow | null> {
    const q = `
      SELECT id, category_id, name, slug, status, created_at, updated_at
      FROM content.subcategories
      WHERE id = $1
      LIMIT 1
    `;
    const r = await db.query<SubcategoryRow>(q, [id]);
    return r.rows[0] ?? null;
  }

  static async findBySlug(slug: string): Promise<SubcategoryRow | null> {
    const q = `
      SELECT id, category_id, name, slug, status, created_at, updated_at
      FROM content.subcategories
      WHERE slug = $1
      LIMIT 1
    `;
    const r = await db.query<SubcategoryRow>(q, [slug]);
    return r.rows[0] ?? null;
  }

  static async update(
    id: number,
    input: UpdateSubcategoryInput
  ): Promise<SubcategoryRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.name !== undefined) { sets.push(`name = $${i++}`); values.push(input.name); }
    if (input.slug !== undefined) { sets.push(`slug = $${i++}`); values.push(input.slug); }
    if (input.status !== undefined) { sets.push(`status = $${i++}`); values.push(input.status); }

    if (sets.length === 0) return SubcategoryModel.findById(id);

    values.push(id);
    const q = `
      UPDATE content.subcategories
      SET ${sets.join(", ")}
      WHERE id = $${i}
      RETURNING id, category_id, name, slug, status, created_at, updated_at
    `;
    const r = await db.query<SubcategoryRow>(q, values);
    return r.rows[0] ?? null;
  }

  static async delete(id: number): Promise<boolean> {
    const r = await db.query(
      "DELETE FROM content.subcategories WHERE id = $1",
      [id]
    );
    return (r.rowCount ?? 0) > 0;
  }
}

// =============================================================
// ProductModel
// =============================================================

export class ProductModel {
  static async create(input: CreateProductInput): Promise<ProductRow> {
    const q = `
      INSERT INTO content.products
        (subcategory_id, name, slug, description, image_url, ecommerce_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, subcategory_id, name, slug, description, image_url, ecommerce_url,
                status, created_at, updated_at
    `;
    const r = await db.query<ProductRow>(q, [
      input.subcategory_id,
      input.name,
      input.slug,
      input.description ?? null,
      input.image_url ?? null,
      input.ecommerce_url ?? null,
      input.status ?? "active",
    ]);
    return r.rows[0]!;
  }

  static async findBySubcategoryId(
    subcategoryId: number,
    params: PaginationParams
  ): Promise<ProductRow[]> {
    const q = `
      SELECT id, subcategory_id, name, slug, description, image_url, ecommerce_url,
             status, created_at, updated_at
      FROM content.products
      WHERE subcategory_id = $1
      ORDER BY name ASC
      LIMIT $2 OFFSET $3
    `;
    const r = await db.query<ProductRow>(q, [
      subcategoryId,
      params.limit,
      params.offset,
    ]);
    return r.rows;
  }

  static async countBySubcategoryId(subcategoryId: number): Promise<number> {
    const r = await db.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM content.products WHERE subcategory_id = $1",
      [subcategoryId]
    );
    return parseInt(r.rows[0]!.count, 10);
  }

  static async findById(id: number): Promise<ProductRow | null> {
    const q = `
      SELECT id, subcategory_id, name, slug, description, image_url, ecommerce_url,
             status, created_at, updated_at
      FROM content.products
      WHERE id = $1
      LIMIT 1
    `;
    const r = await db.query<ProductRow>(q, [id]);
    return r.rows[0] ?? null;
  }

  static async findBySlug(slug: string): Promise<ProductRow | null> {
    const q = `
      SELECT id, subcategory_id, name, slug, description, image_url, ecommerce_url,
             status, created_at, updated_at
      FROM content.products
      WHERE slug = $1
      LIMIT 1
    `;
    const r = await db.query<ProductRow>(q, [slug]);
    return r.rows[0] ?? null;
  }

  static async update(
    id: number,
    input: UpdateProductInput
  ): Promise<ProductRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.name !== undefined) { sets.push(`name = $${i++}`); values.push(input.name); }
    if (input.slug !== undefined) { sets.push(`slug = $${i++}`); values.push(input.slug); }
    if (input.description !== undefined) { sets.push(`description = $${i++}`); values.push(input.description); }
    if (input.image_url !== undefined) { sets.push(`image_url = $${i++}`); values.push(input.image_url); }
    if (input.ecommerce_url !== undefined) { sets.push(`ecommerce_url = $${i++}`); values.push(input.ecommerce_url); }
    if (input.status !== undefined) { sets.push(`status = $${i++}`); values.push(input.status); }

    if (sets.length === 0) return ProductModel.findById(id);

    values.push(id);
    const q = `
      UPDATE content.products
      SET ${sets.join(", ")}
      WHERE id = $${i}
      RETURNING id, subcategory_id, name, slug, description, image_url, ecommerce_url,
                status, created_at, updated_at
    `;
    const r = await db.query<ProductRow>(q, values);
    return r.rows[0] ?? null;
  }

  static async delete(id: number): Promise<boolean> {
    const r = await db.query(
      "DELETE FROM content.products WHERE id = $1",
      [id]
    );
    return (r.rowCount ?? 0) > 0;
  }
}

// =============================================================
// CalculatorModel
// =============================================================

export class CalculatorModel {
  static async create(input: CreateCalculatorInput): Promise<CalculatorRow> {
    const q = `
      INSERT INTO content.calculators
        (product_id, type, name, description, config, status)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      RETURNING id, product_id, type, name, description, config, status, created_at, updated_at
    `;
    const r = await db.query<CalculatorRow>(q, [
      input.product_id,
      input.type,
      input.name,
      input.description ?? null,
      JSON.stringify(input.config),
      input.status ?? "draft",
    ]);
    return r.rows[0]!;
  }

  static async findByProductId(productId: number): Promise<CalculatorRow[]> {
    const q = `
      SELECT id, product_id, type, name, description, config, status, created_at, updated_at
      FROM content.calculators
      WHERE product_id = $1
      ORDER BY type ASC
    `;
    const r = await db.query<CalculatorRow>(q, [productId]);
    return r.rows;
  }

  static async findById(id: number): Promise<CalculatorRow | null> {
    const q = `
      SELECT id, product_id, type, name, description, config, status, created_at, updated_at
      FROM content.calculators
      WHERE id = $1
      LIMIT 1
    `;
    const r = await db.query<CalculatorRow>(q, [id]);
    return r.rows[0] ?? null;
  }

  static async findByProductIdAndType(
    productId: number,
    type: string
  ): Promise<CalculatorRow | null> {
    const q = `
      SELECT id, product_id, type, name, description, config, status, created_at, updated_at
      FROM content.calculators
      WHERE product_id = $1 AND type = $2
      LIMIT 1
    `;
    const r = await db.query<CalculatorRow>(q, [productId, type]);
    return r.rows[0] ?? null;
  }

  static async update(
    id: number,
    input: UpdateCalculatorInput
  ): Promise<CalculatorRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.name !== undefined) { sets.push(`name = $${i++}`); values.push(input.name); }
    if (input.description !== undefined) { sets.push(`description = $${i++}`); values.push(input.description); }
    if (input.status !== undefined) { sets.push(`status = $${i++}`); values.push(input.status); }
    if (input.config !== undefined) {
      sets.push(`config = $${i++}::jsonb`);
      values.push(JSON.stringify(input.config));
    }

    if (sets.length === 0) return CalculatorModel.findById(id);

    values.push(id);
    const q = `
      UPDATE content.calculators
      SET ${sets.join(", ")}
      WHERE id = $${i}
      RETURNING id, product_id, type, name, description, config, status, created_at, updated_at
    `;
    const r = await db.query<CalculatorRow>(q, values);
    return r.rows[0] ?? null;
  }

  static async patchConfig(
    id: number,
    configPatch: Record<string, unknown>
  ): Promise<CalculatorRow | null> {
    const q = `
      UPDATE content.calculators
      SET config = config || $1::jsonb
      WHERE id = $2
      RETURNING id, product_id, type, name, description, config, status, created_at, updated_at
    `;
    const r = await db.query<CalculatorRow>(q, [
      JSON.stringify(configPatch),
      id,
    ]);
    return r.rows[0] ?? null;
  }

  static async delete(id: number): Promise<boolean> {
    const r = await db.query(
      "DELETE FROM content.calculators WHERE id = $1",
      [id]
    );
    return (r.rowCount ?? 0) > 0;
  }
}