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

// Step by 40 instead of 50 to create a 10-row overlap between pages.
// This catches jobs that shift between pages during scraping (pagination drift).
const PAGE_STEP = 40;

// Delay between page fetches to be respectful to the server
const FETCH_DELAY_MS = 1000;

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

/**
 * Detect whether a posting is an internship based on title and department.
 * Adidas uses several languages across their regional careers sites, so we
 * match a wide set of keywords. Matches are word-boundary-safe where possible
 * to avoid false positives (e.g. "internal audit" must not match "intern").
 */
function detectIsInternship(title: string, department: string | null): boolean {
  const haystack = `${title} ${department ?? ""}`.toLowerCase();

  // Word-boundary matches — safe against substrings
  const boundaryPatterns: RegExp[] = [
    /\bintern\b/,              // English: "Intern"
    /\binterns\b/,
    /\binternship\b/,           // English: "Internship"
    /\binternships\b/,
    /\bpraktikant(?:in)?\b/,    // German: "Praktikant", "Praktikantin"
    /\bpraktikum\b/,            // German: "Praktikum"
    /\bwerkstudent(?:in)?\b/,   // German: working student
    /\btrainee\b/,              // EN/DE trainee programs
    /\btrainees\b/,
    /\bstagista\b/,             // Italian
    /\bstagisti\b/,
    /\btirocinio\b/,            // Italian
    /\bstagiaire\b/,            // French
    /\bstage\b/,                // French "stage" (internship). Risk: English "stage manager" — department check below filters.
    /\bbecario\b/,              // Spanish
    /\bbecaria\b/,
    /\bpasante\b/,              // Spanish
    /\bpasantia\b/,
    /\bprácticas\b/,            // Spanish "prácticas"
    /\bpracticas\b/,
    /\bestágio\b/,              // Portuguese
    /\bestagio\b/,
    /\bestagiário\b/,
    /\bestagiaria\b/,
    /\bapprentice\b/,
    /\bapprenticeship\b/,
    /\bco-?op\b/,               // "co-op" / "coop" student role
  ];

  for (const re of boundaryPatterns) {
    if (re.test(haystack)) {
      // Guard against the French "stage" false-positive: only count if no
      // clearly non-internship qualifier sits next to it ("stage manager",
      // "stage production"). If the word "stage" matched, require at least
      // one other internship-signal token to coexist for confirmation.
      if (re.source === "\\bstage\\b") {
        const hasOtherSignal = boundaryPatterns.some(
          (r) => r.source !== "\\bstage\\b" && r.test(haystack)
        );
        if (!hasOtherSignal && !/\b(étudiant|etudiant|stagiaire|alternance)\b/.test(haystack)) {
          continue;
        }
      }
      return true;
    }
  }

  return false;
}

export class AdidasJobScraperService implements IJobScraperService {
  /**
   * Scrape all job listings from the adidas careers portal.
   *
   * How it works:
   * 1. Fetch the first search results page to determine total count
   * 2. Iterate through paginated pages with overlapping rows (step 40, page 50)
   *    to catch items that shift between pages during scraping
   * 3. If any jobs were missed, do a verification pass with ascending sort
   * 4. Return de-duplicated array of ScrapedJob objects
   */
  async scrapeJobs(maxPages: number = 0): Promise<ScrapedJob[]> {
    const allJobs: ScrapedJob[] = [];
    const seenIds = new Set<string>();

    // --- Pass 1: descending sort with overlapping pagination ---
    const totalResults = await this.scrapeWithSort(
      "desc",
      maxPages,
      allJobs,
      seenIds
    );

    // --- Pass 2: if we're still short, re-scrape with ascending sort ---
    if (allJobs.length < totalResults && maxPages === 0) {
      console.log(
        `[JobScraper] Pass 1 got ${allJobs.length}/${totalResults}. Running verification pass (asc sort)...`
      );
      await this.scrapeWithSort("asc", 0, allJobs, seenIds);
    }

    console.log(
      `[JobScraper] Scraping complete. ${allJobs.length} unique jobs found (server reported ${totalResults}).`
    );
    return allJobs;
  }

