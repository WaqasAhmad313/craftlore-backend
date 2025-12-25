import { db } from "../../config/db.ts";
import type { GIProductInput } from "./validator.ts";

export interface GIProduct {
  id: number;
  name: string;
  gi_application_number: number;
  gi_certificate_number: number;
  gi_journal_number: number;
  year_of_registration: number;
  class: number[];
  gi_applicant: string;
  slug: string;
  geographical_data?: any;
  technical_data?: any;
  authentication_data?: any;
  cultural_data?: any;
  economic_data?: any;
  created_at: Date;
  updated_at: Date;
}

export async function insertGIProduct(
  payload: GIProductInput
): Promise<number> {
  const result = await db.query<{ product_id: number }>(
    `SELECT insert_gi_product_full_updated($1::jsonb) AS product_id`,
    [payload]
  );

  if (result.rowCount !== 1 || !result.rows[0]) {
    throw new Error("GI product insertion failed: no product_id returned");
  }

  return result.rows[0].product_id;
}

export async function getProducts() {
  const result = await db.query("SELECT * FROM get_gi_products_list();");
  return result.rows;
}

export async function deleteProduct(productId: number): Promise<void>  {
  const query = `SELECT * FROM delete_gi_product($1);`;
  const result = await db.query(query, [productId]);

  if (result.rowCount !== 1) {
    throw new Error(`Failed to delete GI product with ID: ${productId}`);
}
  return result.rows[0];
}


export async function getGIProductById(id: number): Promise<GIProduct | null> {
  const result = await db.query<GIProduct>(
    `SELECT * FROM get_gi_product(p_product_id := $1)`,
    [id]
  );

  return result.rows[0] || null;
}

export async function getGIProductBySlug(slug: string): Promise<GIProduct | null> {
  const result = await db.query<GIProduct>(
    `SELECT * FROM get_gi_product(p_slug := $1)`,
    [slug]
  );

  return result.rows[0] || null;
}