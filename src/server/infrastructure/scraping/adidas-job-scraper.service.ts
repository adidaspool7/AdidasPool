/**
 * adidas Careers Portal Job Scraper
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: Cheerio (external), domain ports (inward)
 *
 * Scrapes the adidas careers site (jobs.adidas-group.com) for job listings.
 * Parses paginated HTML search results and extracts structured job data.
 *
 * Source: https://jobs.adidas-group.com/search/
 * Pagination: 50 results per page via `startrow` query parameter
 */

import * as cheerio from "cheerio";
import type {
  IJobScraperService,
  ScrapedJob,
} from "@server/domain/ports/services";

const BASE_URL = "https://jobs.adidas-group.com";
const SEARCH_URL = `${BASE_URL}/search/`;
const RESULTS_PER_PAGE = 50;

// Delay between page fetches to be respectful to the server
const FETCH_DELAY_MS = 1500;

/**
 * Extract a 2-letter country code from a location string like "Miami, FL, US"
 * or "Herzogenaurach, BY, DE".
 * The country code is typically the last 2-letter segment.
 */
function extractCountry(locationStr: string): string | null {
  const parts = locationStr.split(",").map((s) => s.trim());
  // Walk backwards to find a 2-letter code (country)
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].trim();
    if (/^[A-Z]{2}$/.test(part)) {
      return part;
    }
  }
  return null;
}

/**
 * Clean a location string — remove trailing state/country codes that are
 * already captured separately. Keep the city + region portion.
 * "Miami, FL, US" → "Miami, FL"
 * "Herzogenaurach, BY, DE" → "Herzogenaurach, BY"
 */
