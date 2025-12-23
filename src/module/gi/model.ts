import { db } from "../../config/db.ts";
import type { GIProductInput } from "./validator.ts";

export async function insertGIProduct(
  payload: GIProductInput
): Promise<number> {
  const result = await db.query<
    { product_id: number }
  >(
    `SELECT insert_gi_product_full($1::jsonb) AS product_id`,
    [payload]
  );

   if (result.rowCount !== 1 || !result.rows[0]) {
    throw new Error("GI product insertion failed: no product_id returned");
  }

  return result.rows[0].product_id;
}
