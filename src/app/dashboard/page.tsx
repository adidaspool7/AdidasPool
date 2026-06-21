"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { Skeleton } from "@client/components/ui/skeleton";
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

// ─── Dashboard Skeleton ─────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* 4 stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2 medium cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── HR Dashboard ────────────────────────────────────────────────
interface HrActivityItem {
  id: string;
  type: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  candidate?: { id: string; firstName: string | null; lastName: string | null } | null;
  job?: { id: string; title: string } | null;
}
function HRDashboard() {
  const [overview, setOverview] = useState({
    totalCandidates: 0,
    openPositions: 0,
    totalApplications: 0,
    shortlisted: 0,
    assessments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hrActivity, setHrActivity] = useState<HrActivityItem[]>([]);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setOverview(d.overview))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/hr/me/activity")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (Array.isArray(d)) setHrActivity(d); })
      .catch(() => {});
  }, []);

  const stats = [
    {
      title: "Total Candidates",
      value: loading ? null : overview.totalCandidates.toLocaleString(),
      description: "In talent pool",
      icon: Users,
    },
    {
      title: "Open Positions",
      value: loading ? null : overview.openPositions.toLocaleString(),
      description: "Active job openings",
      icon: Briefcase,
    },
    {
      title: "Applications",
      value: loading ? null : overview.totalApplications.toLocaleString(),
      description: "Total received",
      icon: ClipboardCheck,
    },
    {
      title: "Watchlist",
      value: loading ? null : overview.shortlisted.toLocaleString(),
      description: "Ready for interview",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to TalentHub. Overview of your recruitment pipeline.
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
              <div className="text-2xl font-bold">
                {stat.value ?? <Skeleton className="h-8 w-16" />}
              </div>
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

      {/* ── Activity Log ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Activity Log
            <span className="text-sm font-normal text-muted-foreground ml-auto">
              {hrActivity.length} action{hrActivity.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hrActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {hrActivity.map((item) => {
                const typeLabels: Record<string, string> = {
                  STATUS_CHANGE: "Status changed",
                  CONTACT_EMAIL_SENT: "Email sent",
                  PROMOTIONAL: "Campaign sent",
                  JOB_POSTED: "Job posted",
                  APPLICATION_RECEIVED: "Application",
                };
                const typeColors: Record<string, string> = {
                  STATUS_CHANGE: "bg-blue-100 text-blue-700",
                  CONTACT_EMAIL_SENT: "bg-green-100 text-green-700",
                  PROMOTIONAL: "bg-purple-100 text-purple-700",
                  JOB_POSTED: "bg-orange-100 text-orange-700",
                };
                const label = typeLabels[item.type] ?? item.type;
                const colorClass = typeColors[item.type] ?? "bg-muted text-muted-foreground";
                const candidateName = item.candidate
                  ? [item.candidate.firstName, item.candidate.lastName].filter(Boolean).join(" ") || "Unknown"
                  : null;
                const newStatus = item.metadata?.newStatus as string | undefined;
                const emailSubject = item.metadata?.subject as string | undefined;
                return (
                  <div key={item.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                      {label}
                    </span>
                    <div className="flex-1 min-w-0">
                      {candidateName && (
                        <a
                          href={`/dashboard/candidates/${item.candidate?.id}`}
                          className="font-medium hover:underline"
                        >
                          {candidateName}
                        </a>
                      )}
                      {newStatus && (
                        <span className="ml-1 text-muted-foreground">→ {newStatus}</span>
                      )}
                      {emailSubject && (
                        <span className="ml-1 text-muted-foreground truncate">&ldquo;{emailSubject}&rdquo;</span>
                      )}
                      {item.job && (
                        <span className="ml-1 text-muted-foreground text-xs">· {item.job.title}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
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
  const [loading, setLoading] = useState(true);
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
      .catch(() => {})
      .finally(() => setLoading(false));
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
      value: loading ? null : String(appStats.total),
      description: "Submitted applications",
      icon: FileText,
    },
    {
      title: "Assessments",
      value: loading ? null : "0",
      description: "Pending or completed",
      icon: ClipboardCheck,
    },
    {
      title: "In Progress",
      value: loading ? null : String(appStats.inProgress),
      description: "Under review",
      icon: Clock,
    },
    {
      title: "Completed",
      value: loading ? null : String(appStats.completed),
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
              <div className="text-2xl font-bold">
                {stat.value ?? <Skeleton className="h-8 w-16" />}
              </div>
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
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function DashboardPage() {
  const { role, isLoading } = useRole();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (role === "candidate") {
    return <CandidateDashboard />;
  }

  return <HRDashboard />;
}
