import { NextRequest, NextResponse } from "next/server";
import { scoringWeightsRepository } from "@server/application";
import { z } from "zod";

const WeightsUpdateSchema = z.object({
  experience: z.number().min(0).max(1),
  yearsOfExperience: z.number().min(0).max(1),
  educationLevel: z.number().min(0).max(1),
  locationMatch: z.number().min(0).max(1),
  language: z.number().min(0).max(1),
  presetName: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
}).refine(
  (w) => {
    const sum = w.experience + w.yearsOfExperience + w.educationLevel + w.locationMatch + w.language;
    return Math.abs(sum - 1) < 0.01;
  },
  { message: "Weights must sum to 1.0 (100%)" }
);

/**
 * GET /api/scoring/weights
 * Returns the current scoring weight configuration.
 */
export async function GET() {
  try {
    const weights = await scoringWeightsRepository.get();
    return NextResponse.json(weights);
  } catch (error) {
    console.error("Error fetching scoring weights:", error);
    return NextResponse.json(
      { error: "Failed to fetch scoring weights" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scoring/weights
 * Update scoring weight configuration.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = WeightsUpdateSchema.parse(body);
    const weights = await scoringWeightsRepository.upsert(parsed);
    return NextResponse.json(weights);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating scoring weights:", error);
    return NextResponse.json(
      { error: "Failed to update scoring weights" },
      { status: 500 }
    );
  }
}
