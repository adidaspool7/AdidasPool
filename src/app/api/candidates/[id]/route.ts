import { NextRequest, NextResponse } from "next/server";
import { candidateUseCases, NotFoundError } from "@server/application";
import { UpdateCandidateSchema, CandidateRelationsUpdateSchema } from "@server/application/dtos";
import type { CandidateRelationsInput } from "@server/domain/ports/repositories";

/**
 * GET /api/candidates/[id]
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: CandidateUseCases.getCandidateById
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidate = await candidateUseCases.getCandidateById(id);
    return NextResponse.json(candidate);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error fetching candidate:", error);
    return NextResponse.json(
      { error: "Failed to fetch candidate" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/candidates/[id]
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: CandidateUseCases.updateCandidate
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Separate personal fields from relations
    const { experiences, education, languages, skills, ...personalFields } = body;

    // Normalize linkedinUrl — add protocol if missing
    if (personalFields.linkedinUrl && typeof personalFields.linkedinUrl === "string") {
      const url = personalFields.linkedinUrl.trim();
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        personalFields.linkedinUrl = `https://${url}`;
      }
    }

    // Validate personal fields
    const parsed = UpdateCandidateSchema.safeParse(personalFields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Validate relations if provided
    const relationsInput = { experiences, education, languages, skills };
    const hasRelations = experiences || education || languages || skills;

    if (hasRelations) {
      const relParsed = CandidateRelationsUpdateSchema.safeParse(relationsInput);
      if (!relParsed.success) {
        return NextResponse.json(
          { error: "Relations validation failed", details: relParsed.error.flatten() },
          { status: 400 }
        );
      }

      const candidate = await candidateUseCases.updateCandidateWithRelations(
        id,
        parsed.data,
        relParsed.data as Partial<CandidateRelationsInput>
      );
      return NextResponse.json(candidate);
    }

    const candidate = await candidateUseCases.updateCandidate(id, parsed.data);
    return NextResponse.json(candidate);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error updating candidate:", error);
    return NextResponse.json(
      { error: "Failed to update candidate" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/candidates/[id]
 *
 * Deletes a candidate and all related data (experiences, education, languages,
 * skills, applications, assessments, interview sessions, notes, etc.).
 * Also removes stored CV and motivation letter blobs from storage.
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: CandidateUseCases.deleteCandidate
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await candidateUseCases.deleteCandidate(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error deleting candidate:", error);
    return NextResponse.json(
      { error: "Failed to delete candidate" },
      { status: 500 }
    );
  }
}
