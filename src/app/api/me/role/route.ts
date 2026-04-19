import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/me/role
 * Sets the authenticated user's role in app_metadata (immutable from client).
 * Only works if the user does not already have a role.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role already set — reject
  if (
    user.app_metadata?.role === "candidate" ||
    user.app_metadata?.role === "hr"
  ) {
    return NextResponse.json(
      { error: "Role already assigned" },
      { status: 409 }
    );
  }

  const body = await request.json();
  const role = body.role;

  if (role !== "candidate" && role !== "hr") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ role });
}
