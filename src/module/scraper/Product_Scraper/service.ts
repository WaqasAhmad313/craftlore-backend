// import { chromium, type Browser } from "playwright";

// export interface ProductData {
//   productId: string;
//   imageUrl?: string;
//   attributes: Record<string, string>;
//   authorizedGIUser?: string;
//   artisan?: string;
//   invalid?: boolean;
// }

// type QueueItem = {
//   productId: string;
//   resolve: (data: ProductData) => void;
//   reject: (error: Error) => void;
// };

// const queue: QueueItem[] = [];
// let isProcessing = false;

// // Simple in-memory cache
// const cache = new Map<string, ProductData>();

// export class ScraperService {
//   async scrapeProduct(productId: string): Promise<ProductData> {
//     const cached = cache.get(productId);
//     if (cached) return cached;

//     return new Promise<ProductData>((resolve, reject) => {
//       queue.push({ productId, resolve, reject });
//       this.processQueue().catch(err => {
//         console.error("[Queue] Failed to process queue:", err);
//       });
//     });
//   }

//   private async processQueue(): Promise<void> {
//     if (isProcessing) return;

//     const item = queue.shift();
//     if (!item) return;

//     isProcessing = true;

//     try {
//       const result = await this.runScraper(item.productId);
//       cache.set(item.productId, result);
//       item.resolve(result);
//     } catch (err) {
//       console.error(
//         `[ScraperService] Failed for productId=${item.productId}`,
//         err
//       );
//       item.reject(err instanceof Error ? err : new Error("Scrape failed"));
//     } finally {
//       isProcessing = false;

//       if (queue.length > 0) {
//         this.processQueue().catch(err => {
//           console.error("[Queue] Error continuing queue:", err);
//         });
//       }
//     }
//   }

//   private async runScraper(productId: string): Promise<ProductData> {
//     let browser: Browser | null = null;

//     try {
//       browser = await chromium.launch({ headless: true });
//       const page = await browser.newPage();

//       await page.goto("https://cdiptqccgi.com/", {
//         timeout: 30000,
//         waitUntil: "domcontentloaded",
//       });

//       await page.waitForSelector("input[name='qrcode']", { timeout: 10000 });
//       await page.fill("input[name='qrcode']", productId);
//       await page.click("#locationsubmit");

//       // Wait for table OR explicit invalid message
//       await page.waitForFunction(() => {
//         const table = document.querySelector("table");
//         const invalidMsg = Array.from(document.querySelectorAll("h3")).some(h =>
//           h.textContent?.trim() === "This is not a Genuine Product !"
//         );
//         return table || invalidMsg;
//       }, { timeout: 15000 });

//       // Explicit invalid detection
//       const isInvalid = await page.evaluate(() => {
//         const headings = Array.from(document.querySelectorAll("h3"));
//         return headings.some(h =>
//           h.textContent?.trim() === "This is not a Genuine Product !"
//         );
//       });

//       if (isInvalid) {
//         return {
//           productId,
//           invalid: true,
//           attributes: {},
//         };
//       }

//       // Extract table + image
//       const tableData = await page.evaluate(() => {
//         const table = document.querySelector("table");
//         if (!table) return { imageUrl: undefined, rows: [] as string[][] };

//         const rows: string[][] = [];

//         table.querySelectorAll("tr").forEach(tr => {
//           const cells = Array.from(tr.querySelectorAll("th, td"))
//             .map(td => td.textContent?.trim() ?? "")
//             .filter(Boolean);

//           if (cells.length >= 2) rows.push(cells);
//         });

//         const imageUrl =
//           table.querySelector<HTMLImageElement>("img")?.src ?? undefined;

//         return { imageUrl, rows };
//       });

//       // Empty table doesn't mean invalid
//       if (!tableData.rows.length) {
//         return {
//           productId,
//           invalid: false,
//           attributes: {},
//           ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
//         };
//       }

//       const attributes: Record<string, string> = {};
//       let authorizedGIUser: string | undefined;
//       let artisan: string | undefined;

