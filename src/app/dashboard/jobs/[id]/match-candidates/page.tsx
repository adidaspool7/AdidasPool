"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Separator } from "@client/components/ui/separator";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  SlidersHorizontal,
  MoreHorizontal,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { cn } from "@client/lib/utils";

// ============================================
// TYPES (mirror server response)
// ============================================

interface CriterionResult {
  key: string;
  label: string;
  score: number;
  applicable: boolean;
  met: boolean;
  detail: string;
}

interface JobFitResult {
  overallScore: number;
  isEligible: boolean;
  breakdown: CriterionResult[];
}

interface RankedMatch {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    location: string | null;
    country: string | null;
    primaryBusinessArea: string | null;
    profileScore: number | null;
  };
  fit: JobFitResult;
}

interface MatchResponse {
  job: { id: string; title: string; sourceUrl: string | null };
  requirements: {
    fieldsOfWork?: string[];
    seniorityLevel?: string | null;
    minYearsInField?: number | null;
    requiredSkills?: string[];
    preferredSkills?: string[];
    requiredLanguages?: Array<{ language: string; cefr?: string | null }>;
    requiredEducationLevel?: string | null;
    responsibilitiesSummary?: string | null;
  };
  matches: RankedMatch[];
}

// ============================================
// HELPERS
// ============================================

// Per-criterion weights — must mirror server `CRITERION_KEYS` in
// src/server/domain/services/job-fit.service.ts.
const CRITERION_KEYS = [
  "field",
  "experience",
  "seniority",
  "requiredSkills",
  "preferredSkills",
  "languages",
  "education",
] as const;
type CriterionKey = (typeof CRITERION_KEYS)[number];

const CRITERION_LABELS: Record<CriterionKey, string> = {
  field: "Field of Work",
  experience: "Experience (years)",
  seniority: "Seniority",
  requiredSkills: "Required Skills",
  preferredSkills: "Preferred Skills",
  languages: "Languages",
  education: "Education",
};

const BALANCED_PRESET: Record<CriterionKey, number> = {
  field: 2,
  experience: 2,
  seniority: 1,
  requiredSkills: 3,
  preferredSkills: 1,
  languages: 1,
  education: 1,
};

const SKILLS_FIRST_PRESET: Record<CriterionKey, number> = {
  field: 2,
  experience: 1,
  seniority: 1,
  requiredSkills: 3,
  preferredSkills: 2,
  languages: 1,
  education: 1,
};

const EXPERIENCE_FIRST_PRESET: Record<CriterionKey, number> = {
  field: 3,
  experience: 3,
  seniority: 2,
  requiredSkills: 1,
  preferredSkills: 1,
  languages: 1,
  education: 1,
};

const PRESETS: { label: string; weights: Record<CriterionKey, number> }[] = [
  { label: "Balanced", weights: BALANCED_PRESET },
  { label: "Skills-first", weights: SKILLS_FIRST_PRESET },
  { label: "Experience-first", weights: EXPERIENCE_FIRST_PRESET },
];

function mergeWeights(raw: Record<string, number> | undefined): Record<CriterionKey, number> {
  const out: Record<CriterionKey, number> = { ...BALANCED_PRESET };
  if (raw) {
    for (const k of CRITERION_KEYS) {
      const v = raw[k];
      if (typeof v === "number" && Number.isFinite(v)) {
        out[k] = Math.max(0, Math.min(3, v));
      }
    }
  }
  return out;
}

function weightsEqual(a: Record<CriterionKey, number>, b: Record<CriterionKey, number>): boolean {
  return CRITERION_KEYS.every((k) => a[k] === b[k]);
}

function fitBadge(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 60) return "bg-blue-100 text-blue-800";
  if (score >= 40) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

// Parse the requiredSkills criterion's detail string to extract a short
// "Missing: <first> +N" chip. Detail format example:
//   "Has 2 of 4 required skills. Missing: Foo, Bar."
function missingSkillsSummary(breakdown: CriterionResult[]): string | null {
  const c = breakdown.find((b) => b.key === "requiredSkills");
  if (!c || !c.applicable || c.met) return null;
  const m = c.detail.match(/Missing:\s*([^.]+)/i);
  if (!m) return null;
  const skills = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (skills.length === 0) return null;
  if (skills.length === 1) return `Missing: ${skills[0]}`;
  return `Missing: ${skills[0]} +${skills.length - 1}`;
}

