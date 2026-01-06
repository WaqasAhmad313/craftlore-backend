import { chromium, type Browser, type BrowserContext, type Page, type ElementHandle } from "playwright";

export interface AuthorizedUser {
  authorizedUserNo: string;
  authorizedUserName: string;
  authorizedUserAddress: string;
}

export interface ScraperResult {
  applicationNumber: string;
  status: string;
  authorizedUsers: AuthorizedUser[];
}

export class IPIndiaScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  private readonly baseUrl: string = "https://search.ipindia.gov.in/GIRPublic/Application/";

  // ---------- Lifecycle ----------

  private async ensureBrowserAndContext(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
      console.log("✅ Browser initialized");
    }

    if (!this.context) {
      this.context = await this.browser.newContext({
        ignoreHTTPSErrors: true,
      });
      console.log("✅ Context initialized (ignoreHTTPSErrors enabled)");
    }
  }

  public async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => undefined);
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
    console.log("✅ Browser closed");
  }

  // ---------- Main Scraping Method ----------

  public async scrapeApplicationData(applicationNumberRaw: string): Promise<ScraperResult> {
    const applicationNumber = applicationNumberRaw.trim();
    if (!applicationNumber) {
      throw new Error("Application number is empty");
    }

    await this.ensureBrowserAndContext();

    const context = this.context;
    if (!context) {
      throw new Error("Browser context not initialized");
    }

    let page: Page | null = null;

    try {
      page = await context.newPage();
      page.setDefaultTimeout(60000);

      console.log("\n🚀 Starting scraping process...");
      console.log(`📋 Application Number: ${applicationNumber}`);

      // Step 1: Navigate
      console.log(`\n🔍 Step 1: Navigating to ${this.baseUrl}`);
      await page.goto(this.baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("load", { timeout: 60000 }).catch(() => undefined);
      console.log("✅ Search page loaded");

      // Step 2: Fill search box
      console.log(`\n🔍 Step 2: Entering application number`);
      const searchSelector = 'input.form-control.input-sm[type="search"]';
      await page.waitForSelector(searchSelector, { timeout: 20000 });
      await page.fill(searchSelector, applicationNumber);

      console.log("⏳ Waiting for results...");
      await page.waitForSelector("tbody tr", { timeout: 20000 });
      await page.waitForTimeout(1200);
      console.log("✅ Results loaded");

      // Step 3: Click view link
      console.log(`\n🔍 Step 3: Opening details`);
      const clicked = await this.findAndClickViewLink(page, applicationNumber);
      if (!clicked) {
        throw new Error(`Application number ${applicationNumber} not found in search results`);
      }

      // Let details load
      await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => undefined);
      await page.waitForTimeout(1000);
      console.log("✅ Details page loaded");

      // Step 4: Extract status
      console.log(`\n🔍 Step 4: Extracting status`);
      const status = await this.extractApplicationStatus(page);
      console.log(`✅ Status: ${status}`);

      // Step 5: Extract authorized users
      console.log(`\n🔍 Step 5: Extracting authorized users`);
      const authorizedUsers = await this.extractAuthorizedUsers(page);
      console.log(`✅ Authorized users extracted: ${authorizedUsers.length}`);

      const result: ScraperResult = {
        applicationNumber,
        status,
        authorizedUsers,
      };

      console.log("\n📦 FINAL SCRAPER RESULT:");
      console.log(JSON.stringify(result, null, 2));

      return result;
    } catch (err: unknown) {
      const msg = this.errorMessage(err);

      if (msg.includes("ERR_CERT")) {
        throw new Error(`TLS/certificate error while accessing IPIndia: ${msg}`);
      }

      throw new Error(`Failed to scrape data: ${msg}`);
    } finally {
      if (page) {
        await page.close().catch(() => undefined);
      }
    }
  }

  // ---------- Helpers ----------

  private errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }

  private normalizeText(input: string): string {
    return input.replace(/\s+/g, " ").trim();
  }

  private async getText(el: ElementHandle<HTMLElement> | null): Promise<string> {
    if (!el) return "";
    const txt = await el.textContent();
    return this.normalizeText(txt ?? "");
  }

  /**
   * Clean Authorized User No by removing all spaces
   * Example: "AU / 1616 / GI /46 / 8" becomes "AU/1616/GI/46/8"
   */
  private cleanAuthorizedUserNo(input: string): string {
    return input.replace(/\s+/g, "");
  }

  // ---------- Page Actions ----------

  private async findAndClickViewLink(page: Page, applicationNumber: string): Promise<boolean> {
    const rows = await page.$$("tbody tr");
    console.log(`📊 Rows found: ${rows.length}`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      
      const appNoCell = await row.$('td.grid-cell[data-name="AppNo"]');

      const appNo = await this.getText(appNoCell as ElementHandle<HTMLElement> | null);
      if (!appNo) continue;

      console.log(`   Row ${i + 1}: AppNo=${appNo}`);

      if (appNo === applicationNumber) {
        const viewLink = await row.$('td.grid-cell[data-label="Details"] a[href*="/Details/"]');
        if (!viewLink) {
          console.error("❌ View link not found in matching row");
          return false;
        }

        await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => undefined),
          viewLink.click(),
        ]);

        return true;
      }
    }

    return false;
  }

  private async extractApplicationStatus(page: Page): Promise<string> {
    const rowsSelector =
      'div.cols12:has(h3:has-text("Application details")) table.tableData.responsiveTable tbody tr';

    await page.waitForSelector(rowsSelector, { timeout: 20000 });

    const rows = await page.$$(rowsSelector);
    console.log(`📊 Application details rows: ${rows.length}`);

    for (const row of rows) {
      if (!row) continue;
      
      const labelEl = await row.$("td.firstTd strong");
      const label = await this.getText(labelEl as ElementHandle<HTMLElement> | null);

      if (label === "Status") {
        const valueTd = await row.$("td:nth-child(2)");
        const value = await this.getText(valueTd as ElementHandle<HTMLElement> | null);

        if (!value) throw new Error("Status value empty");
        return value;
      }
    }

    throw new Error("Status not found on details page");
  }

  private async extractAuthorizedUsers(page: Page): Promise<AuthorizedUser[]> {
    const sectionSelector = 'div.cols12:has(h3:has-text("Authorized User Details"))';
    await page.waitForSelector(sectionSelector, { timeout: 20000 });

    // Set "All" if dropdown exists
    const lengthSelect = await page.$('select[name="AuthorizedUser_length"]');
    if (lengthSelect) {
      await lengthSelect.selectOption({ label: "All" }).catch(() => undefined);
      await page.waitForTimeout(1500);
    }

    // Headers
    await page.waitForSelector("table#AuthorizedUser thead th", { timeout: 20000 });
    const headerCells = await page.$$("table#AuthorizedUser thead th");

    const headers: string[] = [];
    for (const th of headerCells) {
      const t = await this.getText(th as ElementHandle<HTMLElement>);
      if (t) headers.push(t);
    }

    // Create a map of header names to their indices
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerMap[header] = index;
    });

    // Rows
    const rowSelector = "table#AuthorizedUser tbody tr";
    await page.waitForSelector(rowSelector, { timeout: 20000 });
    const dataRows = await page.$$(rowSelector);

    const authorizedUsers: AuthorizedUser[] = [];

    for (const row of dataRows) {
      if (!row) continue;
      
      const cells = await row.$$("td");

      // Extract only the required fields
      const authorizedUserNoIndex = headerMap["Authorized User No"];
      const authorizedUserNameIndex = headerMap["Authorized User Name"];
      const authorizedUserAddressIndex = headerMap["Authorized User Address"];

      // Check if required fields exist
      if (
        authorizedUserNoIndex === undefined ||
        authorizedUserNameIndex === undefined ||
        authorizedUserAddressIndex === undefined
      ) {
        console.warn("Required headers not found in table");
        continue;
      }

      const authorizedUserNo = await this.getText(cells[authorizedUserNoIndex] as ElementHandle<HTMLElement>);
      const authorizedUserName = await this.getText(cells[authorizedUserNameIndex] as ElementHandle<HTMLElement>);
      const authorizedUserAddress = await this.getText(cells[authorizedUserAddressIndex] as ElementHandle<HTMLElement>);

      // Only add if all required fields are present
      if (authorizedUserNo && authorizedUserName && authorizedUserAddress) {
        authorizedUsers.push({
          authorizedUserNo: this.cleanAuthorizedUserNo(authorizedUserNo),
          authorizedUserName,
          authorizedUserAddress,
        });
      }
    }

    return authorizedUsers;
  }
}

// Singleton instance
export const ipIndiaScraper = new IPIndiaScraper();