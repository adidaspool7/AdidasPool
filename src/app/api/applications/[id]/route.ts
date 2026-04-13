/**
 * PATCH /api/applications/[id]
 *
 * Update an application's status (e.g., withdraw).
 */

import { NextRequest, NextResponse } from "next/server";
import { applicationUseCases } from "@server/application";

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