//       for (const row of tableData.rows) {
//         if (row.length < 2) continue;

//         const key = row[0];
//         const value = row[1];

//         if (!key || !value) continue;

//         const lowerKey = key.toLowerCase();

//         if (lowerKey.includes("authorized gi user")) {
//           authorizedGIUser = value;
//         } else if (lowerKey.includes("artisan") || lowerKey.includes("weaver")) {
//           artisan = value;
//         } else {
//           attributes[key] = value;
//         }
//       }

//       return {
//         productId,
//         attributes,
//         ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
//         ...(authorizedGIUser ? { authorizedGIUser } : {}),
//         ...(artisan ? { artisan } : {}),
//         invalid: false,
//       };
//     } catch (err) {
//       console.error(
//         `[runScraper] Unexpected error for productId=${productId}`,
//         err
//       );
//       throw new Error("Failed to scrape product data");
//     } finally {
//       if (browser) {
//         try {
//           await browser.close();
//         } catch (err) {
//           console.error("[Browser] Failed to close browser cleanly", err);
//         }
//       }
//     }
//   }
// }




import { chromium, type Browser, type Page } from "playwright";

export interface ProductData {
  productId: string;
  imageUrl?: string;
  attributes: Record<string, string>;
  authorizedGIUser?: string;
  artisan?: string;
  invalid: boolean;
  source: "primary" | "secondary";
}

type QueueItem = {
  productId: string;
  resolve: (data: ProductData) => void;
  reject: (error: Error) => void;
};

interface TableExtractionResult {
  imageUrl: string | undefined;
  rows: string[][];
}

const queue: QueueItem[] = [];
let isProcessing = false;

// Simple in-memory cache
const cache = new Map<string, ProductData>();

