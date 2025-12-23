import { giProductSchema } from "./validator.ts";
import { insertGIProduct } from "./model.ts";

export async function createGIProduct(payload: unknown): Promise<number> {
  const parsed = giProductSchema.parse(payload);
  return insertGIProduct(parsed);
}
