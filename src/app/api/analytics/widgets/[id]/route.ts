import { NextResponse, type NextRequest } from "next/server";
import { requireHr } from "@/lib/auth/require-hr";
import { dashboardWidgetUseCases } from "@server/application";
import { WidgetSpecValidationError } from "@server/application/use-cases/dashboard-widget.use-cases";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;
  const { id } = await params;

  let body: { title?: string; spec?: unknown; position?: number };
  try {
    body = (await req.json()) as { title?: string; spec?: unknown; position?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const widget = await dashboardWidgetUseCases.updateForUser(id, auth.user.id, body);
    if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ widget });
  } catch (err) {
    if (err instanceof WidgetSpecValidationError) {
      return NextResponse.json(
        { error: "Invalid widget", issues: err.issues },
        { status: 400 }
      );
    }
    console.error("[analytics/widgets PATCH] failed", err);
    return NextResponse.json({ error: "Failed to update widget" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHr();
  if (auth.response) return auth.response;
  const { id } = await params;
  const removed = await dashboardWidgetUseCases.deleteForUser(id, auth.user.id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
