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
  BookOpen,
  MapPin,
  Building2,
  Globe,
  ExternalLink,
  Loader2,
  User,
  Mail,
  CalendarDays,
  Search,
  SendHorizonal,
  FileSearch,
  CheckCircle2,
  XCircle,
  GraduationCap,
  FileText,
} from "lucide-react";

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
}

interface ReceivedApplication {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  notes: string | null;
  learningAgreementUrl: string | null;
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
  }
> = {
  SUBMITTED: {
    label: "Submitted",
    variant: "outline",
    icon: SendHorizonal,
  },
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
};

// ============================================
// INTERNSHIP APPLICATION CARD
// ============================================

function InternshipApplicationCard({
  application,
}: {
  application: ReceivedApplication;
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
            <CardTitle className="text-base leading-snug flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
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
        {/* Candidate info */}
        <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-medium">
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

        {/* Learning agreement link */}
        {application.learningAgreementUrl && (
          <a
            href={application.learningAgreementUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            Learning Agreement
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

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
// INTERNSHIP APPLICATIONS PAGE
// ============================================

export default function InternshipApplicationsPage() {
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
      console.error("Error fetching internship applications:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter to internship applications only, exclude withdrawn
  const internshipApplications = applications.filter(
    (app) => app.status !== "WITHDRAWN" && app.job.type === "INTERNSHIP"
  );

  const filtered = internshipApplications.filter((app) => {
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
          Internship Applications
        </h1>
        <p className="text-muted-foreground">
          Review applications submitted by candidates for internship programmes.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by internship, candidate, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {internshipApplications.length} internship application
            {internshipApplications.length !== 1 ? "s" : ""} received
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
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {search.trim()
              ? "No internship applications match your search."
              : "No internship applications received yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => (
            <InternshipApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  );
}
