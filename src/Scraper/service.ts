// import { chromium, type Browser } from "playwright";

// export interface ProductData {
//   productId: string;
//   imageUrl?: string;
//   attributes: Record<string, string>;
//   authorizedGIUser?: string;
//   artisan?: string;
//   invalid?: boolean;
// }

// export class ScraperService {
//   async scrapeProduct(productId: string): Promise<ProductData> {
//     let browser: Browser | null = null;

//     try {
//       browser = await chromium.launch({ headless: true });
//       const page = await browser.newPage();

//       // 1. Go to the main page
//       await page.goto("https://cdiptqccgi.com/", {
//         timeout: 30000,
//         waitUntil: "domcontentloaded",
//       });

//       // 2. Fill input
//       const inputSelector = "input[name='qrcode']";
//       await page.waitForSelector(inputSelector, { timeout: 10000 });
//       await page.fill(inputSelector, productId);

//       // 3. Click the submit link/button
//       const submitSelector = "#locationsubmit";
//       await page.click(submitSelector);

//       // 4. Wait for either the table or invalid message
//       const tableSelector = "table";
//       const invalidSelector = "h3";

//       await Promise.race([
//         page.waitForSelector(tableSelector, { timeout: 15000 }).catch(() => null),
//         page.waitForSelector(invalidSelector, { timeout: 15000 }).catch(() => null),
//       ]);

//       // 5. Check if product is invalid
//       const isInvalid = await page
//         .$eval(
//           invalidSelector,
//           (el) =>
//             el.textContent?.includes("This is not a Genuine Product !") ?? false
//         )
//         .catch(() => false);

//       if (isInvalid) {
//         return {
//           productId,
//           invalid: true,
//           attributes: {},
//         };
//       }

//       // 6. Extract table data and image
//       const tableData = await page.evaluate(() => {
//         const table = document.querySelector("table");
//         if (!table) return { imageUrl: undefined, rows: [] as string[][] };

//         const data: string[][] = [];
//         const rows: NodeListOf<HTMLTableRowElement> = table.querySelectorAll("tr");

//         // Try to get image URL from the first row
//         const firstRowImg =
//           table.querySelector<HTMLImageElement>("tr:first-child img")?.src ??
//           undefined;

//         rows.forEach((row: HTMLTableRowElement) => {
//           const cells: string[] = Array.from(
//             row.querySelectorAll<HTMLTableCellElement>("th, td")
//           ).map((cell) => cell.textContent?.trim() ?? "");
//           // Skip empty rows
//           if (cells.some((c) => c !== "")) data.push(cells);
//         });

//         return { imageUrl: firstRowImg, rows: data };
//       });

//       if (!tableData.rows.length) {
//         // No table rows found, treat as invalid product
//         return { productId, invalid: true, attributes: {} };
//       }

//       // 7. Convert table data to a clean object
//       const attributes: Record<string, string> = {};
//       let authorizedGIUser: string | undefined;
//       let artisan: string | undefined;

//       for (const row of tableData.rows) {
//         if (row.length < 2) continue;

//         const key = row[0] ?? "";
//         const value = row[1] ?? "";

//         if (!key && !value) continue;

//         const lowerKey = key.toLowerCase();

//         if (lowerKey.includes("authorized gi user")) authorizedGIUser = value || undefined;
//         else if (lowerKey.includes("artisan") || lowerKey.includes("weaver")) artisan = value || undefined;
//         else if (key && value) attributes[key] = value;
//       }

//       // Build the return object with only non-empty optional fields
//       const result: ProductData = {
//         productId,
//         attributes,
//         ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
//         ...(authorizedGIUser ? { authorizedGIUser } : {}),
//         ...(artisan ? { artisan } : {}),
//       };

//       return result;
//     } catch (error) {
//       console.error("[ScraperService] scrapeProduct error:", error);
//       throw new Error("Failed to scrape the product");
//     } finally {
//       if (browser) await browser.close();
//     }
//   }
// }

import { chromium, type Browser } from "playwright";

export interface ProductData {
  productId: string;
  imageUrl?: string;
  attributes: Record<string, string>;
  authorizedGIUser?: string;
  artisan?: string;
  invalid?: boolean;
}

