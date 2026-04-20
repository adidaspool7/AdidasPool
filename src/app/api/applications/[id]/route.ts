/**
 * PATCH /api/applications/[id]
 *
 * Update an application (withdraw, or change status for HR tracking).
 */

import { NextRequest, NextResponse } from "next/server";
import { applicationUseCases } from "@server/application";

const VALID_STATUSES = new Set([
  "SUBMITTED", "RECEIVED", "IN_REVIEW", "ASSESSMENT_READY",
  "INTERVIEWING", "ADVANCED", "FINAL_STAGE", "OFFER_SENT",
  "ACCEPTED", "REJECTED", "WITHDRAWN",
  // Legacy
  "UNDER_REVIEW", "INVITED", "ASSESSED", "SHORTLISTED",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "withdraw") {
      const updated = await applicationUseCases.withdrawApplication(id);
      return NextResponse.json(updated);
    }

    if (action === "updateStatus") {
      const { status } = body;
      if (!status || !VALID_STATUSES.has(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      const updated = await applicationUseCases.updateApplication(id, { status });
      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}
