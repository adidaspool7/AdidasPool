"use client";

import { useState, useEffect, useCallback } from "react";
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
  Briefcase,
  MapPin,
  Building2,
  Globe,
  ExternalLink,
  Loader2,
  XCircle,
  Clock,
  CheckCircle2,
  FileSearch,
  SendHorizonal,
  CalendarDays,
  Phone,
  ArrowRight,
  Trophy,
  Award,
  ThumbsUp,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface ApplicationJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  country: string | null;
  status: string;
  sourceUrl: string | null;
  externalId: string | null;
}

interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  job: ApplicationJob;
}

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  SUBMITTED: {
    label: "Submitted",
    variant: "outline",
    icon: SendHorizonal,
  },
  RECEIVED: {
    label: "Received",
    variant: "outline",
    icon: SendHorizonal,
  },
  IN_REVIEW: {
    label: "Under Review",
    variant: "default",
    icon: FileSearch,
  },
  ASSESSMENT_READY: {
    label: "Assessment",
    variant: "secondary",
    icon: CheckCircle2,
  },
  INTERVIEWING: {
    label: "Interviewing",
    variant: "default",
    icon: Phone,
  },
  ADVANCED: {
    label: "Advanced",
    variant: "default",
    icon: ArrowRight,
  },
  FINAL_STAGE: {
    label: "Final Stage",
    variant: "default",
    icon: Trophy,
  },
  OFFER_SENT: {
    label: "Offer Sent",
    variant: "outline",
    icon: Award,
  },
  ACCEPTED: {
    label: "Accepted",
    variant: "default",
    icon: ThumbsUp,
  },
  REJECTED: {
    label: "Rejected",
    variant: "destructive",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    variant: "secondary",
    icon: XCircle,
  },
  // Legacy
  UNDER_REVIEW: {
    label: "Under Review",
    variant: "default",
    icon: FileSearch,
  },
  INVITED: {
    label: "Invited",
    variant: "default",
    icon: CheckCircle2,
  },
  ASSESSED: {
    label: "Assessed",
    variant: "secondary",
    icon: CheckCircle2,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    variant: "default",
    icon: CheckCircle2,
  },
};

// ============================================
// APPLICATION CARD
// ============================================

function ApplicationCard({
  application,
  onWithdraw,
  isWithdrawing,
}: {
  application: Application;
  onWithdraw: (id: string) => void;
  isWithdrawing: boolean;
}) {
  const { job } = application;
  const config = statusConfig[application.status] || statusConfig.SUBMITTED;
  const StatusIcon = config.icon;
  const appliedDate = new Date(application.createdAt).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );
  const isActive = !["WITHDRAWN", "REJECTED"].includes(application.status);

  return (
    <Card className={!isActive ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-snug">
              {job.title}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {job.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {job.department}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
              )}
              {job.country && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {job.country}
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant={config.variant} className="gap-1 shrink-0">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          Applied {appliedDate}
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          {job.sourceUrl ? (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View posting <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span />
          )}
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-600"
              onClick={() => onWithdraw(application.id)}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              Withdraw
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async (cId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/applications?candidateId=${cId}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get or create demo candidate
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((candidate) => {
        if (candidate?.id) {
          const cId = candidate.id;
          setCandidateId(cId);
          fetchApplications(cId);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [fetchApplications]);

  const handleWithdraw = async (applicationId: string) => {
    setWithdrawingId(applicationId);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === applicationId ? { ...a, status: "WITHDRAWN" } : a
          )
        );
      }
    } catch (err) {
      console.error("Failed to withdraw:", err);
    } finally {
      setWithdrawingId(null);
    }
  };

  const activeApplications = applications.filter(
    (a) => !["WITHDRAWN", "REJECTED"].includes(a.status)
  );
  const closedApplications = applications.filter((a) =>
    ["WITHDRAWN", "REJECTED"].includes(a.status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Applications</h1>
        <p className="text-muted-foreground">
          Track the status of your job applications and assessment invitations.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {activeApplications.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Active Application{activeApplications.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {applications.filter((a) => a.status === "SUBMITTED").length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pending Review
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              You haven&apos;t applied to any jobs yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Browse{" "}
              <a
                href="/dashboard/jobs"
                className="text-primary hover:underline"
              >
                Job Openings
              </a>{" "}
              and hover over a job to apply.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active applications */}
          {activeApplications.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Active Applications</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {activeApplications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onWithdraw={handleWithdraw}
                    isWithdrawing={withdrawingId === app.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Closed applications */}
          {closedApplications.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Past Applications
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {closedApplications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onWithdraw={handleWithdraw}
                    isWithdrawing={withdrawingId === app.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
