"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@client/components/ui/dialog";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import {
  Briefcase,
  MapPin,
  Building2,
  ExternalLink,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Globe,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SendHorizonal,
  Check,
  Plus,
} from "lucide-react";
import { Input } from "@client/components/ui/input";
import { useRole } from "@client/components/providers/role-provider";
import { FIELDS_OF_WORK } from "@client/lib/constants";

// ============================================
// TYPES
// ============================================

interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  country: string | null;
  status: string;
  type: string;
  sourceUrl: string | null;
  externalId: string | null;
  createdAt: string;
  startDate?: string | null;
  endDate?: string | null;
  stipend?: string | null;
  mentorName?: string | null;
  mentorEmail?: string | null;
  isErasmus?: boolean;
  internshipStatus?: string | null;
  _count?: { matches: number; assessments: number };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  distinctCountries: number;
}

interface JobsResponse {
  data: Job[];
  pagination: Pagination;
}

interface SyncResult {
  success: boolean;
  scraped: number;
  internships?: number;
  created: number;
  updated: number;
  failed: number;
  durationMs: number;
  error?: string;
}

// ============================================
// STATUS BADGE
// ============================================

function JobStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    OPEN: { label: "Open", variant: "default" },
    DRAFT: { label: "Draft", variant: "outline" },
    CLOSED: { label: "Closed", variant: "secondary" },
    ARCHIVED: { label: "Archived", variant: "destructive" },
  };
  const c = config[status] || config.OPEN;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function JobTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    FULL_TIME: { label: "Full-time", className: "bg-blue-100 text-blue-800" },
    PART_TIME: { label: "Part-time", className: "bg-purple-100 text-purple-800" },
    INTERNSHIP: { label: "Internship", className: "bg-amber-100 text-amber-800" },
    CONTRACT: { label: "Contract", className: "bg-teal-100 text-teal-800" },
  };
  const c = config[type] || config.FULL_TIME;
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

// ============================================
// CREATE JOB DIALOG (HR only)
// ============================================

interface CreateJobForm {
  title: string;
  description: string;
  department: string;
  location: string;
  country: string;
  type: string;
  requiredLanguage: string;
  requiredLanguageLevel: string;
  requiredExperienceType: string;
  minYearsExperience: string;
  requiredEducationLevel: string;
  requiredSkills: string;
}

const EMPTY_FORM: CreateJobForm = {
  title: "",
  description: "",
  department: "",
  location: "",
  country: "",
  type: "FULL_TIME",
  requiredLanguage: "",
  requiredLanguageLevel: "",
  requiredExperienceType: "",
  minYearsExperience: "",
  requiredEducationLevel: "",
  requiredSkills: "",
};

function CreateJobDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateJobForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof CreateJobForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        title: form.title.trim(),
        type: form.type,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.department.trim()) body.department = form.department.trim();
      if (form.location.trim()) body.location = form.location.trim();
      if (form.country.trim()) body.country = form.country.trim();
      if (form.requiredLanguage.trim()) body.requiredLanguage = form.requiredLanguage.trim();
      if (form.requiredLanguageLevel) body.requiredLanguageLevel = form.requiredLanguageLevel;
      if (form.requiredExperienceType.trim()) body.requiredExperienceType = form.requiredExperienceType.trim();
      if (form.minYearsExperience.trim()) body.minYearsExperience = parseInt(form.minYearsExperience, 10);
      if (form.requiredEducationLevel) body.requiredEducationLevel = form.requiredEducationLevel;
      const skillsArr = form.requiredSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (skillsArr.length > 0) body.requiredSkills = skillsArr;

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${res.status})`);
      }

      setForm(EMPTY_FORM);
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(EMPTY_FORM); setError(null); } }}>
      <DialogTrigger asChild>
        <Button className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Create New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job Opening</DialogTitle>
          <DialogDescription>
            Fill in the details for the new position. Only the title is required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Row 1: Title + Type */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="job-title">Title *</Label>
              <Input
                id="job-title"
                placeholder="e.g. Senior Frontend Developer"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full-time</SelectItem>
                  <SelectItem value="PART_TIME">Part-time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="INTERNSHIP">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Department + Location + Country */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job-dept">Department</Label>
              <Input
                id="job-dept"
                placeholder="e.g. Digital"
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-loc">Location</Label>
              <Input
                id="job-loc"
                placeholder="e.g. Porto"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-country">Country</Label>
              <Input
                id="job-country"
                placeholder="e.g. Portugal"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Description */}
          <div className="space-y-2">
            <Label htmlFor="job-desc">Description</Label>
            <Textarea
              id="job-desc"
              placeholder="Describe the role, responsibilities, and any additional details..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
            />
          </div>

          <Separator />
          <p className="text-sm font-medium text-muted-foreground">Requirements (optional)</p>

          {/* Row 4: Language + Level + Experience Type */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job-lang">Required Language</Label>
              <Input
                id="job-lang"
                placeholder="e.g. German"
                value={form.requiredLanguage}
                onChange={(e) => set("requiredLanguage", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Language Level</Label>
              <Select value={form.requiredLanguageLevel} onValueChange={(v) => set("requiredLanguageLevel", v)}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-exp-type">Experience Type</Label>
              <Input
                id="job-exp-type"
                placeholder="e.g. Customer Service"
                value={form.requiredExperienceType}
                onChange={(e) => set("requiredExperienceType", e.target.value)}
              />
            </div>
          </div>

          {/* Row 5: Min Years + Education Level */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job-yrs">Min Years Experience</Label>
              <Input
                id="job-yrs"
                type="number"
                min={0}
                placeholder="e.g. 2"
                value={form.minYearsExperience}
                onChange={(e) => set("minYearsExperience", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Education Level</Label>
              <Select value={form.requiredEducationLevel} onValueChange={(v) => set("requiredEducationLevel", v)}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                  <SelectItem value="BACHELOR">Bachelor</SelectItem>
                  <SelectItem value="MASTER">Master</SelectItem>
                  <SelectItem value="PHD">PhD</SelectItem>
                  <SelectItem value="VOCATIONAL">Vocational</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 6: Required Skills (comma-separated) */}
          <div className="space-y-2">
            <Label htmlFor="job-skills">Required Skills</Label>
            <Input
              id="job-skills"
              placeholder="Comma-separated, e.g. React, TypeScript, SQL"
              value={form.requiredSkills}
              onChange={(e) => set("requiredSkills", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used by the matching engine to rank candidates. Separate multiple
              skills with commas.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Job"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// JOB CARD (with hover-to-apply overlay)
// ============================================

function JobCard({
  job,
  onApply,
  isApplied,
  isApplying,
  showApply,
}: {
  job: Job;
  onApply?: (jobId: string) => void;
  isApplied?: boolean;
  isApplying?: boolean;
  showApply?: boolean;
}) {
  return (
    <Card>
      {/* Applied badge */}
      {showApply && isApplied && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-green-600 text-white gap-1">
            <Check className="h-3 w-3" /> Applied
          </Badge>
        </div>
      )}
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
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Apply button — candidate role only */}
        {showApply && !isApplied && (
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={() => onApply?.(job.id)}
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <SendHorizonal className="h-4 w-4" />
                Apply to Job
              </>
            )}
          </Button>
        )}
        <div className="flex items-center justify-between">
          {job.sourceUrl ? (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View on adidas Careers <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span />
          )}
          {!isApplied && <JobStatusBadge status={job.status} />}
          {job.type && job.type !== "FULL_TIME" && <JobTypeBadge type={job.type} />}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// PAGINATION CONTROLS
// ============================================

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages, total, pageSize } = pagination;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total} jobs
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm px-3 tabular-nums">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// SYNC RESULT BANNER
// ============================================

function SyncResultBanner({
  result,
  onDismiss,
}: {
  result: SyncResult;
  onDismiss: () => void;
}) {
  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Sync failed</p>
        <p className="mt-1">{result.error || "An unknown error occurred."}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="mt-2 text-red-700"
        >
          Dismiss
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        <span className="font-medium">Sync complete</span>
      </div>
      <p className="mt-1">
        {result.scraped} jobs scanned
        {typeof result.internships === "number" &&
          ` (incl. ${result.internships} internship${result.internships === 1 ? "" : "s"})`}
        {" · "}
        {result.created} new &middot; {result.updated} updated
        {result.failed > 0 && ` · ${result.failed} failed`}
        {" · "}
        {(result.durationMs / 1000).toFixed(1)}s
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="mt-2 text-green-700"
      >
        Dismiss
      </Button>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

const PAGE_SIZE = 100;

export default function JobsPage() {
  const { role } = useRole();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    distinctCountries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Application state
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  const fetchJobs = useCallback(
    async (page: number = 1, search?: string, department?: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (search) params.set("search", search);
        if (department) params.set("department", department);
        // Job Openings page never shows internships — internships live on
        // /dashboard/internships regardless of role (HR or candidate).
        params.set("excludeType", "INTERNSHIP");

        const res = await fetch(`/api/jobs?${params}`);
        if (res.ok) {
          const data: JobsResponse = await res.json();
          setJobs(data.data);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      } finally {
        setLoading(false);
      }
    },
    [role]
  );

  // Fetch demo candidate + their existing applications on mount
  useEffect(() => {
    fetchJobs(1);

    if (role === "candidate") {
      // Get or create the current candidate
      fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((candidate) => {
          if (candidate?.id) {
            const cId = candidate.id;
            setCandidateId(cId);
            // Load existing applications
            return fetch(`/api/applications?candidateId=${cId}`);
          }
          return null;
        })
        .then((r) => (r?.ok ? r.json() : null))
        .then((apps) => {
          if (Array.isArray(apps)) {
            setAppliedJobIds(
              new Set(
                apps
                  .filter((a: any) => a.status !== "WITHDRAWN")
                  .map((a: any) => a.jobId)
              )
            );
          }
        })
        .catch(() => {});
    }
  }, [fetchJobs, role]);

  const handleApply = async (jobId: string) => {
    if (!candidateId || applyingJobId) return;
    setApplyingJobId(jobId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, candidateId }),
      });
      if (res.ok) {
        setAppliedJobIds((prev) => new Set(prev).add(jobId));
      }
    } catch (err) {
      console.error("Failed to apply:", err);
    } finally {
      setApplyingJobId(null);
    }
  };

  const stopSyncPolling = useCallback(() => {
    if (syncPollRef.current) {
      clearInterval(syncPollRef.current);
      syncPollRef.current = null;
    }
  }, []);

  const handleSyncCompleted = useCallback(
    async (result: SyncResult) => {
      setSyncing(false);
      setSyncResult(result);
      if (result.success) {
        setSearchQuery("");
        setSearchInput("");
        setDepartmentFilter("");
        await fetchJobs(1);
      }
    },
    [fetchJobs]
  );

  const handleSyncFailed = useCallback(
    (result: { error?: string } | null) => {
      setSyncing(false);
      setSyncResult({
        success: false,
        scraped: 0,
        created: 0,
        updated: 0,
        failed: 0,
        durationMs: 0,
        error: result?.error || "Sync failed",
      });
    },
    []
  );

  const pollSyncStatus = useCallback(
    (syncId: string) => {
      stopSyncPolling();
      syncPollRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/jobs/sync");
          if (!res.ok) return;
          const data = await res.json();
          if (data.syncId !== syncId) return;

          if (data.status === "completed") {
            stopSyncPolling();
            localStorage.removeItem("activeSyncId");
            await handleSyncCompleted(data.result as SyncResult);
          } else if (data.status === "failed") {
            stopSyncPolling();
            localStorage.removeItem("activeSyncId");
            handleSyncFailed(data.result as { error?: string } | null);
          }
        } catch {
          // Network error during poll — keep trying
        }
      }, 3000);
    },
    [stopSyncPolling, handleSyncCompleted, handleSyncFailed]
  );

  // Cleanup polling on unmount
  useEffect(() => stopSyncPolling, [stopSyncPolling]);

  // On mount, check if a sync is running or just finished while we were away
  const mountCheckedRef = useRef(false);
  useEffect(() => {
    if (mountCheckedRef.current) return;
    mountCheckedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/jobs/sync");
        if (!res.ok) return;
        const data = await res.json();
        const storedSyncId = localStorage.getItem("activeSyncId");

        if (data.status === "running") {
          setSyncing(true);
          localStorage.setItem("activeSyncId", data.syncId);
          pollSyncStatus(data.syncId);
        } else if (
          storedSyncId &&
          storedSyncId === data.syncId &&
          data.status === "completed"
        ) {
          // Sync finished while we were on another page — show the result
          localStorage.removeItem("activeSyncId");
          setSyncing(false);
          setSyncResult(data.result as SyncResult);
          if ((data.result as SyncResult)?.success) {
            fetchJobs(1);
          }
        } else if (
          storedSyncId &&
          storedSyncId === data.syncId &&
          data.status === "failed"
        ) {
          localStorage.removeItem("activeSyncId");
          setSyncing(false);
          setSyncResult({
            success: false,
            scraped: 0,
            created: 0,
            updated: 0,
            failed: 0,
            durationMs: 0,
            error: (data.result as { error?: string })?.error || "Sync failed",
          });
        }
      } catch {
        // Ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/jobs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPages: 0 }),
      });
      const data = await res.json();
      if (data.status === "started" || data.status === "already_running") {
        localStorage.setItem("activeSyncId", data.syncId);
        pollSyncStatus(data.syncId);
      } else {
        // Unexpected response
        setSyncing(false);
      }
    } catch (err) {
      setSyncing(false);
      setSyncResult({
        success: false,
        scraped: 0,
        created: 0,
        updated: 0,
        failed: 0,
        durationMs: 0,
        error: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    fetchJobs(1, searchInput || undefined, departmentFilter || undefined);
  };

  const handlePageChange = (page: number) => {
    fetchJobs(page, searchQuery || undefined, departmentFilter || undefined);
    // Scroll to top of job list
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Openings</h1>
          <p className="text-muted-foreground">
            {role === "candidate"
              ? "Browse current job openings at adidas and find your match."
              : "Manage job openings. Sync from the adidas careers portal or create custom postings."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {role === "hr" && (
            <CreateJobDialog onCreated={() => { setSearchQuery(""); setSearchInput(""); setDepartmentFilter(""); fetchJobs(1); }} />
          )}
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="gap-2"
            variant={role === "hr" ? "outline" : "default"}
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Get current job offers
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <SyncResultBanner
          result={syncResult}
          onDismiss={() => setSyncResult(null)}
        />
      )}

      {/* Quick stats */}
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{pagination.total}</p>
                <p className="text-xs text-muted-foreground">
                  Total Position{pagination.total !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{pagination.distinctCountries}</p>
                <p className="text-xs text-muted-foreground">Countries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, department, location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={departmentFilter}
          onValueChange={(value) => {
            const dept = value === "all" ? "" : value;
            setDepartmentFilter(dept);
            fetchJobs(1, searchQuery || undefined, dept || undefined);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <Building2 className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {FIELDS_OF_WORK.map((field) => (
              <SelectItem key={field} value={field}>{field}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {/* Job list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {pagination.total === 0 && !searchQuery
                ? 'No job openings yet. Click "Get current job offers" to sync from the adidas careers portal.'
                : "No jobs match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                showApply={role === "candidate" && !!candidateId}
                isApplied={appliedJobIds.has(job.id)}
                isApplying={applyingJobId === job.id}
                onApply={handleApply}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <PaginationControls
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
