"use client";

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import { Separator } from "@client/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/components/ui/popover";
import { cn } from "@client/lib/utils";
import {
  CRITERION_KEYS,
  CRITERION_LABELS,
  PRESETS,
  weightsEqual,
  type CriterionKey,
} from "@client/lib/job-fit-weights";

/**
 * HR-tunable Match Settings card: per-criterion weights + required-skill
 * coverage threshold. Stays a controlled component — parent owns drafts,
 * persisted values, and the save action so we can keep the existing
 * `saveConfig()` orchestration (which also re-runs the matcher) untouched.
 */
export interface MatchSettingsCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  threshold: number;
  thresholdDraft: number;
  onThresholdDraftChange: (v: number) => void;

  weights: Record<CriterionKey, number>;
  weightsDraft: Record<CriterionKey, number>;
  onWeightsDraftChange: (next: Record<CriterionKey, number>) => void;

  saving: boolean;
  onApply: () => void;
}

export function MatchSettingsCard({
  open,
  onOpenChange,
  threshold,
  thresholdDraft,
  onThresholdDraftChange,
  weights,
  weightsDraft,
  onWeightsDraftChange,
  saving,
  onApply,
}: MatchSettingsCardProps) {
  const dirty =
    Math.abs(thresholdDraft - threshold) >= 0.005 ||
    !weightsEqual(weightsDraft, weights);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            className="flex items-center gap-2 text-left hover:opacity-80"
            aria-expanded={open}
          >
            {open ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Match Settings</CardTitle>
          </button>
          {open && (
            <div className="flex items-center gap-2 ml-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                  >
                    What is this?
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 text-xs">
                  <p className="mb-2">
                    HR-tunable weights for the 7 fit criteria. The fit score
                    is a <strong>weighted average</strong> of the applicable
                    criteria using these weights.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>
                      Set a weight to <strong>0</strong> to fully ignore that
                      dimension.
                    </li>
                    <li>Eligibility ignores zero-weight criteria.</li>
                  </ul>
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-1">
                {PRESETS.map((p) => {
                  const active = weightsEqual(weightsDraft, p.weights);
                  return (
                    <Button
                      key={p.label}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onWeightsDraftChange({ ...p.weights })}
                      disabled={saving}
                    >
                      {p.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-2 pb-4 px-4">
          {/* Per-criterion weight sliders */}
          <div className="grid gap-3 md:grid-cols-2">
            {CRITERION_KEYS.map((k) => {
              const v = weightsDraft[k];
              const isOff = v === 0;
              return (
                <div key={k} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "w-44 shrink-0",
                      isOff && "text-muted-foreground line-through"
                    )}
                  >
                    {CRITERION_LABELS[k]}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={v}
                    onChange={(e) =>
                      onWeightsDraftChange({
                        ...weightsDraft,
                        [k]: Number(e.target.value),
                      })
                    }
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-blue-600"
                    disabled={saving}
                  />
                  <span
                    className={cn(
                      "w-16 text-right text-xs",
                      isOff
                        ? "text-muted-foreground italic"
                        : "text-blue-600"
                    )}
                    aria-label={isOff ? "off" : `weight ${v} of 3`}
                    title={isOff ? "Ignored" : `Weight ${v} of 3`}
                  >
                    {isOff ? "off" : "★".repeat(v) + "☆".repeat(3 - v)}
                  </span>
                </div>
              );
            })}
          </div>

          <Separator className="my-4" />

          {/* Required-skill coverage threshold + Apply */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Required-skill coverage</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                  >
                    ?
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-xs">
                  Minimum fraction of the Job Description&apos;s required
                  skills a candidate must cover for the eligibility.
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(thresholdDraft * 100)}
                onChange={(e) =>
                  onThresholdDraftChange(Number(e.target.value) / 100)
                }
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-blue-600"
                disabled={saving}
              />
              <span className="text-sm font-semibold tabular-nums w-12 text-right">
                {Math.round(thresholdDraft * 100)}%
              </span>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={onApply}
              disabled={saving || !dirty}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving…
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
