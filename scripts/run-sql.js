const sql = `
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS shortlisted BOOLEAN DEFAULT false;
ALTER TYPE "CandidateStatus" ADD VALUE IF NOT EXISTS 'OFFER_SENT';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ASSESSMENT_READY';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEWING';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ADVANCED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'FINAL_STAGE';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'OFFER_SENT';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
`;

const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvYWF4YmZsc3lucnBwbmpranVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA3NjkxOCwiZXhwIjoyMDkxNjUyOTE4fQ.2uB14lxtTOzSVAenHSI9cbrvloBIARBp2QBWsfWAQTo";

async function run() {
  // Run each statement individually through individual table operations
  // Since we can't run raw SQL via REST, we'll use the management API
  const { createClient } = require("@supabase/supabase-js");
  const db = createClient("https://goaaxbflsynrppnjkjuh.supabase.co", KEY);

  // Statements to run - we need to run them individually
  const statements = sql.trim().split(";").filter(s => s.trim());
  
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    console.log("Running:", trimmed.slice(0, 80) + "...");
    
    const { data, error } = await db.rpc("exec_sql", { sql_query: trimmed + ";" });
    if (error) {
      console.log("  RPC failed:", error.message);
      // Try via raw postgres connection string if available
    } else {
      console.log("  OK:", data);
    }
  }
}

run().catch(console.error);
