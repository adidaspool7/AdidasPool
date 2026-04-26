"use client";

import { useEffect, useState, use } from "react";
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
  job: { id: string; title: string };
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
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showIneligible, setShowIneligible] = useState(false);

  // HR-tunable: fraction of JD required skills a candidate must cover to
  // be flagged eligible. Persisted on scoring_weights.required_skill_threshold.
  const [threshold, setThreshold] = useState<number>(0.5);
  const [thresholdDraft, setThresholdDraft] = useState<number>(0.5);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [reparsing, setReparsing] = useState(false);

  // Load the current threshold once.
  useEffect(() => {
    fetch("/api/scoring/weights")
      .then((r) => r.json())
      .then((w: { requiredSkillThreshold?: number }) => {
        const t =
          typeof w.requiredSkillThreshold === "number" ? w.requiredSkillThreshold : 0.5;
        setThreshold(t);
        setThresholdDraft(t);
      })
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${id}/match-candidates`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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

  // Persist threshold and re-load matches so eligibility reflects the new cutoff.
  const saveThreshold = async () => {
    if (Math.abs(thresholdDraft - threshold) < 0.005) return;
    setSavingThreshold(true);
    try {
      const res = await fetch("/api/scoring/weights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredSkillThreshold: thresholdDraft }),
      });
      if (res.ok) {
        setThreshold(thresholdDraft);
        await load();
      }
    } finally {
      setSavingThreshold(false);
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
    return (
      <div className="p-6">
        <Link href="/dashboard/job-matching" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Job Matching
        </Link>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load matches</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const eligible = data.matches.filter((m) => m.fit.isEligible);
  const ineligible = data.matches.filter((m) => !m.fit.isEligible);
  const visible = showIneligible ? data.matches : eligible;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/job-matching"
          className="inline-flex items-center text-sm text-muted-foreground mb-2 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Job Matching
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-600" />
              {data.job.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ranked candidates by Fit-for-this-job (independent of Profile score).
            </p>
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

      {/* Eligibility threshold (HR-tunable, global) */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Eligibility threshold</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
                    What is this?
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-xs">
                  <p className="mb-2">
                    Minimum fraction of a job&apos;s <strong>required</strong> skills a candidate
                    must cover to be flagged <strong>eligible</strong>.
                  </p>
                  <p className="text-muted-foreground">
                    Lowering it surfaces candidates who match most — but not all — of the musts.
                    Set to 100% to restore the strict all-or-nothing rule. Applies globally to every job.
                  </p>
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
                disabled={savingThreshold}
              />
              <span className="text-sm font-semibold tabular-nums w-12 text-right">
                {Math.round(thresholdDraft * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-1">
              {[
                { label: "Relaxed", v: 0.5 },
                { label: "Balanced", v: 0.66 },
                { label: "Strict", v: 1 },
              ].map((p) => (
                <Button
                  key={p.label}
                  variant={Math.abs(thresholdDraft - p.v) < 0.01 ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setThresholdDraft(p.v)}
                  disabled={savingThreshold}
                >
                  {p.label} {Math.round(p.v * 100)}%
                </Button>
              ))}
              <Button
                size="sm"
                className="h-7 text-xs ml-1"
                onClick={saveThreshold}
                disabled={
                  savingThreshold || Math.abs(thresholdDraft - threshold) < 0.005
                }
              >
                {savingThreshold ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving…
                  </>
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parsed JD requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parsed Job Requirements</CardTitle>
          <CardDescription>What the matcher is scoring against.</CardDescription>
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

      {/* Ranking summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{eligible.length}</span> eligible ·{" "}
          <span className="font-semibold text-foreground">{ineligible.length}</span> not eligible ·{" "}
          {data.matches.length} total
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowIneligible((v) => !v)}
        >
          {showIneligible ? "Hide ineligible" : "Show ineligible"}
        </Button>
      </div>

      {/* Ranked candidates */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {visible.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No candidates match yet. Upload more CVs or relax requirements.
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
                              <CheckCircle2 className="w-3 h-3" /> Eligible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-400">
                              <XCircle className="w-3 h-3" /> Not eligible
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
