/**
 * GET /api/me   — Returns full candidate profile (creates demo if none)
 * PATCH /api/me — Updates candidate profile fields
 */

import { NextRequest, NextResponse } from "next/server";
import { profileUseCases, NotFoundError } from "@server/application";
import { UpdateProfileSchema } from "@server/application/dtos";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const candidate = await profileUseCases.getCurrentProfile();
    return NextResponse.json(candidate);
  } catch (error) {
    console.error("Error getting current user:", error);
    return NextResponse.json(
      { error: "Failed to get current user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await profileUseCases.updateProfile(parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get("mode");

    if (mode === "cv") {
      const updated = await profileUseCases.deleteCurrentCv();
      return NextResponse.json(updated);
    }

    await profileUseCases.deleteCurrentProfile();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error deleting profile data:", error);
    return NextResponse.json(
      { error: "Failed to delete profile data" },
      { status: 500 }
    );
  }
}
