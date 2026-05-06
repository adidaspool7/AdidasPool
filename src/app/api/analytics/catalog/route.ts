import { NextResponse } from "next/server";
import { requireHr } from "@/lib/auth/require-hr";
import { dashboardWidgetUseCases } from "@server/application";

export async function GET() {
  const auth = await requireHr();
  if (auth.response) return auth.response;
  return NextResponse.json(dashboardWidgetUseCases.getCatalog());
}
