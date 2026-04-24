import { NextRequest, NextResponse } from "next/server";
import { jobUseCases, NotFoundError } from "@server/application";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/jobs/[id]/reparse-requirements
 *
 * HR-only. Invalidates the cached `parsed_requirements` for this job and
 * immediately re-runs the LLM extractor on the JD body. Use when the
 * cached parse looks wrong (empty arrays, stale after a JD edit, etc.).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const requirements = await jobUseCases.forceReparseRequirements(id);
    return NextResponse.json({ requirements });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error re-parsing job requirements:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to re-parse" },
      { status: 500 }
    );
  }
}
