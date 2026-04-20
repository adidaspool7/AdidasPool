"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { Separator } from "@client/components/ui/separator";
import { Input } from "@client/components/ui/input";
import {
  Briefcase,
  MapPin,
  Building2,
  Globe,
  ExternalLink,
  Loader2,
  User,
  Mail,
  CalendarDays,
  Search,
  Inbox,
  SendHorizonal,
  FileSearch,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  ChevronDown,
  ArrowRight,
  Trophy,
  Phone,
  Award,
  Handshake,
  ThumbsUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";

// ============================================
// TYPES
// ============================================

interface ApplicationJob {
  id: string;
  title: string;
  type: string;
  department: string | null;
  location: string | null;
  country: string | null;
  status: string;
  sourceUrl: string | null;
  externalId: string | null;
}

interface ApplicationCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  shortlisted?: boolean;
}

interface ReceivedApplication {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  job: ApplicationJob;
  candidate: ApplicationCandidate;
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
    className?: string;
  }
> = {
  SUBMITTED: {
    label: "Received",
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
    className: "bg-indigo-100 text-indigo-700 border-indigo-300",
  },
  ADVANCED: {
    label: "Advanced",
    variant: "default",
    icon: ArrowRight,
    className: "bg-blue-100 text-blue-700 border-blue-300",
  },
  FINAL_STAGE: {
    label: "Final Stage",
    variant: "default",
    icon: Trophy,
    className: "bg-purple-100 text-purple-700 border-purple-300",
  },
  OFFER_SENT: {
    label: "Offer Sent",
    variant: "outline",
    icon: Award,
    className: "bg-amber-50 text-amber-800 border-amber-300",
  },
  ACCEPTED: {
    label: "Accepted",
    variant: "default",
    icon: ThumbsUp,
    className: "bg-emerald-600 text-white border-emerald-700",
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
  // Legacy statuses (backwards compat)
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

/** Ordered pipeline statuses HR can assign to an application */
const APPLICATION_TRACKING_STATUSES = [
  "RECEIVED",
  "IN_REVIEW",
  "ASSESSMENT_READY",
  "INTERVIEWING",
  "ADVANCED",
  "FINAL_STAGE",
  "OFFER_SENT",
  "ACCEPTED",
  "REJECTED",
] as const;

// ============================================
// RECEIVED APPLICATION CARD
// ============================================

function ReceivedApplicationCard({
  application,
  onStatusChange,
}: {
  application: ReceivedApplication;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { job, candidate } = application;
  const config = statusConfig[application.status] || statusConfig.SUBMITTED;
  const StatusIcon = config.icon;
  const appliedDate = new Date(application.createdAt).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <Card>
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
          {/* Status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="focus:outline-none shrink-0">
                <Badge
                  variant={config.variant}
                  className={`gap-1 cursor-pointer hover:opacity-80 transition-opacity ${config.className || ""}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {APPLICATION_TRACKING_STATUSES.map((s) => {
                const sc = statusConfig[s];
                if (!sc) return null;
                const SIcon = sc.icon;
                return (
                  <DropdownMenuItem
                    key={s}
                    disabled={application.status === s}
                    onClick={() => onStatusChange(application.id, s)}
                  >
                    <Badge
                      variant={sc.variant}
                      className={`text-xs mr-2 gap-1 ${sc.className || ""}`}
                    >
                      <SIcon className="h-3 w-3" />
                      {sc.label}
                    </Badge>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Candidate info */}
        <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            {candidate.shortlisted && (
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
            )}
            <User className="h-4 w-4 text-muted-foreground" />
            {candidate.firstName} {candidate.lastName}
          </div>
          {candidate.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {candidate.email}
            </div>
          )}
        </div>

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
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// RECEIVED APPLICATIONS PAGE
// ============================================

export default function ReceivedApplicationsPage() {
  const [applications, setApplications] = useState<ReceivedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await fetch("/api/applications/all");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setApplications(data);
    } catch (error) {
      console.error("Error fetching received applications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(applicationId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateStatus", status: newStatus }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === applicationId ? { ...a, status: newStatus } : a
          )
        );
      }
    } catch {
      /* silent */
    }
  }

  // Filter to job applications only (exclude internships), exclude withdrawn, then apply search
  const activeApplications = applications.filter(
    (app) => app.status !== "WITHDRAWN" && app.job.type !== "INTERNSHIP"
  );

  const filtered = activeApplications.filter((app) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      app.job.title.toLowerCase().includes(q) ||
      app.candidate.firstName.toLowerCase().includes(q) ||
      app.candidate.lastName.toLowerCase().includes(q) ||
      (app.candidate.email?.toLowerCase().includes(q) ?? false) ||
      (app.job.department?.toLowerCase().includes(q) ?? false) ||
      (app.job.location?.toLowerCase().includes(q) ?? false) ||
      (app.job.country?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Received Applications
        </h1>
        <p className="text-muted-foreground">
          Review job applications submitted by candidates.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by job, candidate, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Inbox className="h-4 w-4" />
            {activeApplications.length} application
            {activeApplications.length !== 1 ? "s" : ""} received
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {search.trim()
              ? "No applications match your search."
              : "No applications received yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <ReceivedApplicationCard
              key={app.id}
              application={app}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
