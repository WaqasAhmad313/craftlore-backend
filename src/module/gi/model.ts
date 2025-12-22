import { Pool } from "pg";
import type { GIProductPayload } from "./types.ts";

const pool = new Pool(); 

export async function insertGIProduct(
  payload: GIProductPayload
): Promise<number> {
  const query = `
    SELECT insert_gi_product_full($1::jsonb) AS product_id;
  `;

  const result = await pool.query(query, [payload]);
  return result.rows[0].product_id;
}
