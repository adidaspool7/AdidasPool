/**
 * PATCH /api/candidates/[id]/skills/[skillId]/verification
 * HR-only: override the verification status of a specific skill.
 *
 * Body: { verificationStatus: "PENDING" | "PASSED" | "FAILED" | "UNVERIFIED" }
 *
 * - PENDING  → grants the candidate access to (re-)take the interview.
 * - PASSED / FAILED → HR manual decision; stored with verified_by = HR email.
 *   The UI distinguishes AI decisions (verified_by = "AI") from HR overrides
 *   (verified_by = HR email) and shows an OVERRIDDEN badge accordingly.
 * - UNVERIFIED → resets the skill to its default state.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@server/infrastructure/database/supabase-client";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  verificationStatus: z.enum(["PENDING", "PASSED", "FAILED", "UNVERIFIED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if ((user.app_metadata?.role ?? user.user_metadata?.role) !== "hr") {
      return NextResponse.json({ error: "Forbidden — HR only" }, { status: 403 });
    }

    const { id: candidateId, skillId } = await params;

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: skillRow, error: skillError } = await db
      .from("skills")
      .select("id, name, candidate_id")
      .eq("id", skillId)
      .eq("candidate_id", candidateId)
      .single();

    if (skillError || !skillRow) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const { error: updateError } = await db
      .from("skills")
      .update({
        verification_status: parsed.data.verificationStatus,
        verified_at: new Date().toISOString(),
        // "AI" is reserved for automated decisions; HR email marks manual override
        verified_by: user.email ?? "HR",
      })
      .eq("id", skillId)
      .eq("candidate_id", candidateId);

    if (updateError) {
      console.error("Error updating skill verification:", updateError);
      return NextResponse.json(
        { error: "Failed to update skill verification status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      skillId,
      skillName: (skillRow as { name: string }).name,
      verificationStatus: parsed.data.verificationStatus,
      verifiedBy: user.email,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in skill verification override:", error);
    return NextResponse.json(
      { error: "Failed to update skill verification" },
      { status: 500 }
    );
  }
}
