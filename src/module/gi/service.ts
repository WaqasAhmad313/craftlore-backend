import { giProductSchema } from "./validator.ts";
import { insertGIProduct, getProducts, deleteProduct } from "./model.ts";
import {
  getGIProductById,
  getGIProductBySlug,
  type GIProduct,
} from "./model.ts";

export async function fetchGIProductById(id: number): Promise<GIProduct> {
  const product = await getGIProductById(id);

  if (!product) {
    throw new Error(`GI product with ID ${id} not found`);
  }

  return product;
}

export async function fetchGIProductBySlug(slug: string): Promise<GIProduct> {
  const product = await getGIProductBySlug(slug);

  if (!product) {
    throw new Error(`GI product with slug "${slug}" not found`);
  }

  return product;
}


export async function createGIProduct(payload: unknown): Promise<number> {
  const parsed = giProductSchema.parse(payload);
  return insertGIProduct(parsed);
}
export async function fetchGIProducts() {
  return getProducts();
}
export async function removeGIProduct(productId: number): Promise<void> {
  return deleteProduct(productId);
}

export async function searchProductByName(name:string){
  const products = await getProducts();
  return products.filter((product:any) => product.name.toLowerCase().includes(name.toLowerCase()));
}