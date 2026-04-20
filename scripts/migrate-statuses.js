/**
 * Migration script:
 * 1. Add `shortlisted` boolean column to candidates table
 * 2. Migrate candidates with status=SHORTLISTED to shortlisted=true, status=SCREENED
 * 3. Update job_applications status enum to support new tracking statuses
 */

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://goaaxbflsynrppnjkjuh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvYWF4YmZsc3lucnBwbmpranVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA3NjkxOCwiZXhwIjoyMDkxNjUyOTE4fQ.2uB14lxtTOzSVAenHSI9cbrvloBIARBp2QBWsfWAQTo"
);

async function migrate() {
  // Step 1: Add shortlisted column to candidates (if not exists)
  console.log("Step 1: Adding shortlisted column...");
  try {
    // Try to select it first
    const { error: checkErr } = await supabase
      .from("candidates")
      .select("shortlisted")
      .limit(1);
    if (checkErr) {
      console.log("Column does not exist, need to add via Supabase SQL editor.");
      console.log("Run this SQL in Supabase Dashboard > SQL Editor:");
      console.log("  ALTER TABLE candidates ADD COLUMN shortlisted BOOLEAN DEFAULT false;");
      console.log("");
      console.log("  -- Update ApplicationStatus enum to add new values:");
      console.log("  ALTER TYPE \"ApplicationStatus\" ADD VALUE IF NOT EXISTS 'RECEIVED';");
      console.log("  ALTER TYPE \"ApplicationStatus\" ADD VALUE IF NOT EXISTS 'IN_REVIEW';");
      console.log("  ALTER TYPE \"ApplicationStatus\" ADD VALUE IF NOT EXISTS 'ASSESSMENT_READY';");
      console.log("  ALTER TYPE \"ApplicationStatus\" ADD VALUE IF NOT EXISTS 'INTERVIEWING';");
      console.log("  ALTER TYPE \"ApplicationStatus\" ADD VALUE IF NOT EXISTS 'ADVANCED';");
      console.log("  ALTER TYPE \"ApplicationStatus\" ADD VALUE IF NOT EXISTS 'FINAL_STAGE';");
      console.log("  ALTER TYPE \"ApplicationStatus\" ADD VALUE IF NOT EXISTS 'OFFER_SENT';");
      console.log("  ALTER TYPE \"ApplicationStatus\" ADD VALUE IF NOT EXISTS 'ACCEPTED';");
      console.log("");
      console.log("  -- Update CandidateStatus enum:");
      console.log("  ALTER TYPE \"CandidateStatus\" ADD VALUE IF NOT EXISTS 'OFFER_SENT';");
    } else {
      console.log("Column already exists.");
    }
  } catch (e) {
    console.error("Error checking column:", e.message);
  }

  // Step 2: Migrate SHORTLISTED status candidates
  console.log("\nStep 2: Migrating SHORTLISTED candidates...");
  const { data: shortlisted, error: fetchErr } = await supabase
    .from("candidates")
    .select("id")
    .eq("status", "SHORTLISTED");

  if (fetchErr) {
    console.error("Error fetching shortlisted candidates:", fetchErr.message);
  } else if (shortlisted && shortlisted.length > 0) {
    console.log(`Found ${shortlisted.length} shortlisted candidates to migrate.`);
    for (const c of shortlisted) {
      const { error: upErr } = await supabase
        .from("candidates")
        .update({ shortlisted: true, status: "SCREENED" })
        .eq("id", c.id);
      if (upErr) {
        console.error(`Failed to migrate candidate ${c.id}:`, upErr.message);
      } else {
        console.log(`Migrated candidate ${c.id}`);
      }
    }
  } else {
    console.log("No candidates with SHORTLISTED status to migrate.");
  }

  console.log("\nDone!");
}

migrate();
