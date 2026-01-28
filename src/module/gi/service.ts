import GICraftModel from "./model.ts";
import type { GICraft, GICraftDetail, UpsertGIProductInput, UpsertGIProductResult, GIGoodsDetailsRow } from "./model.ts";

interface FilterOptions {
  search?: string;
  category?: string;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
}

class GICraftService {
  /**
   * Get all crafts with optional filtering
   */
  static async getAllCrafts(
    filters: FilterOptions = {}
  ): Promise<ServiceResponse<GICraft[]>> {
    try {
      const crafts = await GICraftModel.getAllCrafts();
      console.log("Total crafts fetched:", crafts.length);

      let filteredCrafts = crafts;

      // Apply search filter if provided
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredCrafts = filteredCrafts.filter(
          (craft) =>
            craft.name?.toLowerCase().includes(searchTerm) ||
            craft.gi_applicant?.toLowerCase().includes(searchTerm) ||
            craft.category?.toLowerCase().includes(searchTerm) ||
            craft.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply category filter if provided
      if (filters.category && filters.category !== "all") {
        filteredCrafts = filteredCrafts.filter(
          (craft) => craft.category === filters.category
        );
      }

      return {
        success: true,
        data: filteredCrafts,
        total: filteredCrafts.length,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single craft by ID with full details
   */
  static async getCraftById(
    id: number
  ): Promise<ServiceResponse<GICraftDetail>> {
    try {
      const craft = await GICraftModel.getCraftById(id);

      if (!craft) {
        return {
          success: false,
          message: "Craft not found",
        };
      }

      return {
        success: true,
        data: craft,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single craft by slug with full details
   */
  static async getCraftBySlug(
    slug: string
  ): Promise<ServiceResponse<GICraftDetail>> {
    try {
      const craft = await GICraftModel.getCraftBySlug(slug);

      if (!craft) {
        return {
          success: false,
          message: "Craft not found",
        };
      }

      return {
        success: true,
        data: craft,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all categories
   */
  static async getAllCategories(): Promise<ServiceResponse<string[]>> {
    try {
      const categories = await GICraftModel.getAllCategories();

      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteCraftById(id: number): Promise<ServiceResponse<null>> {
    if (!id) {
      return { success: false, message: "Craft ID is required" };
    }

    try {
      const result = await GICraftModel.deleteCraftById(id);

      if (result.status === "success") {
        return { success: true, message: result.message };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: "Unknown error" };
    }
  }

    /**
   * Create or update a GI craft
   */
  static async upsertCraft(
    payload: UpsertGIProductInput
  ): Promise<ServiceResponse<UpsertGIProductResult>> {
    try {
      const result = await GICraftModel.upsertCraft(payload);

      if (result.operation_status === "error") {
        return {
          success: false,
          message: result.message,
        };
      }

      return {
        success: true,
        data: result,
        message: result.message,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }

      return {
        success: false,
        message: "Unknown service error",
      };
    }
  }

   static async getAllCraftDetails(): Promise<ServiceResponse<GIGoodsDetailsRow[]>> {
    try {
      const crafts = await GICraftModel.getAllCraftDetails();

      return {
        success: true,
        data: crafts,
        total: crafts.length,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: "Unknown service error" };
    }
  }
}

export default GICraftService;
