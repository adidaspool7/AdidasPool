import { NextResponse, type NextRequest } from "next/server";
import { requireHr } from "@/lib/auth/require-hr";
import { dashboardWidgetUseCases } from "@server/application";
import { WidgetSpecValidationError } from "@server/application/use-cases/dashboard-widget.use-cases";
import { createLogger } from "@server/infrastructure/logging/logger";

const log = createLogger("api/analytics/query");

export async function POST(req: NextRequest) {
  const auth = await requireHr();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await dashboardWidgetUseCases.runQuery(body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WidgetSpecValidationError) {
      return NextResponse.json(
        { error: "Invalid widget spec", issues: err.issues },
        { status: 400 }
      );
    }
    log.error("[analytics/query] failed", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
