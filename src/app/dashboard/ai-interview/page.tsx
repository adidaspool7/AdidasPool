"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import { useRole } from "@client/components/providers/role-provider";

interface CandidateProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  skills?: Array<{ name: string; category?: string }>;
  experiences?: Array<{ jobTitle?: string; description?: string }>;
}

interface InterviewResult {
  id: string;
  createdAt: string;
  evaluatedAt: string | null;
  targetSkill: string | null;
  finalDecision: "PASS" | "FAIL" | null;
  technicalDecision: "PASS" | "FAIL" | null;
  integrityDecision: string | null;
  evaluationRationale: Record<string, string> | null;
  terminationReason: string | null;
}

export default function AiInterviewPageWrapper() {
  return (
    <Suspense fallback={<div>Loading interview module...</div>}>
      <AiInterviewPage />
    </Suspense>
  );
}

function AiInterviewPage() {
  const { role } = useRole();
  const searchParams = useSearchParams();
  const requestedSkill = searchParams.get("skill") || "";

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    if (!role) return;

    if (role === "hr") {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const [profileRes, resultsRes] = await Promise.all([
          fetch("/api/me", { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }),
          fetch("/api/interview/results"),
        ]);

        if (!profileRes.ok) throw new Error("Failed to load candidate profile");

        const data = (await profileRes.json()) as CandidateProfile;
        setCandidate(data);

        if (resultsRes.ok) {
          const r = (await resultsRes.json()) as { results: InterviewResult[] };
          setResults(r.results || []);
        }
      } catch (err) {
        console.error("Failed to load AI interview candidate profile:", err);
        setError("Could not load your profile for AI interview.");
      } finally {
        setLoading(false);
        setResultsLoading(false);
      }
    })();
  }, [role]);

  const skills = useMemo(
    () => (candidate?.skills || []).map((s) => s.name).filter(Boolean),
    [candidate]
  );

  const activeSkill = useMemo(() => {
    if (!requestedSkill) return "";
    return skills.includes(requestedSkill) ? requestedSkill : "";
  }, [requestedSkill, skills]);

  if (role === "hr") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Technical Interview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Skill validation is available for candidates/interviewees only.
          </p>
          <Link href="/dashboard/assessments">
            <Button variant="outline">Back to Assessments</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Technical Interview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !candidate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Technical Interview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">{error || "Candidate not found."}</p>
          <Link href="/dashboard/assessments">
            <Button variant="outline">Back to Assessments</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const launchInterviewWindow = async () => {
    if (!candidate) return;
    setLaunching(true);
    setError(null);
    try {
      const response = await fetch("/api/interview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          targetSkill: activeSkill || undefined,
        }),
      });
      const data = (await response.json()) as { token?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to create interview session");
      }

      const win = window.open(
        `/interview/${encodeURIComponent(data.token ?? "")}`,
        "ai-interview-runtime",
        "popup=yes,width=1280,height=800,noopener,noreferrer"
      );
      if (!win) {
        throw new Error("Popup blocked. Please allow popups and try again.");
      }
      win.focus();

      // Refresh results after window is opened (poll after a delay)
      setTimeout(() => {
        setResultsLoading(true);
        fetch("/api/interview/results")
          .then((r) => r.json())
          .then((r: { results?: InterviewResult[] }) => setResults(r.results || []))
          .catch(() => {})
          .finally(() => setResultsLoading(false));
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch interview window");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Technical Interview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Candidate:{" "}
            <span className="font-medium">
              {candidate.firstName} {candidate.lastName}
            </span>
          </p>

          {!activeSkill ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Select one of your skills to start validation:
              </p>

              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Link
                      key={skill}
                      href={`/dashboard/ai-interview?skill=${encodeURIComponent(skill)}`}
                    >
                      <Button size="sm" variant="outline">
                        {skill}
                      </Button>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No skills found in your profile yet. Upload or update your profile first.
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm">
                Target skill: <span className="font-medium">{activeSkill}</span>
              </p>

              <Button onClick={launchInterviewWindow} disabled={launching}>
                {launching ? "Launching..." : "Launch Controlled Interview Window"}
              </Button>

              <p className="text-xs text-muted-foreground">
                The interview window includes a camera preview, voice recording, and total/per-question
                timers. Press <strong>End</strong> inside the window to finish early and receive your
                evaluation.
              </p>
            </>
          )}

          <Link href="/dashboard/assessments">
            <Button variant="outline">Back to Assessments</Button>
          </Link>
        </CardContent>
      </Card>

      {/* ── Past Interview Results ─────────────────────────────────────────── */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Interview Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resultsLoading && (
              <p className="text-xs text-muted-foreground">Refreshing results…</p>
            )}
            {results.map((r) => (
              <div key={r.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {r.evaluatedAt
                      ? new Date(r.evaluatedAt).toLocaleString()
                      : new Date(r.createdAt).toLocaleString()}
                    {r.targetSkill ? ` — ${r.targetSkill}` : ""}
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
                <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                  <span>
                    Technical:{" "}
                    <strong className="text-foreground">{r.technicalDecision ?? "—"}</strong>
                  </span>
                  <span>
                    Integrity:{" "}
                    <strong className="text-foreground">{r.integrityDecision ?? "—"}</strong>
                  </span>
                </div>
                {r.evaluationRationale && (
                  <div className="mt-2 space-y-0.5 rounded border bg-muted/30 p-2 text-xs text-muted-foreground">
                    {Object.entries(r.evaluationRationale).map(([k, v]) => (
                      <p key={k}>
                        <span className="font-medium capitalize text-foreground">{k}:</span> {v}
                      </p>
                    ))}
                  </div>
                )}
                {r.terminationReason && r.terminationReason !== "backend_ended" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ended: {r.terminationReason.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
