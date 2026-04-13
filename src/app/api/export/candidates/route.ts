import { NextResponse } from "next/server";
import { exportUseCases } from "@server/application";

/**
 * GET /api/export/candidates
 *
 * ONION LAYER: Presentation (thin controller)
 * Delegates to: ExportUseCases.exportCandidatesCsv
 */
export async function GET() {
  try {
    const csv = await exportUseCases.exportCandidatesCsv();

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="candidates_export_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting candidates:", error);
    return NextResponse.json(
      { error: "Failed to export" },
      { status: 500 }
    );
  }
}