/* -------------------- Queue + Cache -------------------- */

type QueueItem = {
  productId: string;
  resolve: (data: ProductData) => void;
  reject: (error: Error) => void;
};

const queue: QueueItem[] = [];
let isProcessing = false;

// Simple in-memory cache
const cache = new Map<string, ProductData>();

/* -------------------- Service -------------------- */

export class ScraperService {
  async scrapeProduct(productId: string): Promise<ProductData> {
    const cached = cache.get(productId);
    if (cached) return cached;

    return new Promise<ProductData>((resolve, reject) => {
      queue.push({ productId, resolve, reject });
      this.processQueue().catch(err => {
        console.error("[Queue] Failed to process queue:", err);
      });
    });
  }

  private async processQueue(): Promise<void> {
    if (isProcessing) return;

    const item = queue.shift();
    if (!item) return;

    isProcessing = true;

    try {
      const result = await this.runScraper(item.productId);
      cache.set(item.productId, result);
      item.resolve(result);
    } catch (err) {
      console.error(
        `[ScraperService] Failed for productId=${item.productId}`,
        err
      );
      item.reject(err instanceof Error ? err : new Error("Scrape failed"));
    } finally {
      isProcessing = false;

      if (queue.length > 0) {
        this.processQueue().catch(err => {
          console.error("[Queue] Error continuing queue:", err);
        });
      }
    }
  }

  private async runScraper(productId: string): Promise<ProductData> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto("https://cdiptqccgi.com/", {
        timeout: 30000,
        waitUntil: "domcontentloaded",
      });

      await page.waitForSelector("input[name='qrcode']", { timeout: 10000 });
      await page.fill("input[name='qrcode']", productId);
      await page.click("#locationsubmit");

      // Wait for table OR explicit invalid message
      await page.waitForFunction(() => {
        const table = document.querySelector("table");
        const invalidMsg = Array.from(document.querySelectorAll("h3")).some(h =>
          h.textContent?.trim() === "This is not a Genuine Product !"
        );
        return table || invalidMsg;
      }, { timeout: 15000 });

      // Explicit invalid detection
      const isInvalid = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll("h3"));
        return headings.some(h =>
          h.textContent?.trim() === "This is not a Genuine Product !"
        );
      });

      if (isInvalid) {
        return {
          productId,
          invalid: true,
          attributes: {},
        };
      }

      // Extract table + image
      const tableData = await page.evaluate(() => {
        const table = document.querySelector("table");
        if (!table) return { imageUrl: undefined, rows: [] as string[][] };

        const rows: string[][] = [];

        table.querySelectorAll("tr").forEach(tr => {
          const cells = Array.from(tr.querySelectorAll("th, td"))
            .map(td => td.textContent?.trim() ?? "")
            .filter(Boolean);

          if (cells.length >= 2) rows.push(cells);
        });

        const imageUrl =
          table.querySelector<HTMLImageElement>("img")?.src ?? undefined;

        return { imageUrl, rows };
      });

      // Empty table doesn't mean invalid
      if (!tableData.rows.length) {
        return {
          productId,
          invalid: false,
          attributes: {},
          ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
        };
      }

      /* -------------------- Normalize Data -------------------- */

      const attributes: Record<string, string> = {};
      let authorizedGIUser: string | undefined;
      let artisan: string | undefined;

      for (const row of tableData.rows) {
        if (row.length < 2) continue;

        const key = row[0];
        const value = row[1];

        if (!key || !value) continue;

        const lowerKey = key.toLowerCase();

        if (lowerKey.includes("authorized gi user")) {
          authorizedGIUser = value;
        } else if (lowerKey.includes("artisan") || lowerKey.includes("weaver")) {
          artisan = value;
        } else {
          attributes[key] = value;
        }
      }

      return {
        productId,
        attributes,
        ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
        ...(authorizedGIUser ? { authorizedGIUser } : {}),
        ...(artisan ? { artisan } : {}),
        invalid: false,
      };
    } catch (err) {
      console.error(
        `[runScraper] Unexpected error for productId=${productId}`,
        err
      );
      throw new Error("Failed to scrape product data");
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (err) {
          console.error("[Browser] Failed to close browser cleanly", err);
        }
      }
    }
  }
}