// ============================================
// PAGE
// ============================================

export default function MatchCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // HR-tunable scoring config. All persisted on scoring_weights (global).
  const [threshold, setThreshold] = useState<number>(0.5);
  const [thresholdDraft, setThresholdDraft] = useState<number>(0.5);
  const [criterionWeights, setCriterionWeights] = useState<Record<CriterionKey, number>>(BALANCED_PRESET);
  const [criterionWeightsDraft, setCriterionWeightsDraft] = useState<Record<CriterionKey, number>>(BALANCED_PRESET);
  const [savingConfig, setSavingConfig] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  // Collapsed by default — HR rarely tunes weights, so it should not
  // dominate the page above the candidate list.
  const [matchSettingsOpen, setMatchSettingsOpen] = useState(false);

  // Pure UI knob — minimum fit score to display. Not persisted.
  const [scoreFloor, setScoreFloor] = useState<number>(0);

  // Load the current threshold + weights once.
  useEffect(() => {
    fetch("/api/scoring/weights")
      .then((r) => r.json())
      .then((w: { requiredSkillThreshold?: number; fitCriterionWeights?: Record<string, number> }) => {
        const t =
          typeof w.requiredSkillThreshold === "number" ? w.requiredSkillThreshold : 0.5;
        setThreshold(t);
        setThresholdDraft(t);
        const cw = mergeWeights(w.fitCriterionWeights);
        setCriterionWeights(cw);
        setCriterionWeightsDraft(cw);
      })
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const res = await fetch(`/api/jobs/${id}/match-candidates`, {
        // Bypass HTTP cache so that re-loading after a Match Settings
        // change always re-runs the matcher with the new weights.
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (typeof err?.code === "string") setErrorCode(err.code);
        throw new Error(err.error || `Server error (${res.status})`);
      }
      const json = (await res.json()) as MatchResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load matches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggle = (cid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  // Persist threshold + weights and re-load matches so scores reflect them.
  const saveConfig = async () => {
    const thresholdChanged = Math.abs(thresholdDraft - threshold) >= 0.005;
    const weightsChanged = (Object.keys(criterionWeightsDraft) as CriterionKey[]).some(
      (k) => criterionWeightsDraft[k] !== criterionWeights[k]
    );
    if (!thresholdChanged && !weightsChanged) return;
    setSavingConfig(true);
    try {
      const res = await fetch("/api/scoring/weights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requiredSkillThreshold: thresholdDraft,
          fitCriterionWeights: criterionWeightsDraft,
        }),
      });
      if (res.ok) {
        setThreshold(thresholdDraft);
        setCriterionWeights(criterionWeightsDraft);
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg =
          err.error +
          (err.details ? `: ${JSON.stringify(err.details)}` : "") ||
          `Failed to save match settings (HTTP ${res.status}).`;
        setError(msg);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save match settings.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Force-invalidate the cached parsed_requirements and re-extract via LLM.
  const reparseRequirements = async () => {
    setReparsing(true);
    try {
      const res = await fetch(`/api/jobs/${id}/reparse-requirements`, {
        method: "POST",
      });
      if (res.ok) {
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Re-parse failed.");
      }
    } finally {
      setReparsing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        Parsing job & ranking candidates…
      </div>
    );
  }

  if (error) {
    const isClosed = errorCode === "JOB_CLOSED";
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="inline-flex items-center text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Job Matching
        </button>
        <Card className={isClosed ? "border-amber-500" : "border-destructive"}>
          <CardHeader>
            <CardTitle className={isClosed ? "text-amber-700 dark:text-amber-400" : "text-destructive"}>
              {isClosed ? "This job is closed" : "Could not load matches"}
            </CardTitle>
            <CardDescription>
              {isClosed
                ? "adidas Careers no longer lists this posting as accepting applications. We’ve marked the job as closed and won’t parse it further. Existing applications and historical data are unaffected."
                : error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {!isClosed && (
              <Button variant="outline" onClick={load}>
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
              </Button>
            )}
            <Button variant={isClosed ? "default" : "ghost"} onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Job Matching
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const eligible = data.matches.filter((m) => m.fit.isEligible);
  const ineligible = data.matches.filter((m) => !m.fit.isEligible);
  // Always rank everyone; HR uses the score floor (UI-only) to filter.
  const visible = data.matches.filter((m) => m.fit.overallScore >= scoreFloor);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-muted-foreground mb-2 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Job Matching
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-600" />
              {data.job.title}
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={load}>
                <RefreshCw className="w-4 h-4 mr-2" /> Re-run
              </DropdownMenuItem>
              <DropdownMenuItem onClick={reparseRequirements} disabled={reparsing}>
                {reparsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Re-parsing…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" /> Re-parse JD
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Parsed JD requirements (placed above Match Settings so HR can
          eyeball "what's the matcher scoring against?" before tuning) */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Parsed Job Requirements</CardTitle>
              <CardDescription>What the matcher is scoring against.</CardDescription>
            </div>
            {data.job.sourceUrl && (
              <a
                href={data.job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1 shrink-0"
              >
                View on adidas Careers <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-sm grid gap-3 md:grid-cols-2">
          <div>
            <div className="font-medium text-muted-foreground mb-1">Fields of Work</div>
            <div className="flex flex-wrap gap-1">
              {(data.requirements.fieldsOfWork ?? []).length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                data.requirements.fieldsOfWork!.map((f) => (
                  <Badge key={f} variant="secondary">{f}</Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground mb-1">Seniority / Experience</div>
            <div>
              {data.requirements.seniorityLevel ?? "Any"} ·{" "}
              {data.requirements.minYearsInField != null
                ? `${data.requirements.minYearsInField}+ yrs in field`
                : "no minimum"}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground mb-1">Required Skills</div>
            <div className="flex flex-wrap gap-1">
              {(data.requirements.requiredSkills ?? []).length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                data.requirements.requiredSkills!.map((s) => (
                  <Badge key={s} className="bg-blue-100 text-blue-800">{s}</Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground mb-1">Preferred Skills</div>
            <div className="flex flex-wrap gap-1">
              {(data.requirements.preferredSkills ?? []).length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                data.requirements.preferredSkills!.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground mb-1">Languages</div>
            <div className="flex flex-wrap gap-1">
              {(data.requirements.requiredLanguages ?? []).length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                data.requirements.requiredLanguages!.map((l) => (
                  <Badge key={l.language} variant="secondary">
                    {l.language}{l.cefr ? ` ${l.cefr}` : ""}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <div className="font-medium text-muted-foreground mb-1">Education</div>
            <div>{data.requirements.requiredEducationLevel ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Match Settings (HR-tunable, global). Placed below Parsed
          Requirements so HR sees "what we're matching against" first,
          then the levers to reshape the ranking, immediately above the
          ranked candidate list. */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMatchSettingsOpen((v) => !v)}
              className="flex items-center gap-2 text-left hover:opacity-80"
              aria-expanded={matchSettingsOpen}
            >
              {matchSettingsOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Match Settings</CardTitle>
            </button>
            {matchSettingsOpen && (
              <div className="flex items-center gap-2 ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
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
                      <li>Set a weight to <strong>0</strong> to fully ignore that dimension.</li>
                      <li>Eligibility ignores zero-weight criteria.</li>
                    </ul>
                  </PopoverContent>
                </Popover>
                <div className="flex items-center gap-1">
                  {PRESETS.map((p) => {
                    const active = weightsEqual(criterionWeightsDraft, p.weights);
                    return (
                      <Button
                        key={p.label}
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setCriterionWeightsDraft({ ...p.weights })}
                        disabled={savingConfig}
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
        {matchSettingsOpen && (
        <CardContent className="pt-2 pb-4 px-4">
          {/* Per-criterion weight sliders */}
          <div className="grid gap-3 md:grid-cols-2">
            {CRITERION_KEYS.map((k) => {
              const v = criterionWeightsDraft[k];
              const isOff = v === 0;
              return (
                <div key={k} className="flex items-center gap-3 text-sm">
                  <span className={cn("w-44 shrink-0", isOff && "text-muted-foreground line-through")}>
                    {CRITERION_LABELS[k]}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={v}
                    onChange={(e) =>
                      setCriterionWeightsDraft((prev) => ({
                        ...prev,
                        [k]: Number(e.target.value),
                      }))
                    }
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-blue-600"
                    disabled={savingConfig}
                  />
                  <span
                    className={cn(
                      "w-16 text-right text-xs",
                      isOff ? "text-muted-foreground italic" : "text-blue-600"
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
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
                    ?
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-xs">
                  Minimum fraction of the Job Description&apos;s required skills
                  a candidate must cover for the eligibility.
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
                onChange={(e) => setThresholdDraft(Number(e.target.value) / 100)}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-blue-600"
                disabled={savingConfig}
              />
              <span className="text-sm font-semibold tabular-nums w-12 text-right">
                {Math.round(thresholdDraft * 100)}%
              </span>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={saveConfig}
              disabled={
                savingConfig ||
                (Math.abs(thresholdDraft - threshold) < 0.005 &&
                  weightsEqual(criterionWeightsDraft, criterionWeights))
              }
            >
              {savingConfig ? (
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

      {/* Ranking summary + score floor (UI-only filter, not persisted) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{visible.length}</span>{" "}
          shown · <span className="font-semibold text-foreground">{eligible.length}</span> meet
          all reqs · <span className="font-semibold text-foreground">{ineligible.length}</span>{" "}
          partial · {data.matches.length} total
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Min fit</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={scoreFloor}
            onChange={(e) => setScoreFloor(Number(e.target.value))}
            className="w-32 h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-blue-600"
          />
          <span className="font-semibold tabular-nums w-10 text-right">{scoreFloor}%</span>
        </div>
      </div>

      {/* Subtitle placed immediately above the candidate list. */}
      <p className="text-sm text-muted-foreground">
        Ranked candidates by Fit-for-this-job
      </p>

      {/* Ranked candidates */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {visible.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {data.matches.length === 0
                  ? "No candidates yet. Upload more CVs."
                  : `No candidates above ${scoreFloor}% fit. Lower the Min fit slider to see more.`}
              </div>
            ) : (
              visible.map((m, i) => {
                const isOpen = expanded.has(m.candidate.id);
                const missing = missingSkillsSummary(m.fit.breakdown);
                return (
                  <div key={m.candidate.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggle(m.candidate.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="w-10 text-right text-sm text-muted-foreground tabular-nums">
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {m.candidate.firstName} {m.candidate.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                          <span className="truncate">
                            {[m.candidate.primaryBusinessArea, m.candidate.location, m.candidate.country]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                          {missing && (
                            <span className="shrink-0 inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                              {missing}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-0.5">
                          <Badge
                            className={`${fitBadge(m.fit.overallScore)} font-bold tabular-nums text-base px-3 py-1`}
                          >
                            {Math.round(m.fit.overallScore)}
                          </Badge>
                          {m.fit.isEligible ? (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> All reqs met
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                              <XCircle className="w-3 h-3" /> Partial fit
                            </span>
                          )}
                        </div>
                        <Link href={`/dashboard/candidates/${m.candidate.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-3 h-3 mr-1" /> Open
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 ml-12 grid gap-2 md:grid-cols-2">
                        {m.fit.breakdown.map((c) => (
                          <div
                            key={c.key}
                            className="flex items-start gap-2 text-sm border rounded-md px-3 py-2"
                          >
                            <div className="mt-0.5">
                              {!c.applicable ? (
                                <span className="text-muted-foreground">—</span>
                              ) : c.met ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium">{c.label}</div>
                                <div className="text-xs tabular-nums text-muted-foreground">
                                  {c.applicable ? `${Math.round(c.score)}` : "n/a"}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">{c.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />
    </div>
  );
}
