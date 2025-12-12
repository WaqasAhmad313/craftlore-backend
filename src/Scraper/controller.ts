import type { Request, Response } from "express";
import { ScraperService } from "./service.ts";

const scraperService = new ScraperService();

export class ScraperController {
  async scrape(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.body;

      if (!productId || typeof productId !== "string") {
        res.status(400).json({ error: "productId is required and must be a string" });
        return;
      }

      const result = await scraperService.scrapeProduct(productId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("[ScraperController] scrape error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
