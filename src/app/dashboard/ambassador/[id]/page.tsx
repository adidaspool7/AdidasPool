"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@client/components/ui/button";
import { Badge } from "@client/components/ui/badge";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@client/components/ui/dialog";
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
  Pencil,
  Trash2,
  Eye,
  Video,
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

interface AmbassadorProgramFull extends AmbassadorProgram {
  requirements?: string | null;
  perks?: string | null;
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
  pitchVideoUrl?: string | null;
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
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [viewApp, setViewApp] = useState<AmbassadorApplication | null>(null);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCohort, setEditCohort] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editRequirements, setEditRequirements] = useState("");
  const [editPerks, setEditPerks] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");
  const [editMaxApplicants, setEditMaxApplicants] = useState("");

  // Delete
  const [deleting, setDeleting] = useState(false);

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

  async function handleBulkStatusChange(newStatus: string) {
    if (selectedApps.size === 0 || !newStatus) return;
    setBulkUpdating(true);
    try {
      await Promise.all(
        [...selectedApps].map((appId) => handleStatusChange(appId, newStatus))
      );
      setSelectedApps(new Set());
    } finally {
      setBulkUpdating(false);
    }
  }

  function openEditDialog() {
    if (!program) return;
    setEditTitle(program.title);
    setEditDescription(program.description ?? "");
    setEditCohort(program.cohort ?? "");
    setEditDeadline(
      program.applicationDeadline
        ? new Date(program.applicationDeadline).toISOString().slice(0, 10)
        : ""
    );
    setEditLocation(program.location ?? "");
    setEditCountry(program.country ?? "");
    setEditRequirements((program as AmbassadorProgramFull).requirements ?? "");
    setEditPerks((program as AmbassadorProgramFull).perks ?? "");
    setEditStatus(program.status);
    setEditMaxApplicants(program.maxApplicants != null ? String(program.maxApplicants) : "");
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/ambassador/programs/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || null,
          cohort: editCohort || null,
          applicationDeadline: editDeadline || null,
          location: editLocation || null,
          country: editCountry || null,
          requirements: editRequirements || null,
          perks: editPerks || null,
          status: editStatus,
          maxApplicants: editMaxApplicants ? parseInt(editMaxApplicants) : null,
        }),
      });
      if (res.ok) {
        const updated = await res.json() as AmbassadorProgram;
        setProgram(updated);
        setEditOpen(false);
      }
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${program?.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/ambassador/programs/${programId}`, { method: "DELETE" });
      router.push("/dashboard/ambassador");
    } finally {
      setDeleting(false);
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
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Delete
          </Button>
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
            <>
              {/* Bulk action toolbar */}
              {selectedApps.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/60 border-b text-sm">
                  <span className="font-medium">{selectedApps.size} selected</span>
                  <Select
                    onValueChange={(v) => void handleBulkStatusChange(v)}
                    disabled={bulkUpdating}
                    value=""
                  >
                    <SelectTrigger className="h-7 w-40 text-xs">
                      <SelectValue placeholder="Set status…" />
                    </SelectTrigger>
                    <SelectContent>
                      {APP_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {bulkUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs ml-auto"
                    onClick={() => setSelectedApps(new Set())}
                    disabled={bulkUpdating}
                  >
                    Clear selection
                  </Button>
                </div>
              )}
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={selectedApps.size === applications.length && applications.length > 0}
                      onChange={(e) =>
                        setSelectedApps(
                          e.target.checked ? new Set(applications.map((a) => a.id)) : new Set()
                        )
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>CV</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id} className={selectedApps.has(app.id) ? "bg-muted/40" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={selectedApps.has(app.id)}
                        onChange={(e) =>
                          setSelectedApps((prev) => {
                            const next = new Set(prev);
                            e.target.checked ? next.add(app.id) : next.delete(app.id);
                            return next;
                          })
                        }
                        aria-label="Select row"
                      />
                    </TableCell>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs flex items-center gap-1"
                        onClick={() => setViewApp(app)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit program dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleEdit(e)} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-cohort">Cohort</Label>
                <Input
                  id="edit-cohort"
                  value={editCohort}
                  onChange={(e) => setEditCohort(e.target.value)}
                  placeholder="e.g. 2025/2026"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-deadline">Application deadline</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-requirements">Requirements</Label>
              <Textarea
                id="edit-requirements"
                value={editRequirements}
                onChange={(e) => setEditRequirements(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-perks">Perks</Label>
              <Textarea
                id="edit-perks"
                value={editPerks}
                onChange={(e) => setEditPerks(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["DRAFT", "OPEN", "CLOSED", "ARCHIVED"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-max">Max applicants</Label>
                <Input
                  id="edit-max"
                  type="number"
                  min="1"
                  value={editMaxApplicants}
                  onChange={(e) => setEditMaxApplicants(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View application dialog */}
      <Dialog open={viewApp !== null} onOpenChange={(o) => !o && setViewApp(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {[viewApp?.candidate?.firstName, viewApp?.candidate?.lastName]
                .filter(Boolean)
                .join(" ") || "Application"}
            </DialogTitle>
          </DialogHeader>
          {viewApp && (
            <div className="space-y-4 mt-2 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                {viewApp.candidate?.email && <span>{viewApp.candidate.email}</span>}
                {viewApp.university && <span>{viewApp.university}</span>}
                {viewApp.yearOfStudy && <span>Year {viewApp.yearOfStudy}</span>}
                <span>Applied {formatDate(viewApp.appliedAt)}</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Motivation
                </Label>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                  {viewApp.motivation?.trim() || "— Not provided"}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Previous experience
                </Label>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                  {viewApp.previousExperience?.trim() || "— Not provided"}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Pitch video
                </Label>
                {viewApp.pitchVideoUrl ? (
                  <video
                    src={viewApp.pitchVideoUrl}
                    controls
                    className="w-full rounded-md border bg-black"
                  />
                ) : (
                  <p className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <Video className="h-4 w-4" /> No pitch video submitted
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {viewApp.candidate?.rawCvUrl && (
                  <a
                    href={viewApp.candidate.rawCvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button type="button" variant="outline" className="flex items-center gap-1">
                      <ExternalLink className="h-4 w-4" /> Open CV
                    </Button>
                  </a>
                )}
                <Link href={`/dashboard/candidates/${viewApp.candidateId}`}>
                  <Button type="button">View full profile</Button>
                </Link>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
