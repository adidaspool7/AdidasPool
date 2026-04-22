import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { candidateUseCases, ValidationError } from "@server/application";

const NoteSchema = z.object({
  author: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
});

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
    const parsed = NoteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { author, content } = parsed.data;

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
