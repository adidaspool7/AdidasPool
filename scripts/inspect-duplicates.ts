/**
 * Show each duplicate candidate + the record they point at.
 */
import db from "../src/server/infrastructure/database/supabase-client";

async function main() {
  const { data, error } = await db
    .from("candidates")
    .select(
      `id, first_name, last_name, email, status, is_duplicate, duplicate_of, experiences(id)`
    )
    .eq("is_duplicate", true);
  if (error) throw error;

  for (const dup of (data ?? []) as any[]) {
    console.log(`\n--- ${dup.first_name} ${dup.last_name}  <${dup.email ?? "-"}> ---`);
    console.log(`  self:          id=${dup.id}  status=${dup.status}  is_dup=${dup.is_duplicate}  exp=${dup.experiences?.length ?? 0}`);
    console.log(`  duplicate_of:  ${dup.duplicate_of ?? "(null)"}`);
    if (dup.duplicate_of) {
      const { data: o } = await db
        .from("candidates")
        .select(`id, first_name, last_name, email, status, is_duplicate, duplicate_of, experiences(id)`)
        .eq("id", dup.duplicate_of)
        .maybeSingle();
      if (o) {
        console.log(`  \u2192 original:   id=${o.id}  status=${o.status}  is_dup=${o.is_duplicate}  exp=${o.experiences?.length ?? 0}  <${o.email ?? "-"}>`);
        console.log(`    original.duplicate_of: ${o.duplicate_of ?? "(null)"}`);
      } else {
        console.log(`  \u2192 original NOT FOUND`);
      }
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
