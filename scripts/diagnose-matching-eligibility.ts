/**
 * Diagnose matching eligibility.
 *
 * Prints every candidate that is NOT status=NEW and NOT marked hard-duplicate,
 * along with the flags findForMatching uses. Helps answer "why isn't
 * candidate X showing up in Fit results for a job?".
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/diagnose-matching-eligibility.ts
 */

import db from "../src/server/infrastructure/database/supabase-client";

async function main() {
  const { data, error } = await db
    .from("candidates")
    .select(
      `id, first_name, last_name, email, status, is_duplicate, country, primary_business_area,
       experiences(id, fields_of_work, job_title)`
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return;

  const rows = data as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    status: string;
    is_duplicate: boolean | null;
    country: string | null;
    primary_business_area: string | null;
    experiences: Array<{ id: string; fields_of_work: string[] | null; job_title: string }>;
  }>;

  console.log(
    `\nTotal candidates: ${rows.length}\n` +
      `Filtering rules used by matcher:\n` +
      `   - status != 'NEW'\n` +
      `   - is_duplicate = false  (NULL is NOT matched by .eq)\n`
  );

  console.log(
    "id                                   | status       | dup  | country   | exp | tagged exps | name / email"
  );
  console.log("-".repeat(130));

  for (const c of rows) {
    const tagged = (c.experiences ?? []).filter(
      (e) => Array.isArray(e.fields_of_work) && e.fields_of_work.length > 0
    ).length;
    const includedByMatcher =
      c.status !== "NEW" && c.is_duplicate === false;
    const marker = includedByMatcher ? "\u2705" : "\u274c";
    console.log(
      `${marker} ${c.id.padEnd(36)} | ${String(c.status).padEnd(12)} | ${String(
        c.is_duplicate
      ).padEnd(4)} | ${(c.country ?? "-").padEnd(9)} | ${String(
        c.experiences?.length ?? 0
      ).padEnd(3)} | ${String(tagged).padEnd(11)} | ${c.first_name} ${c.last_name} <${c.email ?? "-"}>`
    );
  }

  const excludedButNotNew = rows.filter(
    (c) => c.status !== "NEW" && c.is_duplicate !== false
  );
  if (excludedButNotNew.length > 0) {
    console.log(
      `\n\u26a0\ufe0f  ${excludedButNotNew.length} candidate(s) have status != NEW but are excluded from matching because is_duplicate is not strictly false:`
    );
    for (const c of excludedButNotNew) {
      console.log(
        `    - ${c.first_name} ${c.last_name}  (is_duplicate=${c.is_duplicate})`
      );
    }
    console.log(
      `\n   Fix: either clear is_duplicate on those rows, or the matcher will\n   be updated to treat NULL / false equivalently.`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
