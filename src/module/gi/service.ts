import GICraftModel from './model.ts';

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
  static async getAllCrafts(filters: FilterOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const crafts = await GICraftModel.getAllCrafts();
      
      let filteredCrafts = crafts;

      // Apply search filter if provided
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredCrafts = filteredCrafts.filter(craft => 
          craft.name?.toLowerCase().includes(searchTerm) ||
          craft.gi_applicant?.toLowerCase().includes(searchTerm) ||
          craft.category?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply category filter if provided
      if (filters.category && filters.category !== 'all') {
        filteredCrafts = filteredCrafts.filter(
          craft => craft.category === filters.category
        );
      }

      return {
        success: true,
        data: filteredCrafts,
        total: filteredCrafts.length
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single craft by ID
   */
  static async getCraftById(id: number): Promise<ServiceResponse<any>> {
    try {
      const craft = await GICraftModel.getCraftById(id);
      
      if (!craft) {
        return {
          success: false,
          message: 'Craft not found'
        };
      }

      return {
        success: true,
        data: craft
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
        data: categories
      };
    } catch (error) {
      throw error;
    }
  }
}

export default GICraftService;



// import { giProductSchema } from "./validator.ts";
// import { insertGIProduct, getProducts, deleteProduct } from "./model.ts";
// import {
//   getGIProductById,
//   getGIProductBySlug,
//   type GIProduct,
// } from "./model.ts";

// export async function fetchGIProductById(id: number): Promise<GIProduct> {
//   const product = await getGIProductById(id);

//   if (!product) {
//     throw new Error(`GI product with ID ${id} not found`);
//   }

//   return product;
// }

// export async function fetchGIProductBySlug(slug: string): Promise<GIProduct> {
//   const product = await getGIProductBySlug(slug);

//   if (!product) {
//     throw new Error(`GI product with slug "${slug}" not found`);
//   }

//   return product;
// }


// export async function createGIProduct(payload: unknown): Promise<number> {
//   const parsed = giProductSchema.parse(payload);
//   return insertGIProduct(parsed);
// }
// export async function fetchGIProducts() {
//   return getProducts();
// }
// export async function removeGIProduct(productId: number): Promise<void> {
//   return deleteProduct(productId);
// }

// export async function searchProductByName(name:string){
//   const products = await getProducts();
//   return products.filter((product:any) => product.name.toLowerCase().includes(name.toLowerCase()));
// }