  /**
   * Scrape all pages for a given sort direction, adding unique jobs to the
   * shared allJobs array. Returns the totalResults reported by the server.
   *
   * Resilience:
   *   - If the first page returns 0 jobs *and* 0 totalResults we treat the
   *     response as corrupt (likely a maintenance page or a layout change
   *     on adidas's side) and bail out early so the sync job records a
   *     clear failure instead of silently importing nothing.
   *   - If a subsequent page returns 0 jobs we consider it a transient
   *     failure, log it, and continue — the overlap (PAGE_STEP < page size)
   *     plus the asc/desc verification pass usually fills the gap.
   */
  private async scrapeWithSort(
    sortDirection: "asc" | "desc",
    maxPages: number,
    allJobs: ScrapedJob[],
    seenIds: Set<string>
  ): Promise<number> {
    // Fetch first page to get total count
    const firstPageResult = await this.fetchPage(0, sortDirection);
    const totalResults = firstPageResult.totalResults;

    if (firstPageResult.jobs.length === 0 && totalResults === 0) {
      throw new Error(
        `[JobScraper] First page (${sortDirection}) returned no jobs and no total-count text — ` +
          `adidas careers site likely returned an unexpected response. Aborting this pass.`
      );
    }

    this.addUniqueJobs(allJobs, seenIds, firstPageResult.jobs);

    const totalPages = Math.ceil(totalResults / PAGE_STEP);
    const pagesToScrape =
      maxPages > 0 ? Math.min(maxPages, totalPages) : totalPages;

    console.log(
      `[JobScraper] [${sortDirection}] Found ${totalResults} jobs, ~${pagesToScrape} pages (step ${PAGE_STEP}, overlap ${RESULTS_PER_PAGE - PAGE_STEP}).`
    );

    let currentStep = 1;
    let consecutiveEmptyPages = 0;
    while (currentStep < pagesToScrape) {
      await sleep(FETCH_DELAY_MS);
      const startRow = currentStep * PAGE_STEP;
      try {
        const pageResult = await this.fetchPage(startRow, sortDirection);
        if (pageResult.jobs.length === 0) {
          consecutiveEmptyPages++;
          console.warn(
            `[JobScraper] [${sortDirection}] Page ${currentStep + 1}/${pagesToScrape} returned 0 jobs (empty streak: ${consecutiveEmptyPages})`
          );
          // Three empty pages in a row strongly suggests we've walked
          // off the end of the result set or hit a server-side block.
          // Stop early rather than hammering for nothing.
          if (consecutiveEmptyPages >= 3) {
            console.warn(
              `[JobScraper] [${sortDirection}] Stopping early after 3 empty pages.`
            );
            break;
          }
        } else {
          consecutiveEmptyPages = 0;
          this.addUniqueJobs(allJobs, seenIds, pageResult.jobs);
          console.log(
            `[JobScraper] [${sortDirection}] Page ${currentStep + 1}/${pagesToScrape}: ${pageResult.jobs.length} jobs (total unique: ${allJobs.length})`
          );
        }
      } catch (err) {
        console.error(
          `[JobScraper] [${sortDirection}] Error fetching page ${currentStep + 1}:`,
          err
        );
      }
      currentStep++;
    }

    return totalResults;
  }

