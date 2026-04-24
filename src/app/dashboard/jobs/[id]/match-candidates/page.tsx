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
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

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
    matchScore: number | null;
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

function qualityLabel(q: number | null): string {
  if (q == null) return "—";
  return `${Math.round(q)}`;
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
        <Link href="/dashboard/jobs" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to jobs
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
          href="/dashboard/jobs"
          className="inline-flex items-center text-sm text-muted-foreground mb-2 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to jobs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-600" />
              {data.job.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ranked candidates by Fit-for-this-job (independent of Quality score).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Re-run
          </Button>
        </div>
      </div>

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
                        <div className="text-xs text-muted-foreground truncate">
                          {[m.candidate.primaryBusinessArea, m.candidate.location, m.candidate.country]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Quality</div>
                          <div className="font-semibold tabular-nums">
                            {qualityLabel(m.candidate.matchScore)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Fit
                          </div>
                          <Badge className={`${fitBadge(m.fit.overallScore)} font-semibold tabular-nums`}>
                            {Math.round(m.fit.overallScore)}
                          </Badge>
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
      <p className="text-xs text-muted-foreground">
        Quality is the universal candidate-profile score. Fit is computed strictly against this
        job&apos;s parsed requirements (fields, seniority, skills, languages, education).
      </p>
    </div>
  );
}
