import { chromium, type Browser, type Page } from 'playwright';

interface AuthorizedUser {
  [key: string]: string;
}

interface ScraperResult {
  applicationNumber: string;
  status: string;
  authorizedUsers: AuthorizedUser[];
}

class IPIndiaScraperService {
  private browser: Browser | null = null;
  private readonly baseUrl: string = 'https://www.search.ipindia.gov.in/GIRPublic/Application/';

  /**
   * Initialize browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true, // Set to false for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('✅ Browser initialized successfully');
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('✅ Browser closed successfully');
    }
  }

  /**
   * Main scraping function
   */
  async scrapeApplicationData(applicationNumber: string): Promise<ScraperResult> {
    console.log('\n🚀 Starting scraping process...');
    console.log(`📋 Application Number: ${applicationNumber}`);
    
    let page: Page | null = null;

    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();
      console.log('📄 New page created');

      // Step 1: Navigate to search page
      console.log(`\n📍 Step 1: Navigating to ${this.baseUrl}`);
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      console.log('✅ Page loaded successfully');

      // Step 2: Enter application number in search box
      console.log(`\n📍 Step 2: Entering application number in search box`);
      const searchInput = await page.waitForSelector('input.form-control.input-sm[type="search"]', { timeout: 10000 });
      
      if (!searchInput) {
        throw new Error('Search input not found');
      }
      
      await searchInput.fill(applicationNumber);
      console.log(`✅ Entered application number: ${applicationNumber}`);
      
      // Wait for results to load
      console.log('⏳ Waiting for search results...');
      await page.waitForSelector('tbody', { timeout: 10000 });
      await page.waitForTimeout(1500); // Ensure results are fully loaded
      console.log('✅ Search results loaded');

      // Step 3: Find matching row and click View link
      console.log(`\n📍 Step 3: Finding matching row for application ${applicationNumber}`);
      const viewLinkClicked = await this.findAndClickViewLink(page, applicationNumber);
      
      if (!viewLinkClicked) {
        throw new Error(`Application number ${applicationNumber} not found in search results`);
      }
      console.log('✅ View link clicked, navigating to details page');

      // Wait for details page to load
      console.log('⏳ Waiting for details page to load...');
      await page.waitForSelector('div.cols12 h3', { timeout: 10000 });
      await page.waitForTimeout(1000); // Ensure page is fully loaded
      console.log('✅ Details page loaded');

      // Step 4: Extract application status
      console.log(`\n📍 Step 4: Extracting application status`);
      const status = await this.extractApplicationStatus(page);
      console.log(`✅ Status extracted: ${status}`);

      // Step 5: Extract authorized users data
      console.log(`\n📍 Step 5: Extracting authorized users data`);
      const authorizedUsers = await this.extractAuthorizedUsers(page);
      console.log(`✅ Authorized users extracted: ${authorizedUsers.length} users found`);

      const result: ScraperResult = {
        applicationNumber,
        status,
        authorizedUsers
      };

      console.log('\n📦 FINAL RESULT:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(JSON.stringify(result, null, 2));
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ Scraping completed successfully\n');

      return result;

    } catch (error) {
      console.error('\n❌ SCRAPING ERROR:');
      console.error('═══════════════════════════════════════════════════════════');
      if (error instanceof Error) {
        console.error(`Error Message: ${error.message}`);
        console.error(`Error Stack: ${error.stack || 'No stack trace available'}`);
      } else {
        console.error('Unknown error:', error);
      }
      console.error('═══════════════════════════════════════════════════════════\n');
      
      throw new Error(`Failed to scrape data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (page) {
        await page.close();
        console.log('🔒 Page closed');
      }
    }
  }

  /**
   * Find the matching application number row and click the View link
   */
  private async findAndClickViewLink(page: Page, applicationNumber: string): Promise<boolean> {
    console.log('🔍 Searching through table rows...');
    
    // Get all rows from tbody
    const rows = await page.$$('tbody tr');
    console.log(`📊 Found ${rows.length} rows in search results`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (!row) {
        continue;
      }

      // Find the Application Number cell
      const appNoCell = await row.$('td.grid-cell[data-name="AppNo"]');
      
      if (!appNoCell) {
        continue;
      }

      const cellText = await appNoCell.textContent();
      
      if (!cellText) {
        continue;
      }

      const trimmedCellText = cellText.trim();
      const trimmedAppNumber = applicationNumber.trim();

      console.log(`   Row ${i + 1}: Application Number = ${trimmedCellText}`);
      
      // Check if this row matches our application number
      if (trimmedCellText === trimmedAppNumber) {
        console.log(`✅ Match found at row ${i + 1}!`);
        
        // Find and click the View link in this row
        const viewLink = await row.$('td.grid-cell[data-label="Details"] a[href*="/Details/"]');
        
        if (!viewLink) {
          console.error('❌ View link not found in matching row');
          return false;
        }

        const href = await viewLink.getAttribute('href');
        console.log(`🔗 Clicking View link: ${href || 'N/A'}`);
        
        await viewLink.click();
        return true;
      }
    }

    console.error(`❌ No matching row found for application number: ${applicationNumber}`);
    return false;
  }

  /**
   * Extract application status from details page
   */
  private async extractApplicationStatus(page: Page): Promise<string> {
    console.log('🔍 Locating status in application details...');
    
    // Navigate through the nested structure to find status
    const statusSelector = 'div.cols12:has(h3:has-text("Application details")) table.tableData.responsiveTable tbody tr';
    
    // Get all rows in the application details table
    const rows = await page.$$(statusSelector);
    console.log(`📊 Found ${rows.length} rows in application details table`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (!row) {
        continue;
      }

      const firstTd = await row.$('td.firstTd strong');
      
      if (!firstTd) {
        continue;
      }

      const labelText = await firstTd.textContent();
      
      if (!labelText) {
        continue;
      }

      const trimmedLabel = labelText.trim();
      console.log(`   Row ${i + 1}: Label = ${trimmedLabel}`);
      
      if (trimmedLabel === 'Status') {
        console.log('✅ Status row found!');
        
        // Get the status value from the next td
        const statusCell = await row.$('td:nth-child(2) span strong span');
        
        if (!statusCell) {
          console.error('❌ Status cell not found');
          throw new Error('Status cell not found on details page');
        }

        const status = await statusCell.textContent();
        
        if (!status) {
          console.error('❌ Status value is empty');
          throw new Error('Status value is empty');
        }

        const trimmedStatus = status.trim();
        console.log(`📌 Status value: ${trimmedStatus}`);
        return trimmedStatus;
      }
    }

    console.error('❌ Status not found in any row');
    throw new Error('Status not found on details page');
  }

  /**
   * Extract all authorized users data
   */
  private async extractAuthorizedUsers(page: Page): Promise<AuthorizedUser[]> {
    console.log('🔍 Locating Authorized User Details section...');
    
    // Find the authorized users section
    const authorizedUserSection = await page.$('div.cols12:has(h3:has-text("Authorized User Details"))');
    
    if (!authorizedUserSection) {
      console.error('❌ Authorized User Details section not found');
      throw new Error('Authorized User Details section not found');
    }
    console.log('✅ Authorized User Details section found');

    // Select "All" from the length dropdown
    console.log('⚙️ Configuring table to show all entries...');
    const lengthSelect = await page.$('select[name="AuthorizedUser_length"]');
    
    if (lengthSelect) {
      await lengthSelect.selectOption({ label: 'All' });
      console.log('✅ Selected "All" from dropdown');
      
      // Wait for table to reload with all entries
      await page.waitForTimeout(1500);
      console.log('⏳ Waited for table to reload');
    } else {
      console.warn('⚠️ Length selector not found, proceeding with default view');
    }

    // Extract table headers
    console.log('📋 Extracting table headers...');
    const headers: string[] = [];
    const headerCells = await page.$$('table#AuthorizedUser thead th');
    
    for (let i = 0; i < headerCells.length; i++) {
      const header = headerCells[i];
      
      if (!header) {
        continue;
      }

      const headerText = await header.textContent();
      if (headerText) {
        const trimmedHeader = headerText.trim();
        headers.push(trimmedHeader);
        console.log(`   Header ${i + 1}: ${trimmedHeader}`);
      }
    }
    console.log(`✅ Extracted ${headers.length} headers`);

    // Extract table data
    console.log('📋 Extracting table data rows...');
    const authorizedUsers: AuthorizedUser[] = [];
    const dataRows = await page.$$('table#AuthorizedUser tbody tr');
    console.log(`📊 Found ${dataRows.length} data rows`);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      if (!row) {
        continue;
      }

      const cells = await row.$$('td');
      const userData: AuthorizedUser = {};

      for (let j = 0; j < cells.length && j < headers.length; j++) {
        const cell = cells[j];
        const headerKey = headers[j];
        
        if (!cell || !headerKey) {
          continue;
        }

        const cellText = await cell.textContent();
        const value = cellText ? cellText.trim() : '';
        userData[headerKey] = value;
      }

      // Only add if userData has content
      if (Object.keys(userData).length > 0) {
        authorizedUsers.push(userData);
        console.log(`   ✅ Row ${i + 1}: ${Object.keys(userData).length} fields extracted`);
      }
    }

    console.log(`✅ Total authorized users extracted: ${authorizedUsers.length}`);
    console.log('\n📦 Authorized Users Data:');
    console.log(JSON.stringify(authorizedUsers, null, 2));

    return authorizedUsers;
  }
}

// Export singleton instance
export const ipIndiaScraperService = new IPIndiaScraperService();

// Export types
export type { ScraperResult, AuthorizedUser };