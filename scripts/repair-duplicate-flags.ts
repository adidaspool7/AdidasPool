/**
 * Repair wrongly-flagged duplicates.
 *
 * The current dedup logic marks the *newer* record as duplicate of the older
 * one. In practice, for OAuth-created shell accounts (no CV, status=NEW) that
 * later collide with an HR-uploaded CV, the richer record ends up flagged.
 *
 * This script scans all candidates marked is_duplicate=true, looks at the
 * record they point at (duplicate_of), and if the flagged candidate has
 * strictly more data (more experiences / non-NEW status), it flips the flag:
 * clears is_duplicate on the rich one and marks the shell as duplicate instead.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/repair-duplicate-flags.ts [--dry]
 */

import db from "../src/server/infrastructure/database/supabase-client";

const dryRun = process.argv.includes("--dry");

async function main() {
  const { data, error } = await db
    .from("candidates")
    .select(
      `id, first_name, last_name, email, status, is_duplicate, duplicate_of,
       experiences(id)`
    )
    .eq("is_duplicate", true);
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    status: string;
    is_duplicate: boolean;
    duplicate_of: string | null;
    experiences: Array<{ id: string }>;
  }>;

  console.log(
    `\nScanning ${rows.length} candidate(s) flagged is_duplicate=true...\n`
  );

  let flipped = 0;
  let kept = 0;

  for (const dup of rows) {
    // Case A: self-pointing \u2014 a re-parse self-matched on email. Always clear.
    if (dup.duplicate_of === dup.id) {
      console.log(
        `  \u2192  SELF-MATCH fix: ${dup.first_name} ${dup.last_name} (${dup.email ?? "-"}) \u2014 ${dup.id} pointed at itself.`
      );
      if (!dryRun) {
        const { error: e } = await db
          .from("candidates")
          .update({ is_duplicate: false, duplicate_of: null })
          .eq("id", dup.id);
        if (e) {
          console.log(`     ERROR: ${e.message}`);
          continue;
        }
      }
      flipped++;
      continue;
    }

    if (!dup.duplicate_of) {
      console.log(
        `  \u23ed\ufe0f  ${dup.first_name} ${dup.last_name}: no duplicate_of pointer, skipped.`
      );
      continue;
    }

    // Fetch the original the flagged record points at.
    const { data: originalData, error: oErr } = await db
      .from("candidates")
      .select(
        `id, first_name, last_name, email, status, is_duplicate,
         experiences(id)`
      )
      .eq("id", dup.duplicate_of)
      .maybeSingle();
    if (oErr || !originalData) {
      console.log(
        `  \u26a0\ufe0f  ${dup.first_name} ${dup.last_name}: duplicate_of ${dup.duplicate_of} not found, skipped.`
      );
      continue;
    }
    const original = originalData as typeof rows[number];

    const dupExpCount = dup.experiences?.length ?? 0;
    const origExpCount = original.experiences?.length ?? 0;
    const dupHasData = dupExpCount > 0 && dup.status !== "NEW";
    const origHasData = origExpCount > 0 && original.status !== "NEW";

    // The flagged record is richer than the original it points at \u2192 flip.
    if (dupHasData && !origHasData) {
      console.log(
        `  \u2192  FLIP: ${dup.first_name} ${dup.last_name} (${dup.email ?? "-"})\n` +
          `     flagged dup  = ${dup.id}  status=${dup.status} exp=${dupExpCount}\n` +
          `     original      = ${original.id}  status=${original.status} exp=${origExpCount}`
      );
      if (!dryRun) {
        // Clear on the rich record.
        const { error: e1 } = await db
          .from("candidates")
          .update({ is_duplicate: false, duplicate_of: null })
          .eq("id", dup.id);
        if (e1) {
          console.log(`     ERROR clearing flag on rich: ${e1.message}`);
          continue;
        }
        // Flag the shell as duplicate of the rich one.
        const { error: e2 } = await db
          .from("candidates")
          .update({ is_duplicate: true, duplicate_of: dup.id })
          .eq("id", original.id);
        if (e2) {
          console.log(`     ERROR flagging shell: ${e2.message}`);
          continue;
        }
      }
      flipped++;
    } else {
      console.log(
        `  =  keep as-is: ${dup.first_name} ${dup.last_name} (dup has ${dupExpCount} exp, original has ${origExpCount}).`
      );
      kept++;
    }
  }

  console.log(
    `\nDone. flipped=${flipped}  kept=${kept}  ${
      dryRun ? "(dry run \u2014 no changes written)" : ""
    }`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
