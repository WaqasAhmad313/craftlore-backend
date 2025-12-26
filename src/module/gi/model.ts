import { db } from "../../config/db.ts";
import type { QueryResult } from "pg";

interface GICraft {
  id: number;
  name: string;
  gi_application_number: number;
  gi_certificate_number: number;
  gi_journal_number: number;
  year_of_registration: number;
  class: number[];
  gi_applicant: string;
  slug: string;
  description: string;
  category: string;
  registered_artisans: number;
  created_at: Date;
  updated_at: Date;
}

interface GICraftDetail extends GICraft {
  geographical_data: any;
  technical_data: any;
  authentication_data: any;
  cultural_data: any;
  economic_data: any;
}

class GICraftModel {
  /**
   * Get all GI crafts by calling the database function
   */
  static async getAllCrafts(): Promise<GICraft[]> {
    try {
      const result: QueryResult<GICraft> = await db.query(
        "SELECT * FROM get_all_gi_crafts()"
      );
      return result.rows;
    } catch (error: any) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get a single craft by ID with full details
   */
  static async getCraftById(id: number): Promise<GICraftDetail | undefined> {
    try {
      const result: QueryResult<GICraftDetail> = await db.query(
        "SELECT * FROM get_gi_product($1, NULL)",
        [id]
      );
      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get a single craft by slug with full details
   */
  static async getCraftBySlug(
    slug: string
  ): Promise<GICraftDetail | undefined> {
    try {
      const result: QueryResult<GICraftDetail> = await db.query(
        "SELECT * FROM get_gi_product(NULL, $1)",
        [slug]
      );
      return result.rows[0];
    } catch (error: any) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get all unique categories
   */
  static async getAllCategories(): Promise<string[]> {
    try {
      const result: QueryResult<{ category: string }> = await db.query(
        "SELECT DISTINCT category FROM gi_products WHERE category IS NOT NULL ORDER BY category"
      );
      return result.rows.map((row) => row.category);
    } catch (error: any) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Delete a GI craft by ID using the database function
   */
  static async deleteCraftById(
    id: number
  ): Promise<{ status: string; message: string }> {
    const query = "SELECT * FROM delete_gi_product($1)";
    const values = [id];

    try {
      const result = await db.query<{ status: string; message: string }>(
        query,
        values
      );
      return (
        result.rows[0] ?? {
          status: "error",
          message: "Unknown error: no result from database",
        }
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error("Unknown database error");
    }
  }
}

export default GICraftModel;
export type { GICraft, GICraftDetail };
