import { chromium, type Browser } from "playwright";

export interface ProductData {
  productId: string;
  imageUrl?: string;
  attributes: Record<string, string>;
  authorizedGIUser?: string;
  artisan?: string;
  invalid?: boolean;
}

export class ScraperService {
  async scrapeProduct(productId: string): Promise<ProductData> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      // 1. Go to the main page
      await page.goto("https://cdiptqccgi.com/", {
        timeout: 30000,
        waitUntil: "domcontentloaded",
      });

      // 2. Fill input
      const inputSelector = "input[name='qrcode']";
      await page.waitForSelector(inputSelector, { timeout: 10000 });
      await page.fill(inputSelector, productId);

      // 3. Click the submit link/button
      const submitSelector = "#locationsubmit";
      await page.click(submitSelector);

      // 4. Wait for either the table or invalid message
      const tableSelector = "table";
      const invalidSelector = "h3";

      await Promise.race([
        page.waitForSelector(tableSelector, { timeout: 15000 }).catch(() => null),
        page.waitForSelector(invalidSelector, { timeout: 15000 }).catch(() => null),
      ]);

      // 5. Check if product is invalid
      const isInvalid = await page
        .$eval(
          invalidSelector,
          (el) =>
            el.textContent?.includes("This is not a Genuine Product !") ?? false
        )
        .catch(() => false);

      if (isInvalid) {
        return {
          productId,
          invalid: true,
          attributes: {},
        };
      }

      // 6. Extract table data and image
      const tableData = await page.evaluate(() => {
        const table = document.querySelector("table");
        if (!table) return { imageUrl: undefined, rows: [] as string[][] };

        const data: string[][] = [];
        const rows: NodeListOf<HTMLTableRowElement> = table.querySelectorAll("tr");

        // Try to get image URL from the first row
        const firstRowImg =
          table.querySelector<HTMLImageElement>("tr:first-child img")?.src ??
          undefined;

        rows.forEach((row: HTMLTableRowElement) => {
          const cells: string[] = Array.from(
            row.querySelectorAll<HTMLTableCellElement>("th, td")
          ).map((cell) => cell.textContent?.trim() ?? "");
          // Skip empty rows
          if (cells.some((c) => c !== "")) data.push(cells);
        });

        return { imageUrl: firstRowImg, rows: data };
      });

      if (!tableData.rows.length) {
        // No table rows found, treat as invalid product
        return { productId, invalid: true, attributes: {} };
      }

      // 7. Convert table data to a clean object
      const attributes: Record<string, string> = {};
      let authorizedGIUser: string | undefined;
      let artisan: string | undefined;

      for (const row of tableData.rows) {
        if (row.length < 2) continue;

        const key = row[0] ?? "";
        const value = row[1] ?? "";

        if (!key && !value) continue;

        const lowerKey = key.toLowerCase();

        if (lowerKey.includes("authorized gi user")) authorizedGIUser = value || undefined;
        else if (lowerKey.includes("artisan") || lowerKey.includes("weaver")) artisan = value || undefined;
        else if (key && value) attributes[key] = value;
      }

      // Build the return object with only non-empty optional fields
      const result: ProductData = {
        productId,
        attributes,
        ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
        ...(authorizedGIUser ? { authorizedGIUser } : {}),
        ...(artisan ? { artisan } : {}),
      };

      return result;
    } catch (error) {
      console.error("[ScraperService] scrapeProduct error:", error);
      throw new Error("Failed to scrape the product");
    } finally {
      if (browser) await browser.close();
    }
  }
}
