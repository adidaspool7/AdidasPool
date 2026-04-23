/**
 * Backfill Job Requirements (Phase 1)
 *
 * Runs the LLM requirements extractor against jobs that have no
 * parsed_requirements yet. Intended to be run repeatedly — each invocation
 * processes up to `BATCH_SIZE` jobs and stops, so you can schedule it or
 * run it manually until the queue is empty.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-job-requirements.ts [batchSize=20] [delayMs=1000]
 *
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * GROQ_API_KEY (or OPENAI_API_KEY).
 */

import { SupabaseJobRepository } from "../src/server/infrastructure/database/job.repository";
import { SupabaseCandidateRepository } from "../src/server/infrastructure/database/candidate.repository";
import { AdidasJobScraperService } from "../src/server/infrastructure/scraping/adidas-job-scraper.service";
import { JobRequirementsExtractorService } from "../src/server/infrastructure/ai/job-requirements-extractor.service";
import { JobUseCases } from "../src/server/application/use-cases/job.use-cases";

async function main() {
  const batchSize = parseInt(process.argv[2] ?? "20", 10);
  const delayMs = parseInt(process.argv[3] ?? "1000", 10);

  const jobRepo = new SupabaseJobRepository();
  const candidateRepo = new SupabaseCandidateRepository();
  const scraper = new AdidasJobScraperService();
  const extractor = new JobRequirementsExtractorService();

  const useCases = new JobUseCases(
    jobRepo,
    candidateRepo,
    scraper,
    undefined,
    undefined,
    extractor
  );

  console.log(
    `[Backfill] Starting. batchSize=${batchSize} delayMs=${delayMs}`
  );

  const result = await useCases.parsePendingJobRequirements(batchSize, delayMs);

  console.log("[Backfill] Done.");
  console.log(JSON.stringify(result, null, 2));

  if (result.failed > 0) {
    console.warn(`[Backfill] ${result.failed} job(s) failed. See errors above.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[Backfill] Fatal error:", err);
  process.exit(1);
});