function cleanLocation(locationStr: string): string {
  const parts = locationStr.split(",").map((s) => s.trim());
  // Remove trailing 2-char segments (country code, state code suffix)
  while (parts.length > 1 && /^[A-Z]{2,4}$/.test(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join(", ") || locationStr;
}

/**
 * Generate a stable external ID from a job's detail URL path.
 * Example: "/job/retail-lead-dolphin-mall/12345" → "adidas-12345"
 * Falls back to a hash of title + location if no URL path is available.
 */
function deriveExternalId(urlPath: string, title: string): string {
  // Try to extract numeric ID from URL path (common in ATS systems)
  const numericMatch = urlPath.match(/\/(\d+)\/?$/);
  if (numericMatch) {
    return `adidas-${numericMatch[1]}`;
  }

  // Use the URL slug as the ID
  const slug = urlPath
    .replace(/^\/job\//, "")
    .replace(/\/$/, "")
    .replace(/[^a-zA-Z0-9-]/g, "-");

  if (slug && slug !== "") {
    return `adidas-${slug}`;
  }

  // Fallback: hash title
  const hash = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `adidas-hash-${hash}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AdidasJobScraperService implements IJobScraperService {
  /**
   * Scrape all job listings from the adidas careers portal.
   *
   * How it works:
   * 1. Fetch the first search results page to determine total count
   * 2. Iterate through paginated pages (50 per page)
   * 3. For each page, parse HTML table rows to extract job data
   * 4. Return de-duplicated array of ScrapedJob objects
   */
  async scrapeJobs(maxPages: number = 0): Promise<ScrapedJob[]> {
    const allJobs: ScrapedJob[] = [];
    const seenIds = new Set<string>();

    let currentPage = 0;
    let totalResults = 0;

    // Fetch first page to get total count
    const firstPageResult = await this.fetchPage(0);
    totalResults = firstPageResult.totalResults;
    this.addUniqueJobs(allJobs, seenIds, firstPageResult.jobs);
    currentPage++;

    const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
    const pagesToScrape =
      maxPages > 0 ? Math.min(maxPages, totalPages) : totalPages;

    console.log(
      `[JobScraper] Found ${totalResults} jobs across ${totalPages} pages. Scraping ${pagesToScrape} pages.`
    );

    // Fetch remaining pages
    while (currentPage < pagesToScrape) {
      await sleep(FETCH_DELAY_MS);
      const startRow = currentPage * RESULTS_PER_PAGE;
      try {
        const pageResult = await this.fetchPage(startRow);
        this.addUniqueJobs(allJobs, seenIds, pageResult.jobs);
        console.log(
          `[JobScraper] Page ${currentPage + 1}/${pagesToScrape}: ${pageResult.jobs.length} jobs (total: ${allJobs.length})`
        );
      } catch (err) {
        console.error(
          `[JobScraper] Error fetching page ${currentPage + 1}:`,
          err
        );
      }
      currentPage++;
    }

    console.log(
      `[JobScraper] Scraping complete. ${allJobs.length} unique jobs found.`
    );
    return allJobs;
  }

  /**
   * Fetch and parse a single page of search results.
   */
  private async fetchPage(
    startRow: number
  ): Promise<{ jobs: ScrapedJob[]; totalResults: number }> {
    const url = `${SEARCH_URL}?q=&sortColumn=referencedate&sortDirection=desc&startrow=${startRow}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch page (startrow=${startRow}): HTTP ${response.status}`
      );
    }

    const html = await response.text();
    return this.parsePage(html);
  }

  /**
   * Parse the HTML of a search results page.
   *
   * The adidas careers site (SuccessFactors-based) renders job listings
   * in a table where each <tr> has 4 <td> cells:
   *   Cell 0: Title (contains <a class="jobTitle-link"> with href)
   *   Cell 1: Location (e.g. "Miami, FL, US")
   *   Cell 2: Department (e.g. "Retail")
   *   Cell 3: Date posted
   */
  private parsePage(html: string): {
    jobs: ScrapedJob[];
    totalResults: number;
  } {
    const $ = cheerio.load(html);
    const jobs: ScrapedJob[] = [];

    // Extract total results count from pagination text
    // Pattern: "RESULTS 1 – 50 OF 1026"
    let totalResults = 0;
    const paginationText = $("body").text();
    const totalMatch = paginationText.match(
      /RESULTS?\s+\d+\s*[–-]\s*\d+\s+OF\s+([\d,]+)/i
    );
    if (totalMatch) {
      totalResults = parseInt(totalMatch[1].replace(",", ""), 10);
    }

    // Parse table rows — each job is a <tr> with 4 <td> cells
    $("tr").each((_index, element) => {
      const $row = $(element);
      const cells = $row.find("td");

      // Skip header rows or rows without 4 cells
      if (cells.length < 3) return;

      // Cell 0: title + link
      const $titleCell = $(cells[0]);
      const $link = $titleCell.find('a.jobTitle-link, a[href*="/job/"]').first();
      const href = $link.attr("href") || "";
      const title = $link.text().trim();

      // Skip if no valid job link found
      if (!title || !href || href === "/job" || href === "/job/") return;

      // Cell 1: location (e.g. "Miami, FL, US" or "Wien, 9, AT")
      const locationRaw = $(cells[1]).text().trim() || null;

      // Cell 2: department (e.g. "Retail", "Finance")
      const department = $(cells[2]).text().trim() || null;

      // Extract country and clean location
      const country = locationRaw ? extractCountry(locationRaw) : null;
      const location = locationRaw ? cleanLocation(locationRaw) : null;

      const externalId = deriveExternalId(href, title);

      jobs.push({
        externalId,
        title,
        department,
        location,
        country,
        sourceUrl: href.startsWith("http") ? href : `${BASE_URL}${href}`,
      });
    });

    return { jobs, totalResults };
  }

  /**
   * Add jobs to the array, skipping duplicates by externalId.
   */
  private addUniqueJobs(
    allJobs: ScrapedJob[],
    seenIds: Set<string>,
    newJobs: ScrapedJob[]
  ): void {
    for (const job of newJobs) {
      if (!seenIds.has(job.externalId)) {
        seenIds.add(job.externalId);
        allJobs.push(job);
      }
    }
  }
}
