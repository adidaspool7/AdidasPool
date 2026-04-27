import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { candidateUseCases, NotFoundError } from "@server/application";
import { emailService } from "@server/container";

const ContactSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Message body is required").max(10000),
});

/**
 * POST /api/candidates/[id]/contact
 *
 * ONION LAYER: Presentation (thin controller)
 * Sends a custom email from HR to the candidate via Resend.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse + validate request body
    const raw = await request.json().catch(() => null);
    const parsed = ContactSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }
    const { subject, body } = parsed.data;

    // Fetch candidate to get name + email
    const candidate = await candidateUseCases.getCandidateById(id);
    if (!candidate.email) {
      return NextResponse.json(
        { error: "Candidate has no email address on file" },
        { status: 422 }
      );
    }

    const candidateName = `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || "Candidate";

    const result = await emailService.sendContactEmail(
      candidate.email,
      candidateName,
      subject,
      body
    );

    if (!result.success) {
      console.error("Contact email failed:", result.error);
      return NextResponse.json(
        { error: result.error ?? "Failed to send email" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error sending contact email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
