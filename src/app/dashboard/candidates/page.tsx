"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
} from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Button } from "@client/components/ui/button";
import { Badge } from "@client/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { Skeleton } from "@client/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@client/components/ui/dialog";
import { Separator } from "@client/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/components/ui/popover";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  UserCircle,
  Building2,
  ChevronDown,
  Star,
  MapPin,
  Check,
  SendHorizonal,
  UserCheck,
  X,
  Loader2,
  MoreHorizontal,
  Mic,
  FileText,
  StickyNote,
  Download,
  CheckSquare,
} from "lucide-react";
import { FIELDS_OF_WORK } from "@client/lib/constants";
import { useRole } from "@client/components/providers/role-provider";

// ── Types ────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  location: string | null;
  country: string | null;
  status: string;
  shortlisted: boolean;
  overallCvScore: number | null;
  experienceScore: number | null;
  educationScore: number | null;
  locationScore: number | null;
  languageScore: number | null;
  primaryBusinessArea: string | null;
  needsReview: boolean | null;
  sourceType: string;
  createdAt: string;
  activatedAt: string | null;
  invitationSent: boolean;
  languages: { language: string; selfDeclaredLevel: string | null }[];
  applications?: { id: string }[];
  assessments?: { id: string; status: string }[];
  interviews?: { id: string; finalDecision: string | null }[];
  _count?: { assessments: number; notes: number };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ── Status config ────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  NEW: "secondary",
  PARSED: "secondary",
  SCREENED: "outline",
  BORDERLINE: "secondary",
  ON_IMPROVEMENT_TRACK: "secondary",
  OFFER_SENT: "outline",
  REJECTED: "destructive",
  HIRED: "default",
};

/** Extra colour classes per status (layered on top of variant) */
const STATUS_CLASS: Record<string, string> = {
  REJECTED: "bg-red-100 text-red-700 border-red-300",
  HIRED: "bg-emerald-600 text-white border-emerald-700",
  OFFER_SENT: "bg-amber-50 text-amber-800 border-amber-300",
  BORDERLINE: "bg-orange-50 text-orange-700 border-orange-200",
  ON_IMPROVEMENT_TRACK: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  PARSED: "Parsed",
  SCREENED: "Screened",
  BORDERLINE: "Borderline",
  ON_IMPROVEMENT_TRACK: "On Track",
  OFFER_SENT: "Proposed",
  REJECTED: "Rejected",
  HIRED: "Hired",
};

// Status flow: which statuses an HR can manually assign
const ASSIGNABLE_STATUSES = [
  "SCREENED",
  "BORDERLINE",
  "ON_IMPROVEMENT_TRACK",
  "OFFER_SENT",
  "REJECTED",
  "HIRED",
] as const;

// ── Score helpers ────────────────────────────────────────────────

function scoreColour(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 45) return "bg-yellow-500";
  return "bg-red-500";
}

function ScoreBar({ score, label }: { score: number | null; label?: string }) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-[10px] text-muted-foreground w-6 text-right">
          {label}
        </span>
      )}
      <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${scoreColour(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums w-5 text-right">
        {score}
      </span>
    </div>
  );
}

function OverallScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const colour =
    score >= 70
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : score >= 45
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
        : "bg-red-500/15 text-red-700 dark:text-red-400";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${colour}`}
    >
      {score}
    </span>
  );
}

// ── Business area dropdown ───────────────────────────────────────

function BusinessAreaDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const allAreas = ["All Departments", ...FIELDS_OF_WORK, "Other"];
  const filtered = allAreas.filter((a) =>
    a.toLowerCase().includes(search.toLowerCase())
  );

  const displayLabel =
    value === "" ? "All Departments" : value === "Other" ? "Other" : value;
  const shortLabel =
    displayLabel.length > 22
      ? displayLabel.slice(0, 20) + "…"
      : displayLabel;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors min-w-[180px]"
        onClick={() => setOpen(!open)}
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate">{shortLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-72 rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <Input
              placeholder="Search departments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.map((area) => {
              const isActive =
                (area === "All Departments" && value === "") ||
                area === value;
              return (
                <button
                  key={area}
                  type="button"
                  className={`w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors ${
                    isActive ? "bg-accent font-medium" : ""
                  }`}
                  onClick={() => {
                    onChange(area === "All Departments" ? "" : area);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {area}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground text-center">
                No departments match
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function CandidatesPage() {
  const router = useRouter();
  const { userName, userEmail } = useRole();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [businessAreaFilter, setBusinessAreaFilter] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState("overallCvScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  // Hide status=NEW (unparsed) candidates by default — they have no CV data
  // and would appear as empty rows. HR can toggle them on.
  const [showUnparsed, setShowUnparsed] = useState(false);

  // ── Row action: Add note dialog ──────────────────────────────
  const [noteDialogFor, setNoteDialogFor] = useState<Candidate | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  // ── Bulk selection ───────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const fetchCandidates = useCallback(
    async (page = 1) => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        if (search) params.set("search", search);
        if (statusFilter && statusFilter !== "SHORTLISTED_FILTER") params.set("status", statusFilter);
        if (statusFilter === "SHORTLISTED_FILTER") params.set("shortlisted", "true");
        if (businessAreaFilter) params.set("businessArea", businessAreaFilter);
        if (locationSearch) params.set("locationSearch", locationSearch);
        // sourceFilter values: ALL | PLATFORM | NON_PLATFORM (UI labels:
        // "Self-applied" / "Added by HR"). The DB enum has 3 raw values
        // but we collapse EXTERNAL+INTERNAL into one HR-facing label.
        if (sourceFilter === "PLATFORM") params.set("sourceType", "PLATFORM");
        if (!showUnparsed) params.set("excludeUnparsed", "true");

        const res = await fetch(`/api/candidates?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        let rows = data.candidates as Candidate[];
        // "Added by HR" filter is client-side because the API only accepts
        // exact enum values; this is acceptable since pageSize=20.
        if (sourceFilter === "NON_PLATFORM") {
          rows = rows.filter((c) => c.sourceType !== "PLATFORM");
        }
        setCandidates(rows);
        setPagination(data.pagination);
      } catch {
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, businessAreaFilter, locationSearch, sourceFilter, sortBy, sortOrder, showUnparsed]
  );

  useEffect(() => {
    const debounce = setTimeout(() => fetchCandidates(1), 300);
    return () => clearTimeout(debounce);
  }, [fetchCandidates]);

  // ── Candidate actions ──────────────────────────────────────────

  async function changeStatus(e: React.MouseEvent, candidateId: string, newStatus: string) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
        );
      }
    } catch {
      /* silent */
    }
  }

  async function markInvitationSent(e: React.MouseEvent, candidateId: string) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationSent: true }),
      });
      if (res.ok) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId ? { ...c, invitationSent: true } : c
          )
        );
      }
    } catch {
      /* silent */
    }
  }

  async function toggleShortlisted(e: React.MouseEvent, candidateId: string, current: boolean) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: !current }),
      });
      if (res.ok) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId ? { ...c, shortlisted: !current } : c
          )
        );
      }
    } catch {
      /* silent */
    }
  }

  async function saveNote() {
    if (!noteDialogFor || !noteDraft.trim()) return;
    setNoteSaving(true);
    try {
      const author = userName || userEmail || "HR";
      const res = await fetch(`/api/candidates/${noteDialogFor.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, content: noteDraft.trim() }),
      });
      if (res.ok) {
        setNoteDialogFor(null);
        setNoteDraft("");
      }
    } catch {
      /* silent */
    } finally {
      setNoteSaving(false);
    }
  }

  // ── Scoring weights modal logic ────────────────────────────────
  // ── Sort helpers ───────────────────────────────────────────────

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  function SortableHeader({ field, children, className, title }: { field: string; children: React.ReactNode; className?: string; title?: string }) {
    const active = sortBy === field;
    return (
      <TableHead className={className} title={title}>
        <button
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => toggleSort(field)}
        >
          {children}
          <ArrowUpDown className={`h-3 w-3 ${active ? "text-foreground" : "text-muted-foreground/50"}`} />
        </button>
      </TableHead>
    );
  }

  const hasActiveFilters = Boolean(
    search || statusFilter || businessAreaFilter || locationSearch || (sourceFilter && sourceFilter !== "ALL")
  );

  const displayedCandidates = candidates;

  // ── Bulk-selection helpers ─────────────────────────────────
  const visibleIds = displayedCandidates.map((c) => c.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function exportSelectedCSV() {
    const chosen = candidates.filter((c) => selected.has(c.id));
    if (chosen.length === 0) return;
    const rows = chosen.map((c) => {
      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email ?? "",
        location: c.location ?? "",
        country: c.country ?? "",
        status: c.status,
        shortlisted: c.shortlisted ? "yes" : "",
        department: c.primaryBusinessArea ?? "",
        profileScore: c.overallCvScore ?? "",
        languages: c.languages
          .map((l) => `${l.language}${l.selfDeclaredLevel ? ` (${l.selfDeclaredLevel})` : ""}`)
          .join("; "),
        addedAt: c.createdAt,
      };
    });
    const headers = Object.keys(rows[0]);
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escape((r as Record<string, string | number>)[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `candidates-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function bulkAdvance(newStatus: string) {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/candidates/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      setCandidates((prev) =>
        prev.map((c) => (selected.has(c.id) ? { ...c, status: newStatus } : c))
      );
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Candidates
          </h1>
          <p className="text-muted-foreground">
            Talent pool — manage candidates independent of any specific job.
          </p>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <BusinessAreaDropdown
          value={businessAreaFilter}
          onChange={setBusinessAreaFilter}
        />

        <div className="relative max-w-[180px]">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="City or country…"
            className="pl-9 h-[38px] text-sm"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
          />
        </div>

        <Select
          value={sourceFilter || "ALL"}
          onValueChange={(v) => setSourceFilter(v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sources</SelectItem>
            <SelectItem value="PLATFORM">Self-applied</SelectItem>
            <SelectItem value="NON_PLATFORM">Added by HR</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="SHORTLISTED_FILTER">⭐ Shortlisted</SelectItem>
            {Object.entries(STATUS_LABEL).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 ml-auto">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none" title="Show sign-up accounts that have not uploaded a CV yet.">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-primary cursor-pointer"
              checked={showUnparsed}
              onChange={(e) => setShowUnparsed(e.target.checked)}
            />
            Show unparsed sign-ups
          </label>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setBusinessAreaFilter("");
                setLocationSearch("");
                setSourceFilter("ALL");
              }}
            >
              Clear filters
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {pagination.total} candidate{pagination.total !== 1 && "s"}
          </span>
        </div>
      </div>

      {/* Table */}
      <Card>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2 bg-primary/5 text-sm">
            <span className="font-medium">
              {selected.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={exportSelectedCSV}
              disabled={bulkBusy}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8" disabled={bulkBusy}>
                  {bulkBusy ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Advance to…
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {ASSIGNABLE_STATUSES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => bulkAdvance(s)}>
                    {STATUS_LABEL[s] ?? s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 ml-auto"
              onClick={clearSelection}
              disabled={bulkBusy}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>
        )}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all visible"
                    className="h-3.5 w-3.5 accent-primary cursor-pointer"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                  />
                </TableHead>
                <SortableHeader field="firstName">Name</SortableHeader>
                <TableHead className="text-center">Department</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <SortableHeader
                  field="overallCvScore"
                  className="text-center"
                  title="Profile score — CV-intrinsic, independent of any job. Measures experience relevance, years, education, location, and languages against the configured weights."
                >
                  Profile
                </SortableHeader>
                <TableHead className="text-center">Score Breakdown</TableHead>
                <TableHead className="text-center">Languages</TableHead>
                <TableHead className="text-center">Source</TableHead>
                <SortableHeader field="createdAt" className="text-center">Added</SortableHeader>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : candidates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <UserCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No candidates found. Upload CVs to populate the talent pool.
                  </TableCell>
                </TableRow>
              ) : (
                displayedCandidates.map((c) => {
                  // status=NEW candidates have no parsed CV yet — dim the row so
                  // HR doesn't mistake the "—" values for a broken page.
                  const isUnparsed = c.status === "NEW";
                  return (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isUnparsed ? "opacity-60" : ""}`}
                    onClick={() => router.push(`/dashboard/candidates/${c.id}`)}
                  >
                    {/* Selection checkbox */}
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.firstName} ${c.lastName}`}
                        className="h-3.5 w-3.5 accent-primary cursor-pointer"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                      />
                    </TableCell>
                    {/* Name */}
                    <TableCell>
                      <div className="flex items-start gap-1.5">
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 focus:outline-none"
                          title={c.shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                          onClick={(e) => toggleShortlisted(e, c.id, c.shortlisted)}
                        >
                          <Star
                            className={`h-4 w-4 transition-colors ${
                              c.shortlisted
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted-foreground/30 hover:text-yellow-400"
                            }`}
                          />
                        </button>
                        <div className="min-w-0">
                          <span className="font-medium truncate">
                            {c.firstName} {c.lastName}
                          </span>
                          {c.email && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {c.email}
                            </p>
                          )}
                          {(c.location || c.country) && (
                            <p className="text-[11px] text-muted-foreground">
                              {[c.location, c.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                          {/* Funnel chips — compact pipeline stage at a glance */}
                          {(() => {
                            const applied = c.applications?.length ?? 0;
                            const assessed = (c.assessments ?? []).filter((a) => a.status === "COMPLETED").length;
                            const interviewed = (c.interviews ?? []).filter((i) => i.finalDecision != null).length;
                            const decisionLabel =
                              c.status === "HIRED" ? "Hired"
                                : c.status === "OFFER_SENT" ? "Offer"
                                  : c.status === "SHORTLISTED" ? "Shortlisted"
                                    : c.status === "REJECTED" ? "Rejected"
                                      : c.status === "ON_IMPROVEMENT_TRACK" ? "Improving"
                                        : null;
                            const decisionClass =
                              c.status === "HIRED" || c.status === "OFFER_SENT"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : c.status === "SHORTLISTED"
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                                  : c.status === "REJECTED"
                                    ? "bg-red-500/15 text-red-700 dark:text-red-400"
                                    : c.status === "ON_IMPROVEMENT_TRACK"
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                      : "";
                            const chip = (count: number, label: string, tip: string) => (
                              <span
                                title={tip}
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  count > 0
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground/60"
                                }`}
                              >
                                <span className="tabular-nums">{count}</span>
                                <span>{label}</span>
                              </span>
                            );
                            return (
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {chip(applied, "Applied", `${applied} job application${applied === 1 ? "" : "s"}`)}
                                {chip(assessed, "Assessed", `${assessed} completed assessment${assessed === 1 ? "" : "s"}`)}
                                {chip(interviewed, "Interviewed", `${interviewed} completed interview${interviewed === 1 ? "" : "s"}`)}
                                {decisionLabel ? (
                                  <span
                                    title={`Current status: ${decisionLabel}`}
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${decisionClass}`}
                                  >
                                    {decisionLabel}
                                  </span>
                                ) : (
                                  <span
                                    title="No hiring decision yet"
                                    className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground/60"
                                  >
                                    No decision
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </TableCell>

                    {/* Department */}
                    <TableCell className="text-center">
                      {c.primaryBusinessArea ? (
                        <Badge
                          variant="outline"
                          className="text-xs font-normal whitespace-nowrap"
                        >
                          {c.primaryBusinessArea.length > 18
                            ? c.primaryBusinessArea.slice(0, 16) + "…"
                            : c.primaryBusinessArea}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Status — clickable dropdown to change */}
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="focus:outline-none">
                            <Badge
                              variant={STATUS_VARIANT[c.status] || "secondary"}
                              className={`cursor-pointer hover:opacity-80 transition-opacity ${STATUS_CLASS[c.status] || ""}`}
                            >
                              {STATUS_LABEL[c.status] || c.status}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                          {ASSIGNABLE_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              disabled={c.status === s}
                              onClick={(e) => changeStatus(e, c.id, s)}
                            >
                              <Badge
                                variant={STATUS_VARIANT[s]}
                                className={`text-xs mr-2 ${STATUS_CLASS[s] || ""}`}
                              >
                                {STATUS_LABEL[s]}
                              </Badge>
                              {c.status === s && <Check className="h-3 w-3 ml-auto" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                    {/* Profile score — CV-intrinsic, not job-specific */}
                    <TableCell className="text-center" title="Profile score — CV-intrinsic, independent of any job.">
                      <OverallScoreBadge score={c.overallCvScore} />
                    </TableCell>

                    {/* Score breakdown mini bars */}
                    <TableCell className="text-center">
                      <div className="space-y-0.5">
                        <ScoreBar score={c.experienceScore} label="Exp" />
                        <ScoreBar score={c.educationScore} label="Edu" />
                        <ScoreBar score={c.locationScore} label="Loc" />
                        <ScoreBar score={c.languageScore} label="Lng" />
                      </div>
                    </TableCell>

                    {/* Languages */}
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1">
                        {c.languages.map((l, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {l.language}
                            {l.selfDeclaredLevel && ` ${l.selfDeclaredLevel}`}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>

                    {/* Source / invitation */}
                    <TableCell className="text-center">
                      {c.sourceType === "PLATFORM" ? (
                        <Badge variant="default" className="text-xs gap-1">
                          <UserCheck className="h-3 w-3" />
                          Self-applied
                        </Badge>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            Added by HR
                          </Badge>
                          {c.invitationSent ? (
                            <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                              <SendHorizonal className="h-3 w-3" />
                              Invited
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                              onClick={(e) => markInvitationSent(e, c.id)}
                            >
                              <SendHorizonal className="h-3 w-3" />
                              Send Invite
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Added date */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap text-center">
                      {new Date(c.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </TableCell>

                    {/* Row quick-actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/candidates/${c.id}`)}>
                            <UserCircle className="h-4 w-4 mr-2" /> Open profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/ai-interview?candidateId=${c.id}`)}>
                            <Mic className="h-4 w-4 mr-2" /> Start interview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/assessments?candidateId=${c.id}`)}>
                            <FileText className="h-4 w-4 mr-2" /> Assign assessment
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setNoteDialogFor(c);
                              setNoteDraft("");
                            }}
                          >
                            <StickyNote className="h-4 w-4 mr-2" /> Add note
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchCandidates(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchCandidates(pagination.page + 1)}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Add Note Dialog (row quick-action) ─────────────────── */}
      <Dialog
        open={noteDialogFor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setNoteDialogFor(null);
            setNoteDraft("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Add note
            </DialogTitle>
            <DialogDescription>
              {noteDialogFor
                ? `Private HR note on ${noteDialogFor.firstName} ${noteDialogFor.lastName}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Write a short note…"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            maxLength={5000}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNoteDialogFor(null);
                setNoteDraft("");
              }}
              disabled={noteSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveNote} disabled={!noteDraft.trim() || noteSaving}>
              {noteSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
