import { NextRequest, NextResponse } from "next/server";
import { candidateUseCases, ValidationError } from "@server/application";

/**
 * POST /api/candidates/[id]/notes
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: CandidateUseCases.addNote
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { author, content } = await request.json();

    const note = await candidateUseCases.addNote(id, author, content);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
