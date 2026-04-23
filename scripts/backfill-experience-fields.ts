/**
 * Backfill Experience Fields of Work (Phase 2)
 *
 * For each candidate whose experiences have an empty `fields_of_work` array,
 * invoke the CV parser service's `classifyExperienceFields` method to tag
 * each experience with 1–3 canonical Fields of Work, then persist the
 * result.
 *
 * This is an ops/demo tool — it is NOT required for the regular app flow.
 * Newly-uploaded CVs are tagged inline by the main CV parse prompt.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-experience-fields.ts [batchSize=20] [delayMs=1000]
 *
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * GROQ_API_KEY (or OPENAI_API_KEY).
 */

import db from "../src/server/infrastructure/database/supabase-client";
import { OpenAiCvParserService } from "../src/server/infrastructure/ai/cv-parser.service";

interface PendingExperience {
  id: string;
  candidate_id: string;
  job_title: string;
  company: string | null;
  description: string | null;
  fields_of_work: string[] | null;
}

async function main() {
  const batchSize = parseInt(process.argv[2] ?? "20", 10);
  const delayMs = parseInt(process.argv[3] ?? "1000", 10);

  console.log(
    `[backfill-experience-fields] batchSize=${batchSize} delayMs=${delayMs}`
  );

  // 1. Find candidates with at least one experience whose fields_of_work is empty.
  const { data: rows, error } = await db
    .from("experiences")
    .select("id, candidate_id, job_title, company, description, fields_of_work")
    .or("fields_of_work.is.null,fields_of_work.eq.{}")
    .limit(batchSize * 10); // over-fetch; we group by candidate below
  if (error) throw error;

  const byCandidate = new Map<string, PendingExperience[]>();
  for (const row of (rows ?? []) as PendingExperience[]) {
    const list = byCandidate.get(row.candidate_id) ?? [];
    list.push(row);
    byCandidate.set(row.candidate_id, list);
  }

  const candidateIds = Array.from(byCandidate.keys()).slice(0, batchSize);
  console.log(
    `[backfill-experience-fields] ${candidateIds.length} candidate(s) to process (${rows?.length ?? 0} pending experiences total)`
  );
  if (candidateIds.length === 0) {
    console.log("Nothing to do — all experiences already tagged.");
    return;
  }

  const parser = new OpenAiCvParserService();
  const summary = {
    attempted: 0,
    tagged: 0,
    emptyTagged: 0,
    failed: 0,
    errors: [] as Array<{ candidateId: string; error: string }>,
  };
  const started = Date.now();

  for (const candidateId of candidateIds) {
    summary.attempted++;
    const experiences = byCandidate.get(candidateId) ?? [];
    try {
      const classified = await parser.classifyExperienceFields(
        experiences.map((e) => ({
          jobTitle: e.job_title,
          company: e.company,
          description: e.description,
        }))
      );

      // Persist one UPDATE per experience
      for (let i = 0; i < experiences.length; i++) {
        const fields = classified[i] ?? [];
        const { error: updErr } = await db
          .from("experiences")
          .update({ fields_of_work: fields })
          .eq("id", experiences[i].id);
        if (updErr) throw updErr;
        if (fields.length > 0) summary.tagged++;
        else summary.emptyTagged++;
      }

      console.log(
        `  ✓ ${candidateId}: ${experiences.length} experience(s) tagged`
      );
    } catch (err) {
      summary.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push({ candidateId, error: msg });
      console.error(`  ✗ ${candidateId}: ${msg}`);
    }

    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  const result = {
    ...summary,
    durationMs: Date.now() - started,
  };
  console.log("\n[backfill-experience-fields] done:");
  console.log(JSON.stringify(result, null, 2));

  if (result.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[backfill-experience-fields] fatal:", err);
  process.exit(1);
});
