import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { createGIProduct } from "../module/gi/service.ts";
import { GILISTING } from "./gi.ts";

interface RawGIProduct {
  Name: string;
  GI_Application_Number: number;
  GI_Certificate_Number: number;
  GI_Journal_Number: number;
  Year_of_Registration: number;
  Class: string[];
  GI_Applicant: string;

  Geographical_Area?: any;
  Jurisdictional_Area?: any;
  Heritage_Note?: any;
  Resource_Areas?: any;
  Technical_Specifications?: any;
  Authentication?: any;
  Authenticity_Verification_Guide?: any;
  Finishing?: any;
  Documentation?: any;
  Certification_and_Compliance?: any;
  Certificates?: any;
  Export?: any;
  Export_Documentation?: any;
  Export_Requirements?: any;
  Counterfeits?: any;
  Verification_Centers?: any;

  [key: string]: any;
}


interface TransformedGIProduct {
  product: {
    gi_application_number: number;
    name: string;
    gi_certificate_number: number;
    gi_journal_number: number;
    year_of_registration: number;
    gi_applicant: string;
  };
  classes: number[];  
  specs: Record<string, any>;
}

function transformGIProduct(raw: RawGIProduct): TransformedGIProduct {
  const productFields = new Set([
    "Name",
    "GI_Application_Number",
    "GI_Certificate_Number",
    "GI_Journal_Number",
    "Year_of_Registration",
    "GI_Applicant",
    "Class",
  ]);

  const specs: Record<string, any> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (productFields.has(key) || value === undefined) {
      continue;
    }

    specs[key] = value;
  }

  return {
    product: {
      gi_application_number: raw.GI_Application_Number,
      name: raw.Name,
      gi_certificate_number: raw.GI_Certificate_Number,
      gi_journal_number: raw.GI_Journal_Number,
      year_of_registration: raw.Year_of_Registration,
      gi_applicant: raw.GI_Applicant,
    },
    classes: raw.Class.map((c) => parseInt(c, 10)),
    specs,
  };
}

async function run() {
  console.log(`🚀 Starting GI product seeding... (${GILISTING.length} products)`);

  let successCount = 0;
  let failCount = 0;

  const errors: Array<{
    name: string;
    appNumber: number;
    error: string;
  }> = [];

  for (const rawProduct of GILISTING) {
    try {
      const payload = transformGIProduct(rawProduct);
      const id = await createGIProduct(payload);

      successCount++;
      console.log(`Inserted: ${rawProduct.Name} (ID: ${id})`);
    } catch (err) {
      failCount++;

      const message = err instanceof Error ? err.message : String(err);

      errors.push({
        name: rawProduct.Name,
        appNumber: rawProduct.GI_Application_Number,
        error: message,
      });

      console.error(
        `Failed: ${rawProduct.Name} (App #${rawProduct.GI_Application_Number})`,
        message
      );
    }
  }

  console.log("\n========================================");
  console.log("Seeding Summary:");
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log("========================================\n");

  if (errors.length > 0) {
    console.log("Failed Products:");
    for (const e of errors) {
      console.log(`  • ${e.name} (App #${e.appNumber}): ${e.error}`);
    }
  }

  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("💥 Fatal error during seeding:", err);
  process.exit(1);
});