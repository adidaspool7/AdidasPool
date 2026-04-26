import { NextRequest, NextResponse } from "next/server";
import { jobUseCases, NotFoundError } from "@server/application";
import { createClient } from "@/lib/supabase/server";

// Always recompute on every request \u2014 the response depends on the
// current `scoring_weights` row and on candidate data that can change
// at any moment. Without this, Next.js' default route caching would
// make Match Settings adjustments appear to have no effect.
export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/[id]/match-candidates
 *
 * HR-only. Returns the ranked list of candidates for a given job, using
 * the Phase-3 fit engine. The first request on an unparsed job triggers
 * an inline LLM extraction (~2-4s). Subsequent requests hit the cache.
 *
 * Response shape:
 *   {
 *     job: { id, title },
 *     requirements: JobRequirements,
 *     matches: [{ candidate: {...}, fit: { overallScore, isEligible, breakdown } }, ...]
 *   }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // HR role gate
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = user.app_metadata?.role as string | undefined;
  if (role !== "hr") {
    return NextResponse.json({ error: "Forbidden — HR only" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const result = await jobUseCases.matchCandidatesToJob(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error matching candidates to job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to match candidates" },
      { status: 500 }
    );
  }
}
