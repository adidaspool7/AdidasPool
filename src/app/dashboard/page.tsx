"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import {
  Users,
  Briefcase,
  ClipboardCheck,
  TrendingUp,
  MapPin,
  ArrowRight,
  FileText,
  Clock,
  CheckCircle2,
  Upload,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { useRole } from "@client/components/providers/role-provider";
import { Button } from "@client/components/ui/button";
import { Progress } from "@client/components/ui/progress";
import { Badge } from "@client/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

// ─── HR Dashboard ────────────────────────────────────────────────

function HRDashboard() {
  const [overview, setOverview] = useState({
    totalCandidates: 0,
    openPositions: 0,
    totalApplications: 0,
    shortlisted: 0,
    assessments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setOverview(d.overview))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      title: "Total Candidates",
      value: loading ? "–" : overview.totalCandidates.toLocaleString(),
      description: "In talent pool",
      icon: Users,
    },
    {
      title: "Open Positions",
      value: loading ? "–" : overview.openPositions.toLocaleString(),
      description: "Active job openings",
      icon: Briefcase,
    },
    {
      title: "Applications",
      value: loading ? "–" : overview.totalApplications.toLocaleString(),
      description: "Total received",
      icon: ClipboardCheck,
    },
    {
      title: "Shortlisted",
      value: loading ? "–" : overview.shortlisted.toLocaleString(),
      description: "Ready for interview",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Talent Intelligence Platform. Overview of your
          recruitment pipeline.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No CV batches uploaded yet. Go to CV Upload to get started.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No assessments completed yet.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Candidate Dashboard ─────────────────────────────────────────

interface DocMeta {
  fileName: string;
  uploadedAt: string;
}

function CandidateDashboard() {
  const [cvMeta, setCvMeta] = useState<DocMeta | null>(null);
  const [mlMeta, setMlMeta] = useState<DocMeta | null>(null);
  const [mlUploading, setMlUploading] = useState(false);
  const mlInputRef = useRef<HTMLInputElement>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [appStats, setAppStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
  });

  useEffect(() => {
    try {
      const cv = localStorage.getItem("cv-upload-meta");
      if (cv) setCvMeta(JSON.parse(cv));
      const ml = localStorage.getItem("ml-upload-meta");
      if (ml) setMlMeta(JSON.parse(ml));
    } catch {
      /* ignore corrupted data */
    }

    // Fetch real application stats via /api/me to get candidateId
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((candidate) => {
        if (!candidate?.id) return;
        setCandidateId(candidate.id);
        return fetch(`/api/applications?candidateId=${candidate.id}`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((apps) => {
            const list = Array.isArray(apps) ? apps : apps.applications || [];
            const total = list.filter(
              (a: any) => a.status !== "WITHDRAWN"
            ).length;
            const completedStatuses = ["ACCEPTED", "REJECTED", "HIRED"];
            const inProgress = list.filter(
              (a: any) =>
                a.status !== "WITHDRAWN" && !completedStatuses.includes(a.status)
            ).length;
            const completed = list.filter(
              (a: any) => completedStatuses.includes(a.status)
            ).length;
            setAppStats({ total, inProgress, completed });
          });
      })
      .catch(() => {});
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleMotivationLetterUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large. Maximum 10MB.");
      return;
    }

    setMlUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/motivation-letter", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const meta: DocMeta = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      };
      localStorage.setItem("ml-upload-meta", JSON.stringify(meta));
      setMlMeta(meta);
      toast.success("Motivation letter uploaded!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setMlUploading(false);
      e.target.value = "";
    }
  };

  const stats = [
    {
      title: "My Applications",
      value: String(appStats.total),
      description: "Submitted applications",
      icon: FileText,
    },
    {
      title: "Assessments",
      value: "0",
      description: "Pending or completed",
      icon: ClipboardCheck,
    },
    {
      title: "In Progress",
      value: String(appStats.inProgress),
      description: "Under review",
      icon: Clock,
    },
    {
      title: "Completed",
      value: String(appStats.completed),
      description: "Finalized processes",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header row with Porto CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your application journey.
          </p>
        </div>

        <Link
          href="https://onboarding-aibot.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <Button
            variant="outline"
            className="group relative overflow-hidden border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 dark:border-blue-800 dark:from-blue-950/40 dark:to-sky-950/40 dark:hover:from-blue-950/60 dark:hover:to-sky-950/60 h-auto py-3 px-4 text-left max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/50">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Moving to Porto?
                </p>
                <p className="text-xs text-blue-600/80 dark:text-blue-300/80">
                  Let our Onboarding Assistant guide you
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-400 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Last CV Upload */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CV / Resume</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {cvMeta ? (
              <div className="space-y-1">
                <p className="text-sm font-medium truncate">
                  {cvMeta.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {formatDate(cvMeta.uploadedAt)}
                </p>
                <Link href="/dashboard/upload">
                  <Button variant="outline" size="sm" className="mt-2">
                    View / Edit
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No CV uploaded yet.
                </p>
                <Link href="/dashboard/upload">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CV
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Motivation Letter */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Motivation Letter
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {mlMeta ? (
              <div className="space-y-1">
                <p className="text-sm font-medium truncate">
                  {mlMeta.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {formatDate(mlMeta.uploadedAt)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => mlInputRef.current?.click()}
                  disabled={mlUploading}
                >
                  {mlUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    "Replace"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No motivation letter uploaded yet.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mlInputRef.current?.click()}
                  disabled={mlUploading}
                >
                  {mlUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            )}
            <input
              ref={mlInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleMotivationLetterUpload}
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Track the status of your submitted applications.
            </p>
            <Link href="/dashboard/applications">
              <Button variant="outline" size="sm">
                View Applications
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Job Openings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Browse available positions and apply.
            </p>
            <Link href="/dashboard/jobs">
              <Button variant="outline" size="sm">
                Browse Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Best matching jobs (collapsible) */}
      {candidateId && <BestMatchingJobsSection candidateId={candidateId} />}
    </div>
  );
}

// ─── Best Matching Jobs (candidate) ──────────────────────────────

interface CandidateJobMatch {
  jobId: string;
  title: string;
  department: string | null;
  location: string | null;
  country: string | null;
  type: string | null;
  sourceUrl: string | null;
  overallScore: number;
  isEligible: boolean;
  breakdown: {
    criterion: string;
    met: boolean;
    score: number;
    details: string;
  }[];
}

function BestMatchingJobsSection({ candidateId }: { candidateId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<CandidateJobMatch[]>([]);

  async function ensureLoaded() {
    if (loaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/match-jobs`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Server error (${res.status})`);
      setMatches(body.matches ?? []);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) void ensureLoaded();
  }

  const top = matches.filter((m) => m.overallScore > 0).slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Find my best matching jobs
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            See which open positions fit your profile best based on your CV.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleToggle}>
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span className="ml-1">{open ? "Hide" : "Show"}</span>
        </Button>
      </CardHeader>

      {open && (
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ranking positions against your profile…
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && top.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No open positions matched your profile yet. Keep your CV up to
              date — HR might also invite you directly.
            </p>
          )}
          {!loading && !error && top.length > 0 && (
            <div className="space-y-2">
              {top.map((m) => {
                const scoreColor =
                  m.overallScore >= 75
                    ? "text-emerald-600"
                    : m.overallScore >= 50
                    ? "text-amber-600"
                    : "text-muted-foreground";
                return (
                  <div
                    key={m.jobId}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {m.title}
                        </p>
                        {m.type === "INTERNSHIP" && (
                          <Badge variant="outline" className="text-[10px]">
                            Internship
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[m.department, m.location, m.country]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Progress value={m.overallScore} className="h-2 w-24" />
                        <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
                          {m.overallScore}%
                        </span>
                      </div>
                      {m.sourceUrl ? (
                        <a
                          href={m.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          adidas Careers <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <Link
                          href="/dashboard/jobs"
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function DashboardPage() {
  const { role } = useRole();

  if (role === "candidate") {
    return <CandidateDashboard />;
  }

  return <HRDashboard />;
}
