import { insertGIProduct } from "./model.ts";
import type { GIProductPayload } from "./types.ts";

export async function createGIProduct(
  payload: GIProductPayload
): Promise<number> {
  // future: transaction, idempotency, logging
  return insertGIProduct(payload);
}