// Configuration
const CONFIG = {
  PRIMARY_TIMEOUT: 30000,
  SECONDARY_TIMEOUT: 60000, // Increased to 60s
  SECONDARY_RETRIES: 2, // Retry secondary site
  SELECTOR_TIMEOUT: 10000,
  WAIT_UNTIL_PRIMARY: "domcontentloaded" as const,
  WAIT_UNTIL_SECONDARY: "networkidle" as const, // Try networkidle for secondary
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export class ScraperService {
  /**
   * Main entry point for scraping a product
   */
  async scrapeProduct(productId: string): Promise<ProductData> {
    console.log(`[scrapeProduct] Received request for productId: ${productId}`);

    const cached = cache.get(productId);
    if (cached) {
      console.log(
        `[scrapeProduct] Cache HIT for productId: ${productId}`,
        cached
      );
      return cached;
    }

    console.log(`[scrapeProduct] Cache MISS for productId: ${productId}`);
    console.log(`[scrapeProduct] Adding to queue. Current queue length: ${queue.length}`);

    return new Promise<ProductData>((resolve, reject) => {
      queue.push({ productId, resolve, reject });
      this.processQueue().catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[scrapeProduct] Failed to process queue:", error.message);
      });
    });
  }

  /**
   * Process the queue one item at a time
   */
  private async processQueue(): Promise<void> {
    if (isProcessing) {
      console.log("[processQueue] Already processing, skipping...");
      return;
    }

    const item = queue.shift();
    if (!item) {
      console.log("[processQueue] Queue is empty, nothing to process");
      return;
    }

    console.log(
      `[processQueue] Starting to process productId: ${item.productId}`
    );
    console.log(`[processQueue] Remaining items in queue: ${queue.length}`);

    isProcessing = true;

    try {
      console.log(
        `[processQueue] Running scraper with fallback for: ${item.productId}`
      );
      const result = await this.runScraperWithFallback(item.productId);

      console.log(
        `[processQueue] Scraping successful for ${item.productId}:`,
        JSON.stringify(result, null, 2)
      );

      cache.set(item.productId, result);
      console.log(
        `[processQueue] Cached result for ${item.productId}. Cache size: ${cache.size}`
      );

      item.resolve(result);
      console.log(`[processQueue] Resolved promise for ${item.productId}`);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[processQueue] Failed for productId=${item.productId}:`,
        error.message,
        error.stack
      );
      item.reject(error);
      console.log(`[processQueue] Rejected promise for ${item.productId}`);
    } finally {
      isProcessing = false;
      console.log(`[processQueue] Finished processing ${item.productId}`);

      if (queue.length > 0) {
        console.log(
          `[processQueue] Queue not empty (${queue.length} items), continuing...`
        );
        this.processQueue().catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error(
            "[processQueue] Error continuing queue:",
            error.message
          );
        });
      } else {
        console.log("[processQueue] Queue is now empty");
      }
    }
  }

  /**
   * Orchestrates fallback logic between primary and secondary websites
   */
  private async runScraperWithFallback(
    productId: string
  ): Promise<ProductData> {
    console.log(
      `[runScraperWithFallback] Starting fallback scraping for: ${productId}`
    );

    let primaryResult: ProductData | null = null;
    let primaryError: Error | null = null;

    // Try primary website first
    console.log(
      `[runScraperWithFallback] Attempting primary website for: ${productId}`
    );
    try {
      primaryResult = await this.scrapePrimaryWebsite(productId);

      console.log(
        `[runScraperWithFallback] Primary site returned for ${productId}:`,
        JSON.stringify(primaryResult, null, 2)
      );

      // Check if we got valid data from primary
      const hasValidData =
        !primaryResult.invalid &&
        Object.keys(primaryResult.attributes).length > 0;

      console.log(
        `[runScraperWithFallback] Primary site validation - Invalid: ${primaryResult.invalid}, Attributes count: ${Object.keys(primaryResult.attributes).length}, HasValidData: ${hasValidData}`
      );

      if (hasValidData) {
        console.log(
          `[runScraperWithFallback] ✓ Primary site successful for ${productId}, returning result`
        );
        return { ...primaryResult, source: "primary" as const };
      }

      console.log(
        `[runScraperWithFallback] ⚠ Primary site returned invalid/empty for ${productId}, trying secondary...`
      );
    } catch (err: unknown) {
      primaryError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[runScraperWithFallback] ✗ Primary site failed for ${productId}:`,
        primaryError.message
      );
    }

    // Try secondary website with retries
    console.log(
      `[runScraperWithFallback] Attempting secondary website for: ${productId}`
    );
    
    let lastSecondaryError: Error | null = null;
    for (let attempt = 1; attempt <= CONFIG.SECONDARY_RETRIES; attempt++) {
      try {
        console.log(
          `[runScraperWithFallback] Secondary attempt ${attempt}/${CONFIG.SECONDARY_RETRIES} for ${productId}`
        );
        
        const secondaryResult = await this.scrapeSecondaryWebsite(productId);

        console.log(
          `[runScraperWithFallback] Secondary site returned for ${productId}:`,
          JSON.stringify(secondaryResult, null, 2)
        );

        // Check if secondary gave us valid data
        const hasValidData =
          !secondaryResult.invalid &&
          Object.keys(secondaryResult.attributes).length > 0;

        console.log(
          `[runScraperWithFallback] Secondary site validation - Invalid: ${secondaryResult.invalid}, Attributes count: ${Object.keys(secondaryResult.attributes).length}, HasValidData: ${hasValidData}`
        );

        if (hasValidData) {
          console.log(
            `[runScraperWithFallback] ✓ Secondary site successful for ${productId}, returning result`
          );
          return { ...secondaryResult, source: "secondary" as const };
        }

        // Secondary also returned invalid/empty
        console.log(
          `[runScraperWithFallback] ⚠ Secondary site also returned invalid/empty for ${productId}`
        );

        // Return secondary result (which indicates invalid) if primary failed completely
        if (primaryError) {
          console.log(
            `[runScraperWithFallback] Primary had error, returning secondary invalid result for ${productId}`
          );
          return { ...secondaryResult, source: "secondary" as const };
        }

        // Return primary result if both returned invalid/empty
        if (primaryResult) {
          console.log(
            `[runScraperWithFallback] Both returned invalid/empty, returning primary result for ${productId}`
          );
          return { ...primaryResult, source: "primary" as const };
        }

        // This shouldn't happen, but TypeScript needs assurance
        console.error(
          `[runScraperWithFallback] Unexpected state: no primary result and no primary error for ${productId}`
        );
        return { ...secondaryResult, source: "secondary" as const };

      } catch (secondaryErr: unknown) {
        lastSecondaryError =
          secondaryErr instanceof Error
            ? secondaryErr
            : new Error(String(secondaryErr));

        console.error(
          `[runScraperWithFallback] ✗ Secondary site attempt ${attempt}/${CONFIG.SECONDARY_RETRIES} failed for ${productId}:`,
          lastSecondaryError.message
        );

        if (attempt < CONFIG.SECONDARY_RETRIES) {
          const waitTime = 2000 * attempt; // Progressive backoff
          console.log(
            `[runScraperWithFallback] Waiting ${waitTime}ms before retry...`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All secondary attempts failed
    console.error(
      `[runScraperWithFallback] ✗ All secondary attempts (${CONFIG.SECONDARY_RETRIES}) failed for ${productId}`
    );

    // Both failed - throw error or return primary result
    if (primaryError && lastSecondaryError) {
      const combinedError = new Error(
        `Both scrapers failed for ${productId}. Primary: ${primaryError.message}, Secondary: ${lastSecondaryError.message}`
      );
      console.error(
        `[runScraperWithFallback] ✗✗ Both sites failed completely for ${productId}`,
        combinedError.message
      );
      throw combinedError;
    }

    // Primary gave us something (even if invalid), return it
    if (primaryResult) {
      console.log(
        `[runScraperWithFallback] Secondary failed but primary had result, returning primary for ${productId}`
      );
      return { ...primaryResult, source: "primary" as const };
    }

    // This shouldn't happen, but handle it
    console.error(
      `[runScraperWithFallback] Critical: No results from either scraper for ${productId}`
    );
    throw new Error(
      `No results from either scraper for ${productId}. Secondary error: ${lastSecondaryError?.message}`
    );
  }

  /**
   * Scrape from primary website (cdiptqccgi.com)
   */
  private async scrapePrimaryWebsite(
    productId: string
  ): Promise<ProductData> {
    console.log(`[scrapePrimaryWebsite] Starting for productId: ${productId}`);

    let browser: Browser | null = null;

    try {
      console.log(`[scrapePrimaryWebsite] Launching browser for ${productId}`);
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await browser.newContext({
        userAgent: CONFIG.USER_AGENT,
      });
      const page = await context.newPage();

      const targetUrl = "https://cdiptqccgi.com/";
      console.log(
        `[scrapePrimaryWebsite] Navigating to ${targetUrl} for ${productId}`
      );

      await page.goto(targetUrl, {
        timeout: CONFIG.PRIMARY_TIMEOUT,
        waitUntil: CONFIG.WAIT_UNTIL_PRIMARY,
      });

      console.log(
        `[scrapePrimaryWebsite] Page loaded, waiting for input[name='qrcode'] for ${productId}`
      );
      await page.waitForSelector("input[name='qrcode']", { 
        timeout: CONFIG.SELECTOR_TIMEOUT 
      });

      console.log(
        `[scrapePrimaryWebsite] Filling input with productId: ${productId}`
      );
      await page.fill("input[name='qrcode']", productId);

      console.log(
        `[scrapePrimaryWebsite] Clicking submit button (#locationsubmit) for ${productId}`
      );
      await page.click("#locationsubmit");

      console.log(
        `[scrapePrimaryWebsite] Waiting for result (table or invalid message) for ${productId}`
      );
      await page.waitForFunction(
        () => {
          const table = document.querySelector("table");
          const invalidMsg = Array.from(document.querySelectorAll("h3")).some(
            (h) =>
              h.textContent?.trim() === "This is not a Genuine Product !"
          );
          return table !== null || invalidMsg;
        },
        { timeout: 15000 }
      );

      console.log(
        `[scrapePrimaryWebsite] Checking for invalid message for ${productId}`
      );
      const isInvalid = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll("h3"));
        return headings.some(
          (h) =>
            h.textContent?.trim() === "This is not a Genuine Product !"
        );
      });

      if (isInvalid) {
        console.log(
          `[scrapePrimaryWebsite] Product marked as INVALID for ${productId}`
        );
        return {
          productId,
          invalid: true,
          attributes: {},
          source: "primary" as const,
        };
      }

      console.log(
        `[scrapePrimaryWebsite] Extracting table data for ${productId}`
      );
      const tableData = await page.evaluate((): TableExtractionResult => {
        const table = document.querySelector("table");
        if (!table) {
          return { imageUrl: undefined, rows: [] };
        }

        const rows: string[][] = [];
        table.querySelectorAll("tr").forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll("th, td"))
            .map((td) => td.textContent?.trim() ?? "")
            .filter(Boolean);
          if (cells.length >= 2) {
            rows.push(cells);
          }
        });

        const imageUrl = table.querySelector("img")?.src ?? undefined;
        return { imageUrl, rows };
      });

      console.log(
        `[scrapePrimaryWebsite] Extracted ${tableData.rows.length} rows, imageUrl: ${tableData.imageUrl ? "present" : "absent"} for ${productId}`
      );

      if (!tableData.rows.length) {
        console.log(
          `[scrapePrimaryWebsite] No table rows found (but not invalid) for ${productId}`
        );
        return {
          productId,
          invalid: false,
          attributes: {},
          source: "primary" as const,
          ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
        };
      }

      const attributes: Record<string, string> = {};
      let authorizedGIUser: string | undefined;
      let artisan: string | undefined;

      console.log(
        `[scrapePrimaryWebsite] Processing ${tableData.rows.length} rows for ${productId}`
      );
      for (const row of tableData.rows) {
        if (row.length < 2) {
          console.log(
            `[scrapePrimaryWebsite] Skipping row with insufficient cells: ${JSON.stringify(row)}`
          );
          continue;
        }

        const key = row[0];
        const value = row[1];

        if (!key || !value) {
          console.log(
            `[scrapePrimaryWebsite] Skipping row with empty key/value: ${JSON.stringify(row)}`
          );
          continue;
        }

        const lowerKey = key.toLowerCase();
        console.log(
          `[scrapePrimaryWebsite] Processing row - Key: "${key}", Value: "${value}"`
        );

        if (lowerKey.includes("authorized gi user")) {
          authorizedGIUser = value;
          console.log(
            `[scrapePrimaryWebsite] Found authorizedGIUser: ${value}`
          );
        } else if (
          lowerKey.includes("artisan") ||
          lowerKey.includes("weaver")
        ) {
          artisan = value;
          console.log(`[scrapePrimaryWebsite] Found artisan: ${value}`);
        } else {
          attributes[key] = value;
          console.log(
            `[scrapePrimaryWebsite] Added attribute: ${key} = ${value}`
          );
        }
      }

      const result: ProductData = {
        productId,
        attributes,
        invalid: false,
        source: "primary" as const,
        ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
        ...(authorizedGIUser ? { authorizedGIUser } : {}),
        ...(artisan ? { artisan } : {}),
      };

      console.log(
        `[scrapePrimaryWebsite] Successfully scraped primary for ${productId}:`,
        JSON.stringify(result, null, 2)
      );

      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[scrapePrimaryWebsite] Error scraping primary for ${productId}:`,
        error.message,
        error.stack
      );
      throw error;
    } finally {
      if (browser) {
        console.log(
          `[scrapePrimaryWebsite] Closing browser for ${productId}`
        );
        try {
          await browser.close();
          console.log(
            `[scrapePrimaryWebsite] Browser closed successfully for ${productId}`
          );
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error(
            `[scrapePrimaryWebsite] Failed to close browser for ${productId}:`,
            error.message
          );
        }
      }
    }
  }

  /**
   * Scrape from secondary website (iictsrinagarcarpet-gi.org)
   */
  private async scrapeSecondaryWebsite(
    productId: string
  ): Promise<ProductData> {
    console.log(
      `[scrapeSecondaryWebsite] Starting for productId: ${productId}`
    );

    let browser: Browser | null = null;

    try {
      console.log(`[scrapeSecondaryWebsite] Launching browser for ${productId}`);
      browser = await chromium.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      const context = await browser.newContext({
        userAgent: CONFIG.USER_AGENT,
        viewport: { width: 1920, height: 1080 },
      });
      const page = await context.newPage();

      const targetUrl = "https://iictsrinagarcarpet-gi.org/";
      console.log(
        `[scrapeSecondaryWebsite] Navigating to ${targetUrl} for ${productId} (timeout: ${CONFIG.SECONDARY_TIMEOUT}ms, waitUntil: ${CONFIG.WAIT_UNTIL_SECONDARY})`
      );

      try {
        await page.goto(targetUrl, {
          timeout: CONFIG.SECONDARY_TIMEOUT,
          waitUntil: CONFIG.WAIT_UNTIL_SECONDARY,
        });
        console.log(
          `[scrapeSecondaryWebsite] Page loaded successfully with ${CONFIG.WAIT_UNTIL_SECONDARY} for ${productId}`
        );
      } catch (gotoErr: unknown) {
        // Try with domcontentloaded if networkidle fails
        console.warn(
          `[scrapeSecondaryWebsite] Failed with ${CONFIG.WAIT_UNTIL_SECONDARY}, trying domcontentloaded...`
        );
        await page.goto(targetUrl, {
          timeout: CONFIG.SECONDARY_TIMEOUT,
          waitUntil: "domcontentloaded",
        });
        console.log(
          `[scrapeSecondaryWebsite] Page loaded successfully with domcontentloaded for ${productId}`
        );
      }

      console.log(
        `[scrapeSecondaryWebsite] Waiting for form .featured-content #verifyform for ${productId}`
      );
      await page.waitForSelector(".featured-content #verifyform", {
        timeout: CONFIG.SELECTOR_TIMEOUT,
      });

      console.log(
        `[scrapeSecondaryWebsite] Looking for input field in form for ${productId}`
      );

      // Try to find text input
      const inputExists = await page.$("#verifyform input[type='text']");

      if (inputExists) {
        console.log(
          `[scrapeSecondaryWebsite] Found input[type='text'], filling with ${productId}`
        );
        await page.fill("#verifyform input[type='text']", productId);
      } else {
        console.log(
          `[scrapeSecondaryWebsite] input[type='text'] not found, trying generic input for ${productId}`
        );
        await page.fill("#verifyform input", productId);
      }

      console.log(
        `[scrapeSecondaryWebsite] Clicking submit (#locationsubmit) for ${productId}`
      );
      await page.click("#locationsubmit");

      console.log(
        `[scrapeSecondaryWebsite] Waiting for result (table or invalid message) for ${productId}`
      );
      await page.waitForFunction(
        () => {
          const invalidMsg = document.querySelector(
            "h3.text-center.mb-4"
          )?.textContent?.trim();
          const table = document.querySelector(".table-responsive table");
          return (
            invalidMsg === "This is not a Genuine Carpet !" || table !== null
          );
        },
        { timeout: 15000 }
      );

      console.log(
        `[scrapeSecondaryWebsite] Checking for invalid message for ${productId}`
      );
      const isInvalid = await page.evaluate(() => {
        const heading = document.querySelector("h3.text-center.mb-4");
        return (
          heading?.textContent?.trim() === "This is not a Genuine Carpet !"
        );
      });

      if (isInvalid) {
        console.log(
          `[scrapeSecondaryWebsite] Product marked as INVALID for ${productId}`
        );
        return {
          productId,
          invalid: true,
          attributes: {},
          source: "secondary" as const,
        };
      }

      console.log(
        `[scrapeSecondaryWebsite] Extracting table data from tbody for ${productId}`
      );
      const tableData = await page.evaluate((): TableExtractionResult => {
        const table = document.querySelector(".table-responsive table");
        if (!table) {
          return { imageUrl: undefined, rows: [] };
        }

        const rows: string[][] = [];
        const tbody = table.querySelector("tbody");

        if (tbody) {
          tbody.querySelectorAll("tr").forEach((tr) => {
            const cells = Array.from(tr.querySelectorAll("td"))
              .map((td) => td.textContent?.trim() ?? "")
              .filter(Boolean);
            if (cells.length >= 2) {
              rows.push(cells);
            }
          });
        }

        const imageUrl = table.querySelector("img")?.src ?? undefined;
        return { imageUrl, rows };
      });

      console.log(
        `[scrapeSecondaryWebsite] Extracted ${tableData.rows.length} rows, imageUrl: ${tableData.imageUrl ? "present" : "absent"} for ${productId}`
      );

      if (!tableData.rows.length) {
        console.log(
          `[scrapeSecondaryWebsite] No table rows found (but not invalid) for ${productId}`
        );
        return {
          productId,
          invalid: false,
          attributes: {},
          source: "secondary" as const,
          ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
        };
      }

      const attributes: Record<string, string> = {};
      let authorizedGIUser: string | undefined;
      let artisan: string | undefined;

      console.log(
        `[scrapeSecondaryWebsite] Processing ${tableData.rows.length} rows for ${productId}`
      );
      for (const row of tableData.rows) {
        if (row.length < 2) {
          console.log(
            `[scrapeSecondaryWebsite] Skipping row with insufficient cells: ${JSON.stringify(row)}`
          );
          continue;
        }

        const key = row[0];
        const value = row[1];

        if (!key || !value) {
          console.log(
            `[scrapeSecondaryWebsite] Skipping row with empty key/value: ${JSON.stringify(row)}`
          );
          continue;
        }

        const lowerKey = key.toLowerCase();
        console.log(
          `[scrapeSecondaryWebsite] Processing row - Key: "${key}", Value: "${value}"`
        );

        if (lowerKey.includes("authorized gi user")) {
          authorizedGIUser = value;
          console.log(
            `[scrapeSecondaryWebsite] Found authorizedGIUser: ${value}`
          );
        } else if (
          lowerKey.includes("artisan") ||
          lowerKey.includes("weaver")
        ) {
          artisan = value;
          console.log(`[scrapeSecondaryWebsite] Found artisan: ${value}`);
        } else {
          attributes[key] = value;
          console.log(
            `[scrapeSecondaryWebsite] Added attribute: ${key} = ${value}`
          );
        }
      }

      const result: ProductData = {
        productId,
        attributes,
        invalid: false,
        source: "secondary" as const,
        ...(tableData.imageUrl ? { imageUrl: tableData.imageUrl } : {}),
        ...(authorizedGIUser ? { authorizedGIUser } : {}),
        ...(artisan ? { artisan } : {}),
      };

      console.log(
        `[scrapeSecondaryWebsite] Successfully scraped secondary for ${productId}:`,
        JSON.stringify(result, null, 2)
      );

      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[scrapeSecondaryWebsite] Error scraping secondary for ${productId}:`,
        error.message,
        error.stack
      );
      throw error;
    } finally {
      if (browser) {
        console.log(
          `[scrapeSecondaryWebsite] Closing browser for ${productId}`
        );
        try {
          await browser.close();
          console.log(
            `[scrapeSecondaryWebsite] Browser closed successfully for ${productId}`
          );
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error(
            `[scrapeSecondaryWebsite] Failed to close browser for ${productId}:`,
            error.message
          );
        }
      }
    }
  }
}