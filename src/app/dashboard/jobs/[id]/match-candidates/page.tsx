"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Separator } from "@client/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@client/components/ui/tabs";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { cn, formatLocation } from "@client/lib/utils";
import {
  BALANCED_PRESET,
  type CriterionKey,
  mergeWeights,
} from "@client/lib/job-fit-weights";
import { ParsedRequirementsCard } from "@client/components/match-candidates/parsed-requirements-card";
import { MatchSettingsCard } from "@client/components/match-candidates/match-settings-card";

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

// Per-job shortlist row as returned by /api/jobs/[id]/shortlist.
interface ShortlistRow {
  id: string;
  jobId: string;
  candidateId: string;
  addedBy: string | null;
  addedAt: string;
  fitScoreAtAdd: number | null;
  notes: string | null;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    location: string | null;
    country: string | null;
    overallCvScore: number | null;
  };
  currentFitScore: number | null;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get("tab") === "shortlist" ? "shortlist" : "ranked";
  const [activeTab, setActiveTab] = useState<"ranked" | "shortlist">(initialTab);
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Per-job shortlist state. Map<candidateId, ShortlistRow>.
  const [shortlist, setShortlist] = useState<Map<string, ShortlistRow>>(new Map());
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [shortlistBusy, setShortlistBusy] = useState<Set<string>>(new Set());

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

  // Load the per-job shortlist alongside the ranked candidates.
  const loadShortlist = async () => {
    setShortlistLoading(true);
    try {
      const res = await fetch(`/api/jobs/${id}/shortlist`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { entries: ShortlistRow[] };
      const map = new Map<string, ShortlistRow>();
      for (const e of json.entries) map.set(e.candidateId, e);
      setShortlist(map);
    } catch {
      // Non-fatal: page still works without star state populated.
    } finally {
      setShortlistLoading(false);
    }
  };

  useEffect(() => {
    loadShortlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleShortlist = async (
    candidateId: string,
    optimisticRow?: Partial<ShortlistRow["candidate"]>
  ) => {
    if (shortlistBusy.has(candidateId)) return;
    setShortlistBusy((prev) => new Set(prev).add(candidateId));
    const wasOn = shortlist.has(candidateId);
    try {
      if (wasOn) {
        const res = await fetch(`/api/jobs/${id}/shortlist/${candidateId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setShortlist((prev) => {
            const next = new Map(prev);
            next.delete(candidateId);
            return next;
          });
        }
      } else {
        const res = await fetch(`/api/jobs/${id}/shortlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId }),
        });
        if (res.ok) {
          // Re-pull just this row to get full candidate enrichment.
          await loadShortlist();
          // Optimistic placeholder fallback if loadShortlist failed silently.
          setShortlist((prev) => {
            if (prev.has(candidateId)) return prev;
            const placeholder: ShortlistRow = {
              id: `tmp-${candidateId}`,
              jobId: id,
              candidateId,
              addedBy: null,
              addedAt: new Date().toISOString(),
              fitScoreAtAdd: null,
              notes: null,
              candidate: {
                id: candidateId,
                firstName: optimisticRow?.firstName ?? "",
                lastName: optimisticRow?.lastName ?? "",
                email: null,
                location: optimisticRow?.location ?? null,
                country: optimisticRow?.country ?? null,
                overallCvScore: null,
              },
              currentFitScore: null,
            };
            const next = new Map(prev);
            next.set(candidateId, placeholder);
            return next;
          });
        }
      }
    } finally {
      setShortlistBusy((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  const removeFromShortlist = async (candidateId: string) => {
    await toggleShortlist(candidateId);
  };

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
      <ParsedRequirementsCard job={data.job} requirements={data.requirements} />

      {/* Match Settings (HR-tunable, global). Placed below Parsed
          Requirements so HR sees "what we're matching against" first,
          then the levers to reshape the ranking, immediately above the
          ranked candidate list. */}
      <MatchSettingsCard
        open={matchSettingsOpen}
        onOpenChange={setMatchSettingsOpen}
        threshold={threshold}
        thresholdDraft={thresholdDraft}
        onThresholdDraftChange={setThresholdDraft}
        weights={criterionWeights}
        weightsDraft={criterionWeightsDraft}
        onWeightsDraftChange={setCriterionWeightsDraft}
        saving={savingConfig}
        onApply={saveConfig}
      />

      {/* Tabs: Ranked candidates / Shortlist */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "ranked" | "shortlist")}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="ranked">Ranked candidates</TabsTrigger>
          <TabsTrigger value="shortlist">
            <Star className="w-3.5 h-3.5 mr-1.5" />
            Shortlist ({shortlist.size})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranked" className="space-y-4">
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
                const isShortlisted = shortlist.has(m.candidate.id);
                const isStarBusy = shortlistBusy.has(m.candidate.id);
                return (
                  <div key={m.candidate.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleShortlist(m.candidate.id, {
                            firstName: m.candidate.firstName,
                            lastName: m.candidate.lastName,
                            location: m.candidate.location,
                            country: m.candidate.country,
                          })
                        }
                        disabled={isStarBusy}
                        className={cn(
                          "shrink-0 transition-colors",
                          isShortlisted
                            ? "text-amber-500 hover:text-amber-600"
                            : "text-muted-foreground hover:text-amber-500"
                        )}
                        title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                        aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                      >
                        <Star
                          className={cn("w-4 h-4", isShortlisted && "fill-amber-400")}
                        />
                      </button>
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
                        {m.fit.breakdown.map((c) => {
                          const weightZero =
                            c.applicable &&
                            (criterionWeights[c.key as CriterionKey] ?? 1) === 0;
                          return (
                          <div
                            key={c.key}
                            className={cn(
                              "flex items-start gap-2 text-sm border rounded-md px-3 py-2",
                              weightZero && "opacity-40"
                            )}
                          >
                            <div className="mt-0.5">
                              {!c.applicable ? (
                                <span className="text-muted-foreground">—</span>
                              ) : c.key === "preferredSkills" ? (
                                // Preferred = bonus metric, never blocks eligibility
                                <span title="Bonus criterion — never blocks eligibility">
                                  <Info className="w-4 h-4 text-sky-400" />
                                </span>
                              ) : c.met && c.score === 0 ? (
                                // Technically passes (e.g. threshold set to 0%) but
                                // no actual coverage — highlight as suspicious
                                <span title="Criterion is met but coverage is zero — check your threshold setting">
                                  <AlertCircle className="w-4 h-4 text-amber-400" />
                                </span>
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
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      </TabsContent>

      <TabsContent value="shortlist" className="space-y-4">
        <ShortlistTab
          jobId={id}
          loading={shortlistLoading}
          rows={Array.from(shortlist.values())}
          busy={shortlistBusy}
          onRemove={removeFromShortlist}
          onReload={loadShortlist}
        />
      </TabsContent>
      </Tabs>

      <Separator />
    </div>
  );
}

// ============================================
// SHORTLIST TAB
// ============================================

function ShortlistTab({
  jobId,
  loading,
  rows,
  busy,
  onRemove,
  onReload,
}: {
  jobId: string;
  loading: boolean;
  rows: ShortlistRow[];
  busy: Set<string>;
  onRemove: (candidateId: string) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const sa = b.currentFitScore ?? b.fitScoreAtAdd ?? -1;
        const sb = a.currentFitScore ?? a.fitScoreAtAdd ?? -1;
        return sa - sb;
      }),
    [rows]
  );

  const saveNote = async (candidateId: string) => {
    setSavingNote(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/shortlist/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draftNote.trim() === "" ? null : draftNote }),
      });
      if (res.ok) {
        await onReload();
        setEditingId(null);
      }
    } finally {
      setSavingNote(false);
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Loading shortlist…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Star className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium text-foreground">No candidates shortlisted yet</p>
          <p className="mt-1">
            Click the star next to a ranked candidate to add them to this job&apos;s shortlist.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {sorted.map((r) => {
            const fullName = `${r.candidate.firstName} ${r.candidate.lastName}`.trim();
            const snapshot = r.fitScoreAtAdd != null ? Math.round(r.fitScoreAtAdd) : null;
            const current = r.currentFitScore != null ? Math.round(r.currentFitScore) : null;
            const isBusy = busy.has(r.candidateId);
            const isEditing = editingId === r.candidateId;
            return (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{fullName || "Unnamed candidate"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatLocation(r.candidate.location, r.candidate.country, " · ") || "—"}
                      {r.addedBy && (
                        <>
                          {" "}· Added by{" "}
                          <span className="font-medium text-foreground">{r.addedBy}</span>
                        </>
                      )}
                      {" "}·{" "}
                      <span title={new Date(r.addedAt).toLocaleString()}>
                        {new Date(r.addedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="text-right text-xs tabular-nums"
                      title={
                        snapshot != null
                          ? `Fit at time of add: ${snapshot}` +
                            (current != null && current !== snapshot
                              ? ` · Current fit: ${current}`
                              : "")
                          : undefined
                      }
                    >
                      <div className="text-muted-foreground">Fit</div>
                      <div className="font-semibold">
                        {current != null ? current : snapshot != null ? snapshot : "—"}
                      </div>
                    </div>
                    <Link href={`/dashboard/candidates/${r.candidateId}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" /> Open
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => onRemove(r.candidateId)}
                      title="Remove from shortlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Note row */}
                <div className="mt-2 ml-7">
                  {isEditing ? (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        className="flex-1 text-sm rounded-md border bg-background px-2 py-1"
                        placeholder="Why this candidate?"
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={savingNote}
                          onClick={() => saveNote(r.candidateId)}
                        >
                          {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          disabled={savingNote}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(r.candidateId);
                        setDraftNote(r.notes ?? "");
                      }}
                      className="text-xs text-left text-muted-foreground hover:text-foreground"
                    >
                      {r.notes ? r.notes : <span className="italic">+ Add a note</span>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
