import { NextRequest, NextResponse } from "next/server";
import { scoringPresetRepository } from "@server/application";
import { z } from "zod";

const CreatePresetSchema = z.object({
  name: z.string().min(1).max(60),
  experience: z.number().min(0).max(1),
  yearsOfExperience: z.number().min(0).max(1),
  educationLevel: z.number().min(0).max(1),
  locationMatch: z.number().min(0).max(1),
  language: z.number().min(0).max(1),
}).refine(
  (w) => {
    const sum = w.experience + w.yearsOfExperience + w.educationLevel + w.locationMatch + w.language;
    return Math.abs(sum - 1) < 0.01;
  },
  { message: "Weights must sum to 1.0 (100%)" }
);

export async function GET() {
  try {
    const presets = await scoringPresetRepository.findAll();
    return NextResponse.json(presets);
  } catch (error) {
    console.error("Error fetching presets:", error);
    return NextResponse.json({ error: "Failed to fetch presets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreatePresetSchema.parse(body);
    const preset = await scoringPresetRepository.create(parsed);
    return NextResponse.json(preset, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating preset:", error);
    return NextResponse.json({ error: "Failed to create preset" }, { status: 500 });
  }
}
