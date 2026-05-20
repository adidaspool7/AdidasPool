"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@client/components/ui/button";
import { Badge } from "@client/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table";
import {
  Trophy,
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

interface AmbassadorProgram {
  id: string;
  title: string;
  description?: string | null;
  cohort?: string | null;
  applicationDeadline?: string | null;
  location?: string | null;
  country?: string | null;
  status: string;
  maxApplicants?: number | null;
  applicationCount?: number;
}

interface Candidate {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  location?: string | null;
  overallCvScore?: number | null;
  rawCvUrl?: string | null;
}

interface AmbassadorApplication {
  id: string;
  programId: string;
  candidateId: string;
  status: string;
  motivation?: string | null;
  university?: string | null;
  yearOfStudy?: string | null;
  previousExperience?: string | null;
  appliedAt?: string | null;
  candidate?: Candidate;
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
  INVITED: "bg-purple-100 text-purple-700 border-purple-200",
  ASSESSED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  SHORTLISTED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  WITHDRAWN: "bg-slate-100 text-slate-600 border-slate-200",
};

const APP_STATUS_OPTIONS = [
  "SUBMITTED", "UNDER_REVIEW", "INVITED", "ASSESSED", "SHORTLISTED", "REJECTED", "WITHDRAWN",
];

const PROGRAM_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  OPEN: "bg-green-100 text-green-700",
  CLOSED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

export default function AmbassadorProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const programId = params.id;

  const [program, setProgram] = useState<AmbassadorProgram | null>(null);
  const [applications, setApplications] = useState<AmbassadorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [updatingApp, setUpdatingApp] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [progRes, appsRes] = await Promise.all([
        fetch(`/api/ambassador/programs/${programId}`),
        fetch(`/api/ambassador/programs/${programId}/applications`),
      ]);
      if (progRes.status === 404) {
        router.push("/dashboard/ambassador");
        return;
      }
      const progData = await progRes.json() as AmbassadorProgram;
      const appsData = await appsRes.json() as AmbassadorApplication[];
      setProgram(progData);
      setApplications(appsData);
    } finally {
      setLoading(false);
    }
  }, [programId, router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleStatusChange(appId: string, newStatus: string) {
    setUpdatingApp(appId);
    try {
      await fetch(`/api/ambassador/programs/${programId}/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
    } finally {
      setUpdatingApp(null);
    }
  }

  async function copyPublicLink() {
    const url = `${window.location.origin}/ambassador/${programId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(d?: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!program) return null;

  const publicUrl = `/ambassador/${programId}`;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/ambassador"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
          >
            <ArrowLeft className="h-3 w-3" />
            All programs
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500 shrink-0" />
            {program.title}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {program.cohort && (
              <Badge variant="secondary">{program.cohort}</Badge>
            )}
            <Badge
              variant="outline"
              className={PROGRAM_STATUS_COLORS[program.status] ?? ""}
            >
              {program.status}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={copyPublicLink}>
            {copied ? (
              <Check className="h-4 w-4 mr-1 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 mr-1" />
            )}
            {copied ? "Copied!" : "Copy public link"}
          </Button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              Preview form
            </Button>
          </a>
        </div>
      </div>

      {/* Program stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{applications.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total applications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {applications.filter(a => a.status === "SHORTLISTED").length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Shortlisted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-sm text-slate-600">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {formatDate(program.applicationDeadline)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Deadline</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" />
              {[program.location, program.country].filter(Boolean).join(", ") || "—"}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Location</div>
          </CardContent>
        </Card>
      </div>

      {/* Applicants table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Applicants ({applications.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {applications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No applications yet</p>
              <p className="text-xs mt-1">
                Share the public link to start receiving applications.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>CV</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      {[app.candidate?.firstName, app.candidate?.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {app.candidate?.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{app.university ?? "—"}</TableCell>
                    <TableCell className="text-sm">{app.yearOfStudy ?? "—"}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(app.appliedAt)}
                    </TableCell>
                    <TableCell>
                      {app.candidate?.rawCvUrl ? (
                        <a
                          href={app.candidate.rawCvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={app.status}
                        onValueChange={(v) => handleStatusChange(app.id, v)}
                        disabled={updatingApp === app.id}
                      >
                        <SelectTrigger className={`h-7 w-36 text-xs border ${STATUS_COLORS[app.status] ?? ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APP_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {s.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/candidates/${app.candidateId}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
