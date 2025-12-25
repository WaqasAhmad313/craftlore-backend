import type { Request, Response } from "express";
import { createGIProduct, fetchGIProducts, removeGIProduct, searchProductByName } from "./service.ts";
import {
  fetchGIProductById,
  fetchGIProductBySlug,
} from "./service.ts";

export async function getGIProductByIdController(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await fetchGIProductById(id);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching GI product:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch GI product",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function getGIProductBySlugController(req: Request, res: Response) {
  try {
    const slug = req.params.slug;

    const product = await fetchGIProductBySlug(slug);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching GI product by slug:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch GI product",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}


export async function createGIProductController(req: Request, res: Response) {
  try {
    const productId = await createGIProduct(req.body);
    res.status(201).json({
      success: true,
      productId,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create GI product",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getGIProductsController(req: Request, res: Response) {
  try {
    const products = await fetchGIProducts();
    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch GI products",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function deleteGIProductController(req: Request, res: Response) {
  const productId = Number(req.params.id);
  if (isNaN(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  try {
    await removeGIProduct(productId);
    res.status(200).json({
      success: true,
      message: `GI product with ID ${productId} deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to delete GI product with ID ${productId}`,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}


export async function searchProducts(req: Request, res: Response) {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ success: false, message: "Search query 'q' is required" });
    }
    const products = await searchProductByName(query);
    res.status(200).json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