  /**
   * Fetch and parse a single page of search results.
   *
   * Validates the response body length so we don't try to parse a
   * truncated/empty stream as if it were a real results page.
   */
  private async fetchPage(
    startRow: number,
    sortDirection: "asc" | "desc" = "desc"
  ): Promise<{ jobs: ScrapedJob[]; totalResults: number }> {
    const url = `${SEARCH_URL}?q=&sortColumn=referencedate&sortDirection=${sortDirection}&startrow=${startRow}`;

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
    // The real results page is ~80–150KB. Anything substantially smaller is
    // either an error page, a captcha, or a truncated response.
    if (html.length < 5000) {
      throw new Error(
        `Suspiciously small response (${html.length} bytes) for startrow=${startRow}; treating as failure.`
      );
    }
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
      const isInternship = detectIsInternship(title, department);

      jobs.push({
        externalId,
        title,
        department,
        location,
        country,
        sourceUrl: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        type: isInternship ? "INTERNSHIP" : null,
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

  /**
   * Fetch a single job's detail page and report its lifecycle state.
   *
   * Used by Phase-1 requirements extraction. Respects FETCH_DELAY_MS when
   * called in batches by the caller (this method itself does not sleep).
   *
   * Returns:
   *   - `OPEN`        \u2014 the JD body was extracted; safe to feed to the LLM.
   *   - `CLOSED`      \u2014 page renders the \"application period closed\" banner;
   *                    the role no longer accepts applicants.
   *   - `UNAVAILABLE` \u2014 page reachable but no JD body and no closed banner
   *                    (e.g. relocated, JS-only render, scraper selectors miss).
   *   - `ERROR`       \u2014 HTTP/network failure.
   *
   * @param sourceUrl Absolute or BASE_URL-relative job detail URL
   */
  async fetchJobDescription(
    sourceUrl: string
  ): Promise<{ status: "OPEN" | "CLOSED" | "UNAVAILABLE" | "ERROR"; body: string | null }> {
    const url = sourceUrl.startsWith("http") ? sourceUrl : `${BASE_URL}${sourceUrl}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    } catch (err) {
      console.warn(`[JobScraper] fetchJobDescription network error for ${url}:`, err);
      return { status: "ERROR", body: null };
    }

    if (!response.ok) {
      console.warn(
        `[JobScraper] fetchJobDescription HTTP ${response.status} for ${url}`
      );
      return { status: "ERROR", body: null };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Closed-banner detection \u2014 adidas serves these at the same URL as
    // live postings. If we see this exact phrase anywhere on the page we
    // mark the job CLOSED, regardless of whether a JD body is also present.
    const fullText = $("body").text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const CLOSED_BANNERS = [
      /the application period for this role has been closed/i,
    ];
    if (CLOSED_BANNERS.some((re) => re.test(fullText))) {
      return { status: "CLOSED", body: null };
    }

    // The SuccessFactors JD body lives in #job-description (primary)
    // or .jobdescription / #content-wrapper as fallbacks.
    const candidates = [
      "#job-description",
      ".jobdescription",
      ".jobDescription",
      '[data-automation-id="jobPostingDescription"]',
      "#content-wrapper",
    ];
    for (const sel of candidates) {
      const el = $(sel).first();
      if (el.length === 0) continue;
      // Remove nav/script/style noise inside the selected region
      el.find("script, style, nav, header, footer").remove();
      const text = el.text().replace(/\u00a0/g, " ").trim();
      if (this.looksLikeJobDescription(text)) {
        return { status: "OPEN", body: text };
      }
    }

    // No specific selector matched. We deliberately do NOT fall back to
    // `main` or `body` \u2014 those return cookie banners + nav chrome which
    // the LLM then hallucinates from.
    return { status: "UNAVAILABLE", body: null };
  }

  /**
   * Heuristic guard against feeding cookie-banner / nav-chrome text to the
   * LLM when the JD body container is empty or missing.
   *
   * A real job description has:
   *   - at least ~200 chars
   *   - several full sentences (≥ 3 terminators . ! ?)
   *   - no obvious chrome markers (cookie / search widget / inline JS)
   *   - more letter content than punctuation/whitespace noise
   */
  private looksLikeJobDescription(text: string): boolean {
    if (text.length < 200) return false;

    // Pages that render only chrome/JS contain these markers.
    const chromeMarkers = [
      /Skip to main content/i,
      /Search by Keyword/i,
      /Search by Location/i,
      /j2w\.init/i,
      /<!\[CDATA\[/,
      /Cookies Settings/i,
      /Accept All Cookies/i,
      /Privacy Policy/i,
    ];
    if (chromeMarkers.some((re) => re.test(text))) return false;

    // Real prose has multiple sentences. Cookie banners are mostly bullets
    // or single-line legal blurbs.
    const sentenceCount = (text.match(/[.!?](\s|$)/g) ?? []).length;
    if (sentenceCount < 3) return false;

    // Letter-to-total ratio: chrome dumps are heavy on punctuation,
    // whitespace, and ALL-CAPS labels. Real JDs are mostly letters.
    const letterCount = (text.match(/[A-Za-z\u00C0-\u024F]/g) ?? []).length;
    if (letterCount / text.length < 0.55) return false;

    return true;
  }
}
