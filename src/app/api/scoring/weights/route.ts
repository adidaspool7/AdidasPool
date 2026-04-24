import { NextRequest, NextResponse } from "next/server";
import { scoringWeightsRepository } from "@server/application";
import { z } from "zod";

const WeightsUpdateSchema = z.object({
  experience: z.number().min(0).max(1),
  yearsOfExperience: z.number().min(0).max(1),
  educationLevel: z.number().min(0).max(1),
  locationMatch: z.number().min(0).max(1),
  language: z.number().min(0).max(1),
  requiredSkillThreshold: z.number().min(0).max(1).optional(),
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
 * Schema for PATCH \u2014 partial update, currently only the fit-matcher
 * threshold. Kept separate from WeightsUpdateSchema so HR can tweak
 * eligibility without being forced to resubmit the full weight vector.
 */
const ThresholdPatchSchema = z.object({
  requiredSkillThreshold: z.number().min(0).max(1),
  updatedBy: z.string().nullable().optional(),
});

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

/**
 * PATCH /api/scoring/weights
 *
 * Partial update for HR knobs that don't require re-submitting the full
 * weight vector. Today that's only `requiredSkillThreshold` (the job-fit
 * eligibility cut-off). Merges onto the current row.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ThresholdPatchSchema.parse(body);
    const current = await scoringWeightsRepository.get();
    const weights = await scoringWeightsRepository.upsert({
      experience: current.experience,
      yearsOfExperience: current.yearsOfExperience,
      educationLevel: current.educationLevel,
      locationMatch: current.locationMatch,
      language: current.language,
      presetName: current.presetName,
      requiredSkillThreshold: parsed.requiredSkillThreshold,
      updatedBy: parsed.updatedBy ?? current.updatedBy,
    });
    return NextResponse.json(weights);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error patching scoring weights:", error);
    return NextResponse.json(
      { error: "Failed to patch scoring weights" },
      { status: 500 }
    );
  }
}
