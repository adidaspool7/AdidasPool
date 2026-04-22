import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jobUseCases, NotFoundError } from "@server/application";
import { z } from "zod";

const InviteSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
});

/**
 * POST /api/candidates/[id]/invite
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: JobUseCases.inviteCandidateToJob
 *
 * HR-only endpoint. Emits a JOB_INVITATION notification to the given
 * candidate inviting them to apply to the specified job.
 *
 * Idempotent: duplicate invites return status=already_invited.
 * If the candidate has an active application already, status=already_applied.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Resolve the HR user's display name for a nicer message
    let invitedByName: string | undefined;
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (u) {
        invitedByName =
          (u.user_metadata?.full_name as string | undefined) ||
          (u.user_metadata?.name as string | undefined) ||
          u.email?.split("@")[0];
      }
    } catch {
      // Non-fatal — we can fall back to a generic sender label
    }

    const result = await jobUseCases.inviteCandidateToJob(
      candidateId,
      parsed.data.jobId,
      invitedByName
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error inviting candidate to job:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
