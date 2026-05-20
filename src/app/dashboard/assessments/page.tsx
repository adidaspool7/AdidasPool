"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import { Badge } from "@client/components/ui/badge";
import { Sparkles, Languages, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { useRole } from "@client/components/providers/role-provider";

// ─── Types ────────────────────────────────────────────────────────────────────

type SkillVerificationStatus = "UNVERIFIED" | "PENDING" | "PASSED" | "FAILED" | "OVERRIDDEN";

interface CandidateSkill {
  name: string;
  category?: string;
  verificationStatus?: SkillVerificationStatus;
}

interface CandidateProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  skills?: CandidateSkill[];
  experiences?: Array<{ jobTitle?: string; description?: string }>;
}

interface InterviewResult {
  id: string;
  createdAt: string;
  evaluatedAt: string | null;
  targetSkill: string | null;
  interviewMode: string | null;
  finalDecision: "PASS" | "FAIL" | null;
  technicalDecision: "PASS" | "FAIL" | null;
  integrityDecision: string | null;
  evaluationRationale: Record<string, string> | null;
  terminationReason: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = ["English", "Portuguese", "Spanish", "German", "French"] as const;

const CEFR_COLORS: Record<string, string> = {
  A1: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  A2: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  B1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  B2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  C1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  C2: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

const STATUS_CONFIG: Record<
  SkillVerificationStatus,
  { label: string; icon: React.ReactNode; badge: string }
> = {
  UNVERIFIED: {
    label: "Unverified",
    icon: <Clock className="h-3 w-3" />,
    badge: "bg-muted text-muted-foreground",
  },
  PENDING: {
    label: "Pending validation",
    icon: <AlertCircle className="h-3 w-3 text-blue-500" />,
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  PASSED: {
    label: "Validated",
    icon: <CheckCircle2 className="h-3 w-3 text-green-500" />,
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  FAILED: {
    label: "Failed",
    icon: <XCircle className="h-3 w-3 text-red-500" />,
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  OVERRIDDEN: {
    label: "Overridden",
    icon: <CheckCircle2 className="h-3 w-3 text-purple-500" />,
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canLaunch(status: SkillVerificationStatus | undefined): boolean {
  if (!status || status === "UNVERIFIED") return true;
  return status === "PENDING";
}

// ─── Past results card ────────────────────────────────────────────────────────

function PastResultCard({ r, mode }: { r: InterviewResult; mode: "LANGUAGE" | "TECHNICAL" }) {
  const isLanguage = mode === "LANGUAGE";
  const cefrLevel =
    isLanguage
      ? (r.evaluationRationale?.["cefr_level"] ?? r.technicalDecision ?? null)
      : null;

  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {r.evaluatedAt
            ? new Date(r.evaluatedAt).toLocaleString()
            : new Date(r.createdAt).toLocaleString()}
          {isLanguage && r.evaluationRationale?.["target_language"]
            ? ` — ${r.evaluationRationale["target_language"]}`
            : ""}
          {!isLanguage && r.targetSkill ? ` — ${r.targetSkill}` : ""}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            r.finalDecision === "PASS"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : r.finalDecision === "FAIL"
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {r.finalDecision ?? "Pending"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {isLanguage && cefrLevel && (
          <span>
            CEFR:{" "}
            <span className={`rounded px-1.5 py-0.5 font-semibold ${CEFR_COLORS[cefrLevel] ?? "bg-muted text-muted-foreground"}`}>
              {cefrLevel}
            </span>
          </span>
        )}
        {isLanguage && r.evaluationRationale?.["grammar"] && (
          <span>Grammar: <strong className="text-foreground">{r.evaluationRationale["grammar"]}</strong></span>
        )}
        {isLanguage && r.evaluationRationale?.["vocabulary"] && (
          <span>Vocabulary: <strong className="text-foreground">{r.evaluationRationale["vocabulary"]}</strong></span>
        )}
        {isLanguage && r.evaluationRationale?.["fluency"] && (
          <span>Fluency: <strong className="text-foreground">{r.evaluationRationale["fluency"]}</strong></span>
        )}
        {isLanguage && r.evaluationRationale?.["writing"] && (
          <span>Writing: <strong className="text-foreground">{r.evaluationRationale["writing"]}</strong></span>
        )}
        {!isLanguage && (
          <span>Technical: <strong className="text-foreground">{r.technicalDecision ?? "—"}</strong></span>
        )}
        <span>Integrity: <strong className="text-foreground">{r.integrityDecision ?? "—"}</strong></span>
      </div>

      {r.evaluationRationale?.["final"] && (
        <p className="mt-1.5 text-xs text-muted-foreground italic">
          {r.evaluationRationale["final"]}
        </p>
      )}
      {r.terminationReason && r.terminationReason !== "backend_ended" && (
        <p className="mt-1 text-xs text-muted-foreground">
          Ended: {r.terminationReason.replace(/_/g, " ")}
        </p>
      )}
    </div>
  );
}

// ─── Main page (inner) ────────────────────────────────────────────────────────

function SkillValidationPage() {
  const { role } = useRole();
  const searchParams = useSearchParams();
  const requestedSkill = searchParams.get("skill") ?? "";

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Language assessment state
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [launchingLanguage, setLaunchingLanguage] = useState(false);

  // Technical assessment state
  const [launchingSkill, setLaunchingSkill] = useState<string | null>(null);

  // ── Load profile + past results
  useEffect(() => {
    if (!role || role === "hr") {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [profileRes, resultsRes] = await Promise.all([
          fetch("/api/me", { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }),
          fetch("/api/interview/results"),
        ]);
        if (!profileRes.ok) throw new Error("Failed to load profile");
        setCandidate((await profileRes.json()) as CandidateProfile);
        if (resultsRes.ok) {
          const r = (await resultsRes.json()) as { results: InterviewResult[] };
          setResults(r.results ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  // ── Derived data
  const skills = useMemo(
    () => (candidate?.skills ?? []).filter((s) => Boolean(s.name)),
    [candidate]
  );

  const activeSkill = useMemo(() => {
    if (!requestedSkill) return "";
    const match = skills.find((s) => s.name === requestedSkill);
    return match && canLaunch(match.verificationStatus) ? match.name : "";
  }, [requestedSkill, skills]);

  const languageResults = useMemo(
    () => results.filter((r) => r.interviewMode === "LANGUAGE"),
    [results]
  );
  const technicalResults = useMemo(
    () => results.filter((r) => r.interviewMode !== "LANGUAGE"),
    [results]
  );

  // ── Launch helpers
  async function launchWindow(
    mode: "LANGUAGE" | "TECHNICAL",
    opts: { targetSkill?: string; targetLanguage?: string }
  ) {
    if (!candidate) return;
    const res = await fetch("/api/interview/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: candidate.id,
        interviewMode: mode,
        targetSkill: opts.targetSkill,
        targetLanguage: opts.targetLanguage,
      }),
    });
    const data = (await res.json()) as { token?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to create session");
    const win = window.open(
      `/interview/${encodeURIComponent(data.token ?? "")}`,
      "ai-interview-runtime",
      "popup=yes,width=1280,height=800,noopener,noreferrer"
    );
    if (!win) throw new Error("Popup blocked — please allow popups and try again.");
    win.focus();
    // Refresh results after a short delay
    setTimeout(() => {
      fetch("/api/interview/results")
        .then((r) => r.json())
        .then((r: { results?: InterviewResult[] }) => setResults(r.results ?? []))
        .catch(() => {});
    }, 5000);
  }

  async function launchLanguageAssessment() {
    setLaunchingLanguage(true);
    setError(null);
    try {
      await launchWindow("LANGUAGE", { targetLanguage: selectedLanguage });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setLaunchingLanguage(false);
    }
  }

  async function launchTechnicalAssessment(skillName: string) {
    setLaunchingSkill(skillName);
    setError(null);
    try {
      await launchWindow("TECHNICAL", { targetSkill: skillName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setLaunchingSkill(null);
    }
  }

  // ── Guard: HR sees nothing here
  if (role === "hr") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skill Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Skill validation is available for candidates only.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Skill Validation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !candidate) {
    return (
      <Card>
        <CardHeader><CardTitle>Skill Validation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Skill Validation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Validate your language proficiency and technical skills through AI-powered assessments.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* ── Section 1: Language Assessment ──────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Language Assessment</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Primary
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Language Proficiency Interview</CardTitle>
            <CardDescription>
              A structured assessment conducted by an AI examiner following the official Language
              Assessment Protocol. The interview consists of a personalised intro, five oral questions
              about your professional background and values, a written dictation task, and a closing.
              Scored on the CEFR rubric across grammar, vocabulary, fluency, and writing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <label htmlFor="lang-select" className="text-sm font-medium whitespace-nowrap">
                Language to assess:
              </label>
              <select
                id="lang-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div className="rounded-md border bg-muted/40 px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p>• The interview window requires camera and microphone access and runs in fullscreen.</p>
              <p>• Voice input (STT) is supported on Chrome and Edge. You can also type your answers.</p>
              <p>• The AI will conduct the entire session in <strong className="text-foreground">{selectedLanguage}</strong>.</p>
              <p>• Results appear below after the session ends.</p>
            </div>

            <Button
              onClick={launchLanguageAssessment}
              disabled={launchingLanguage || !candidate}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {launchingLanguage ? "Launching…" : `Launch ${selectedLanguage} Assessment`}
            </Button>
          </CardContent>
        </Card>

        {/* Past language results */}
        {languageResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Past language assessments</p>
            {languageResults.map((r) => (
              <PastResultCard key={r.id} r={r} mode="LANGUAGE" />
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Technical Skill Validation ───────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Technical Skill Validation</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CV-Extracted Skills</CardTitle>
            <CardDescription>
              Skills extracted from your uploaded CV. Skills marked as{" "}
              <span className="font-medium text-foreground">Pending validation</span> by your recruiter
              can be validated through an AI technical interview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No skills found in your profile. Upload your CV first to have skills extracted automatically.
              </p>
            ) : (
              <div className="divide-y">
                {skills.map((skill) => {
                  const status = skill.verificationStatus ?? "UNVERIFIED";
                  const cfg = STATUS_CONFIG[status];
                  const launchable = canLaunch(skill.verificationStatus);
                  const isLaunching = launchingSkill === skill.name;

                  return (
                    <div
                      key={skill.name}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{skill.name}</p>
                        {skill.category && (
                          <p className="text-xs text-muted-foreground">{skill.category}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        {launchable && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLaunching || launchingSkill !== null}
                            onClick={() => launchTechnicalAssessment(skill.name)}
                          >
                            {isLaunching ? "Launching…" : "Validate"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past technical results */}
        {technicalResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Past technical assessments</p>
            {technicalResults.map((r) => (
              <PastResultCard key={r.id} r={r} mode="TECHNICAL" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Wrapper (Suspense boundary for useSearchParams) ──────────────────────────

export default function AssessmentsPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <SkillValidationPage />
    </Suspense>
  );
}
