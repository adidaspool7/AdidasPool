import { NextResponse, type NextRequest } from "next/server";
import { requireHr } from "@/lib/auth/require-hr";
import { dashboardWidgetUseCases } from "@server/application";
import { WidgetSpecValidationError } from "@server/application/use-cases/dashboard-widget.use-cases";

export async function GET() {
  const auth = await requireHr();
  if (auth.response) return auth.response;
  const widgets = await dashboardWidgetUseCases.listForUser(auth.user.id);
  return NextResponse.json({ widgets });
}

export async function POST(req: NextRequest) {
  const auth = await requireHr();
  if (auth.response) return auth.response;

  let body: { title?: string; spec?: unknown };
  try {
    body = (await req.json()) as { title?: string; spec?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const widget = await dashboardWidgetUseCases.createForUser(auth.user.id, {
      title: String(body.title ?? ""),
      spec: body.spec,
    });
    return NextResponse.json({ widget }, { status: 201 });
  } catch (err) {
    if (err instanceof WidgetSpecValidationError) {
      return NextResponse.json(
        { error: "Invalid widget", issues: err.issues },
        { status: 400 }
      );
    }
    console.error("[analytics/widgets POST] failed", err);
    return NextResponse.json({ error: "Failed to create widget" }, { status: 500 });
  }
}
