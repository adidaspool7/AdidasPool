import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { candidateUseCases, notificationUseCases, NotFoundError } from "@server/application";
import { emailService } from "@server/container";
import { createClient } from "@/lib/supabase/server";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/candidates/[id]/contact");

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

    // Resolve the authenticated HR user for attribution
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const createdBy = user?.email ?? user?.user_metadata?.name ?? undefined;

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

    // Build recipient list — primary email always present, secondary if set
    const recipients: string[] = [candidate.email];
    if (candidate.secondaryEmail) recipients.push(candidate.secondaryEmail);

    const result = await emailService.sendContactEmail(
      recipients,
      candidateName,
      subject,
      body
    );

    if (!result.success) {
      log.error("Contact email failed:", result.error);
      return NextResponse.json(
        { error: result.error ?? "Failed to send email" },
        { status: 502 }
      );
    }

    // Persist the sent email as an interaction-history record so HR can
    // review it on the candidate profile page.
    try {
      await notificationUseCases.create({
        type: "CONTACT_EMAIL_SENT",
        message: subject,
        targetRole: "CANDIDATE",
        candidateId: id,
        createdBy,
        metadata: { subject, body },
      });
    } catch (err) {
      // Non-fatal: email was delivered, just log the failure
      log.error("Failed to log CONTACT_EMAIL_SENT notification:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    log.error("Error sending contact email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
