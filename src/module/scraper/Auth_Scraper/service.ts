import { ipIndiaScraper, type ScraperResult } from "./scraper.ts";
import { AuthorizedUserModel, type UpsertAuthorizedUsersResult } from "./model.ts";

/**
 * Service response for scraping and saving authorized users
 */
export interface ScrapeAndSaveResponse {
  success: boolean;
  message: string;
  scraperResult: ScraperResult;
  dbResult: UpsertAuthorizedUsersResult;
}

export class AuthorizedUserService {
  static async scrapeAndSave(applicationNumber: string): Promise<ScrapeAndSaveResponse> {
    try {

      // Step 1: Scrape data from website
      const scraperResult = await ipIndiaScraper.scrapeApplicationData(applicationNumber);

      const dbResult = await AuthorizedUserModel.upsert(
        parseInt(applicationNumber),
        scraperResult.authorizedUsers
      );

      return {
        success: true,
        message: `Successfully processed ${scraperResult.authorizedUsers.length} authorized users`,
        scraperResult,
        dbResult,
      };
    } catch (error) {
      console.error("❌ Error in scrapeAndSave:", error);
      throw error;
    } finally {
      await ipIndiaScraper.closeBrowser();
    }
  }

  /**
   * Get authorized user by auth number or full pattern with category
   * @param searchValue - Auth number (e.g., "362") or full pattern (e.g., "AU/362/GI/46/1")
   */
  static async getByAuthNumber(searchValue: string) {
    try {
      return await AuthorizedUserModel.getByAuthNumber(searchValue);
    } catch (error) {
      console.error("❌ Error in getByAuthNumber:", error);
      throw error;
    }
  }

  /**
   * Get all authorized users for a specific application number
   * @param applicationNumber - GI Application Number
   */
  static async getByApplicationNumber(applicationNumber: number) {
    try {
      return await AuthorizedUserModel.getByApplicationNumber(applicationNumber);
    } catch (error) {
      console.error("❌ Error in getByApplicationNumber:", error);
      throw error;
    }
  }
}