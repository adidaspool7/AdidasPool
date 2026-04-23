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
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  UserCircle,
  Building2,
  ChevronDown,
  SlidersHorizontal,
  Star,
  Briefcase,
  Clock,
  GraduationCap,
  MapPin,
  Languages,
  Zap,
  Check,
  Save,
  Trash2,
  SendHorizonal,
  UserCheck,
  Target,
  X,
  Loader2,
} from "lucide-react";
import { FIELDS_OF_WORK } from "@client/lib/constants";

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
  _count?: { assessments: number; notes: number };
  rerankedScore?: number | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface SavedPreset {
  id: string;
  name: string;
  experience: number;
  yearsOfExperience: number;
  educationLevel: number;
  locationMatch: number;
  language: number;
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

// ── Scoring weight presets & config ──────────────────────────────

const WEIGHT_CONFIG = [
  { key: "experience" as const, label: "Experience Relevance", icon: Briefcase, colour: "bg-blue-500" },
  { key: "yearsOfExperience" as const, label: "Years of Experience", icon: Clock, colour: "bg-indigo-500" },
  { key: "educationLevel" as const, label: "Education Level", icon: GraduationCap, colour: "bg-purple-500" },
  { key: "locationMatch" as const, label: "Location Match", icon: MapPin, colour: "bg-emerald-500" },
  { key: "language" as const, label: "Language Proficiency", icon: Languages, colour: "bg-amber-500" },
];

type WeightKey = (typeof WEIGHT_CONFIG)[number]["key"];

const BUILT_IN_PRESETS: { name: string; weights: Record<WeightKey, number>; description: string }[] = [
  { name: "Default", weights: { experience: 0.25, yearsOfExperience: 0.10, educationLevel: 0.15, locationMatch: 0.15, language: 0.35 }, description: "Language-focused — ideal for customer-facing roles" },
  { name: "Balanced", weights: { experience: 0.20, yearsOfExperience: 0.20, educationLevel: 0.20, locationMatch: 0.20, language: 0.20 }, description: "Equal emphasis on all scoring components" },
  { name: "Experience-First", weights: { experience: 0.35, yearsOfExperience: 0.25, educationLevel: 0.10, locationMatch: 0.10, language: 0.20 }, description: "Prioritises work experience and seniority" },
  { name: "Language-Heavy", weights: { experience: 0.15, yearsOfExperience: 0.05, educationLevel: 0.10, locationMatch: 0.10, language: 0.60 }, description: "Maximum language emphasis" },
  { name: "Local Talent", weights: { experience: 0.20, yearsOfExperience: 0.10, educationLevel: 0.15, locationMatch: 0.35, language: 0.20 }, description: "Location proximity is most important" },
];

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

// ── Job picker (searchable) ──────────────────────────────────────

function JobPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ id: string; title: string; department: string | null; country: string | null }>;
  onChange: (id: string) => void;
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

  const q = search.trim().toLowerCase();
  const filtered = q
    ? options.filter((j) => {
        const hay = `${j.title} ${j.department ?? ""} ${j.country ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
    : options;

  const selected = options.find((j) => j.id === value) ?? null;
  const selectedMeta = selected
    ? [selected.department, selected.country].filter(Boolean).join(" · ")
    : "";
  const displayLabel = selected
    ? `${selected.title}${selectedMeta ? ` · ${selectedMeta}` : ""}`
    : "Select a job…";
  const shortLabel =
    displayLabel.length > 40 ? displayLabel.slice(0, 38) + "…" : displayLabel;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors w-[340px] h-8"
        onClick={() => setOpen(!open)}
      >
        <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className={`truncate ${selected ? "" : "text-muted-foreground"}`}>{shortLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-[420px] rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <Input
              placeholder="Search by title, department or country…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            <button
              type="button"
              className={`w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors ${
                value === "" ? "bg-accent font-medium" : "text-muted-foreground"
              }`}
              onClick={() => {
                onChange("");
                setOpen(false);
                setSearch("");
              }}
            >
              — No job (Quality only) —
            </button>
            {filtered.map((j) => {
              const isActive = j.id === value;
              return (
                <button
                  key={j.id}
                  type="button"
                  className={`w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors ${
                    isActive ? "bg-accent font-medium" : ""
                  }`}
                  onClick={() => {
                    onChange(j.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="truncate">{j.title}</div>
                  {(j.department || j.country) && (
                    <div className="text-[11px] text-muted-foreground truncate">
                      {[j.department, j.country].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground text-center">
                No jobs match
              </p>
            )}
          </div>
          <div className="px-2 py-1.5 border-t text-[11px] text-muted-foreground">
            {filtered.length} of {options.length} jobs
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function CandidatesPage() {
  const router = useRouter();
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
  const [sortBy, setSortBy] = useState("overallCvScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Custom ranking state
  const [useCustomRanking, setUseCustomRanking] = useState(false);

  // ── Fit-for-job overlay (Phase 5) ────────────────────────────
  // Optional: HR picks a job to overlay job-specific Fit scores onto the
  // current candidate list. Quality stays as-is; Fit is a second column.
  const [jobOptions, setJobOptions] = useState<
    Array<{ id: string; title: string; department: string | null; country: string | null }>
  >([]);
  const [fitJobId, setFitJobId] = useState<string>("");
  const [fitJobTitle, setFitJobTitle] = useState<string | null>(null);
  const [fitMap, setFitMap] = useState<
    Map<string, { score: number; eligible: boolean }>
  >(new Map());
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);
  const [weightsModalOpen, setWeightsModalOpen] = useState(false);
  const [draft, setDraft] = useState<Record<WeightKey, number>>({
    experience: 0.25,
    yearsOfExperience: 0.10,
    educationLevel: 0.15,
    locationMatch: 0.15,
    language: 0.35,
  });
  const [savedWeights, setSavedWeights] = useState<Record<WeightKey, number> | null>(null);
  const [weightPreset, setWeightPreset] = useState<string | null>(null);
  const [savingWeights, setSavingWeights] = useState(false);

  // Custom presets (user-saved)
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // Load saved weights + custom presets on mount
  useEffect(() => {
    fetch("/api/scoring/weights")
      .then((r) => r.json())
      .then((data) => {
        const w: Record<WeightKey, number> = {
          experience: data.experience,
          yearsOfExperience: data.yearsOfExperience,
          educationLevel: data.educationLevel,
          locationMatch: data.locationMatch,
          language: data.language,
        };
        setSavedWeights(w);
        setDraft(w);
        setWeightPreset(data.presetName ?? null);
      })
      .catch(() => {});

    fetch("/api/scoring/presets")
      .then((r) => r.json())
      .then((data) => setCustomPresets(data))
      .catch(() => {});

    // Load ALL jobs for the Fit-for-job picker (lightweight endpoint)
    fetch("/api/jobs/picker")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.jobs)) {
          setJobOptions(
            data.jobs.map((j: { id: string; title: string; department: string | null; country: string | null }) => ({
              id: j.id,
              title: j.title,
              department: j.department,
              country: j.country,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // When the picked job changes, fetch its match scores once and overlay
  // them onto the visible rows. Empty selection clears the overlay.
  useEffect(() => {
    if (!fitJobId) {
      setFitMap(new Map());
      setFitJobTitle(null);
      setFitError(null);
      return;
    }
    let cancelled = false;
    setFitLoading(true);
    setFitError(null);
    fetch(`/api/jobs/${fitJobId}/match-candidates`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || `Server error (${r.status})`);
        }
        return r.json();
      })
      .then((data: { job: { title: string }; matches: Array<{ candidate: { id: string }; fit: { overallScore: number; isEligible: boolean } }> }) => {
        if (cancelled) return;
        const map = new Map<string, { score: number; eligible: boolean }>();
        for (const m of data.matches) {
          map.set(m.candidate.id, {
            score: Math.round(m.fit.overallScore),
            eligible: m.fit.isEligible,
          });
        }
        setFitMap(map);
        setFitJobTitle(data.job.title);
      })
      .catch((e) => {
        if (cancelled) return;
        setFitError(e instanceof Error ? e.message : "Failed to compute fit.");
        setFitMap(new Map());
      })
      .finally(() => {
        if (!cancelled) setFitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fitJobId]);

  const fetchCandidates = useCallback(
    async (page = 1) => {
      setLoading(true);

      try {
        if (useCustomRanking) {
          const res = await fetch("/api/candidates/rerank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page,
              pageSize: 20,
              search: search || undefined,
              status: statusFilter && statusFilter !== "SHORTLISTED_FILTER" ? statusFilter : undefined,
              shortlisted: statusFilter === "SHORTLISTED_FILTER" ? true : undefined,
              businessArea: businessAreaFilter || undefined,
            }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          setCandidates(data.candidates);
          setPagination(data.pagination);
        } else {
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

          const res = await fetch(`/api/candidates?${params}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          setCandidates(data.candidates);
          setPagination(data.pagination);
        }
      } catch {
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, businessAreaFilter, locationSearch, sortBy, sortOrder, useCustomRanking]
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

  // ── Scoring weights modal logic ────────────────────────────────

  const totalPct = Math.round(
    (draft.experience + draft.yearsOfExperience + draft.educationLevel + draft.locationMatch + draft.language) * 100
  );
  const isWeightsValid = Math.abs(totalPct - 100) <= 1;

  function handleSliderChange(key: WeightKey, value: number) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function applyPresetWeights(weights: Record<WeightKey, number>) {
    setDraft({ ...weights });
  }

  async function saveCustomPreset() {
    if (!newPresetName.trim() || !isWeightsValid) return;
    try {
      const res = await fetch("/api/scoring/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPresetName.trim(), ...draft }),
      });
      if (res.ok) {
        const preset = await res.json();
        setCustomPresets((prev) => [preset, ...prev]);
        setNewPresetName("");
        setShowSavePreset(false);
      }
    } catch {
      /* silent */
    }
  }

  async function deleteCustomPreset(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/scoring/presets/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCustomPresets((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      /* silent */
    }
  }

  async function applyWeights() {
    setSavingWeights(true);
    try {
      // Check if matches built-in or custom preset
      const matchingBuiltIn = BUILT_IN_PRESETS.find((p) =>
        WEIGHT_CONFIG.every((c) => Math.abs(p.weights[c.key] - draft[c.key]) < 0.001)
      );
      const matchingCustom = customPresets.find((p) =>
        WEIGHT_CONFIG.every((c) => Math.abs(p[c.key] - draft[c.key]) < 0.001)
      );
      const presetLabel = matchingBuiltIn?.name ?? matchingCustom?.name ?? "Custom";

      const res = await fetch("/api/scoring/weights", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          presetName: presetLabel,
          updatedBy: "HR",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSavedWeights({ ...draft });
        setWeightPreset(data.presetName ?? "Custom");
        setUseCustomRanking(true);
        setWeightsModalOpen(false);
      }
    } catch {
      /* silent */
    } finally {
      setSavingWeights(false);
    }
  }

  function openWeightsModal() {
    if (savedWeights) setDraft({ ...savedWeights });
    setShowSavePreset(false);
    setNewPresetName("");
    setWeightsModalOpen(true);
  }

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

  const hasActiveFilters = search || statusFilter || businessAreaFilter || locationSearch;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Candidates&apos; Analysis
          </h1>
          <p className="text-muted-foreground">
            Browse, filter by department, and rank your talent pool by CV scores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {useCustomRanking && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUseCustomRanking(false)}
            >
              Reset to Default
            </Button>
          )}
          <button
            type="button"
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              useCustomRanking
                ? "border-primary bg-primary/5 text-primary"
                : "hover:bg-accent"
            }`}
            onClick={openWeightsModal}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Custom Ranking</span>
            {useCustomRanking && weightPreset && (
              <Badge variant="outline" className="text-[10px]">
                {weightPreset}
              </Badge>
            )}
          </button>
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
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setBusinessAreaFilter("");
                setLocationSearch("");
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

      {/* Fit-for-job overlay row */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
        <Target className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Rank by fit for a job:</span>
        <JobPicker
          value={fitJobId}
          options={jobOptions}
          onChange={setFitJobId}
        />
        {fitLoading && (
          <span className="inline-flex items-center text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Computing fit…
          </span>
        )}
        {fitJobId && !fitLoading && fitJobTitle && (
          <Badge variant="outline" className="text-xs">
            Showing fit for: {fitJobTitle}
          </Badge>
        )}
        {fitJobId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setFitJobId("")}
            title="Clear job"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {fitError && (
          <span className="text-xs text-destructive">{fitError}</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          Quality is profile-only. Fit = match against this job&apos;s parsed requirements.
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="firstName">Name</SortableHeader>
                <TableHead className="text-center">Department</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <SortableHeader
                  field="overallCvScore"
                  className="text-center"
                  title="CV quality score — independent of any job. Measures experience relevance, years, education, location, and languages against the configured weights."
                >
                  Quality
                </SortableHeader>
                <TableHead
                  className="text-center"
                  title={
                    fitJobTitle
                      ? `Fit against "${fitJobTitle}" — computed from the job's parsed requirements (fields of work, seniority, skills, languages, education).`
                      : "Pick a job above to compute Fit scores."
                  }
                >
                  {fitJobTitle ? (
                    <span>
                      Fit (for {fitJobTitle.length > 18 ? fitJobTitle.slice(0, 16) + "…" : fitJobTitle})
                    </span>
                  ) : (
                    <span>Fit (for …)</span>
                  )}
                </TableHead>
                <TableHead className="text-center">Score Breakdown</TableHead>
                <TableHead className="text-center">Languages</TableHead>
                <TableHead className="text-center">Source</TableHead>
                <SortableHeader field="createdAt" className="text-center">Added</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : candidates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <UserCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No candidates found. Upload CVs to populate the talent pool.
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/candidates/${c.id}`)}
                  >
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

                    {/* Quality score — CV-intrinsic, not job-specific */}
                    <TableCell className="text-center" title="CV quality score — independent of any job.">
                      <OverallScoreBadge
                        score={
                          useCustomRanking && c.rerankedScore != null
                            ? c.rerankedScore
                            : c.overallCvScore
                        }
                      />
                      {useCustomRanking &&
                        c.rerankedScore != null &&
                        c.overallCvScore != null &&
                        c.rerankedScore !== c.overallCvScore && (
                          <span
                            className={`text-[10px] ml-1 ${
                              c.rerankedScore > c.overallCvScore
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {c.rerankedScore > c.overallCvScore ? "+" : ""}
                            {c.rerankedScore - c.overallCvScore}
                          </span>
                        )}
                    </TableCell>

                    {/* Fit (for selected job) — blank until HR picks one */}
                    <TableCell className="text-center">
                      {(() => {
                        if (!fitJobId) {
                          return <span className="text-xs text-muted-foreground">—</span>;
                        }
                        if (fitLoading) {
                          return <Skeleton className="h-4 w-10 mx-auto" />;
                        }
                        const f = fitMap.get(c.id);
                        if (!f) {
                          return <span className="text-xs text-muted-foreground">—</span>;
                        }
                        const colour =
                          f.score >= 70
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : f.score >= 45
                              ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                              : "bg-red-500/15 text-red-700 dark:text-red-400";
                        return (
                          <div className="inline-flex items-center gap-1">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${colour}`}
                            >
                              {f.score}
                            </span>
                            {!f.eligible && (
                              <Badge
                                variant="outline"
                                className="text-[9px] text-rose-700 border-rose-300 px-1 py-0 h-4"
                                title="Candidate fails one or more hard requirements (e.g. minimum years, required language)."
                              >
                                Blocked
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
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
                          Active
                        </Badge>
                      ) : c.invitationSent ? (
                        <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
                          <SendHorizonal className="h-3 w-3" />
                          Invited
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={(e) => markInvitationSent(e, c.id)}
                        >
                          <SendHorizonal className="h-3 w-3" />
                          Send Invite
                        </Button>
                      )}
                    </TableCell>

                    {/* Added date */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap text-center">
                      {new Date(c.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </TableCell>
                  </TableRow>
                ))
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

      {/* ── Custom Ranking Weights Modal ──────────────────────── */}
      <Dialog open={weightsModalOpen} onOpenChange={setWeightsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Custom Ranking Weights
            </DialogTitle>
            <DialogDescription>
              Adjust weight sliders, pick a preset, then hit Apply to re-rank
              candidates.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Weight sliders */}
            <div className="space-y-5 py-2">
              {WEIGHT_CONFIG.map((config) => {
                const Icon = config.icon;
                const pct = Math.round(draft[config.key] * 100);
                return (
                  <div key={config.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`rounded-md p-1.5 ${config.colour} text-white`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-medium">{config.label}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={pct}
                      onChange={(e) =>
                        handleSliderChange(config.key, Number(e.target.value) / 100)
                      }
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                    />
                  </div>
                );
              })}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <Badge
                  variant={isWeightsValid ? "default" : "destructive"}
                  className="tabular-nums"
                >
                  {totalPct}%
                </Badge>
              </div>

              {!isWeightsValid && (
                <p className="text-sm text-destructive">
                  Weights must sum to 100%. Currently <strong>{totalPct}%</strong>.
                </p>
              )}
            </div>

            <Separator />

            {/* Quick presets (built-in) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Quick Presets</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {BUILT_IN_PRESETS.map((preset) => {
                  const isActive = WEIGHT_CONFIG.every(
                    (c) => Math.abs(preset.weights[c.key] - draft[c.key]) < 0.001
                  );
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      className={`rounded-lg border p-2.5 text-left transition-colors hover:bg-accent ${
                        isActive ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => applyPresetWeights(preset.weights)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{preset.name}</span>
                        {isActive && (
                          <Badge variant="outline" className="text-[10px]">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom presets (user-saved) */}
            {customPresets.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Save className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Your Saved Presets</span>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {customPresets.map((preset) => {
                      const w: Record<WeightKey, number> = {
                        experience: preset.experience,
                        yearsOfExperience: preset.yearsOfExperience,
                        educationLevel: preset.educationLevel,
                        locationMatch: preset.locationMatch,
                        language: preset.language,
                      };
                      const isActive = WEIGHT_CONFIG.every(
                        (c) => Math.abs(w[c.key] - draft[c.key]) < 0.001
                      );
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={`rounded-lg border p-2.5 text-left transition-colors hover:bg-accent group relative ${
                            isActive ? "border-primary bg-primary/5" : ""
                          }`}
                          onClick={() => applyPresetWeights(w)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{preset.name}</span>
                            {isActive && (
                              <Badge variant="outline" className="text-[10px]">
                                Active
                              </Badge>
                            )}
                            <button
                              type="button"
                              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              title="Delete preset"
                              onClick={(e) => deleteCustomPreset(e, preset.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                            Exp {Math.round(w.experience * 100)}% · Yrs {Math.round(w.yearsOfExperience * 100)}% · Edu {Math.round(w.educationLevel * 100)}% · Loc {Math.round(w.locationMatch * 100)}% · Lng {Math.round(w.language * 100)}%
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Save as preset */}
            <Separator />
            <div>
              {!showSavePreset ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!isWeightsValid}
                  onClick={() => setShowSavePreset(true)}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Current Weights as Preset
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Preset name…"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="h-8 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveCustomPreset();
                      if (e.key === "Escape") setShowSavePreset(false);
                    }}
                  />
                  <Button size="sm" className="h-8" disabled={!newPresetName.trim()} onClick={saveCustomPreset}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowSavePreset(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t">
            <Button variant="outline" onClick={() => setWeightsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!isWeightsValid || savingWeights}
              onClick={applyWeights}
            >
              {savingWeights ? (
                "Applying…"
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" /> Apply &amp; Re-Rank
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
