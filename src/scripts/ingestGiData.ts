import { createGIProduct } from "../module/gi/service.ts";
import giData from "./gi.ts";

async function run() {
  for (const payload of giData) {
    try {
      const id = await createGIProduct(payload);
      console.log("Inserted GI product:", id);
    } catch (err) {
      console.error("Failed payload:", payload.product?.gi_application_number, err);
    }
  }
  process.exit(0);
}

run();
