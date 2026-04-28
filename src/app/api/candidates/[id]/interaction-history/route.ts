import { NextRequest, NextResponse } from "next/server";
import { notificationUseCases, NotFoundError } from "@server/application";

/**
 * GET /api/candidates/[id]/interaction-history
 *
 * ONION LAYER: Presentation (thin controller)
 * Returns the full HR-initiated interaction log for a candidate:
 * status changes, contact emails, campaigns, assessment invites, etc.
 * Sorted newest-first. Includes campaign title and read/read_at status.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = await notificationUseCases.getInteractionHistory(id);
    return NextResponse.json(history);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error fetching interaction history:", error);
    return NextResponse.json(
      { error: "Failed to fetch interaction history" },
      { status: 500 }
    );
  }
}
