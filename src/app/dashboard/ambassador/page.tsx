"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
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
  CalendarDays,
  MapPin,
  Users,
  Trophy,
  Plus,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface AmbassadorProgram {
  id: string;
  title: string;
  description?: string | null;
  cohort?: string | null;
  applicationDeadline?: string | null;
  location?: string | null;
  country?: string | null;
  requirements?: string | null;
  perks?: string | null;
  status: string;
  maxApplicants?: number | null;
  applicationCount?: number;
  createdAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  OPEN: "bg-green-100 text-green-700 border-green-200",
  CLOSED: "bg-red-100 text-red-700 border-red-200",
  ARCHIVED: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function AmbassadorProgramsPage() {
  const [programs, setPrograms] = useState<AmbassadorProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // New program form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cohort, setCohort] = useState("");
  const [deadline, setDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  const [requirements, setRequirements] = useState("");
  const [perks, setPerks] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [maxApplicants, setMaxApplicants] = useState("");

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ambassador/programs");
      const data = await res.json() as AmbassadorProgram[];
      setPrograms(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPrograms();
  }, [fetchPrograms]);

  function resetForm() {
    setTitle(""); setDescription(""); setCohort(""); setDeadline("");
    setLocation(""); setCountry(""); setRequirements(""); setPerks("");
    setStatus("DRAFT"); setMaxApplicants("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/ambassador/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description: description || null, cohort: cohort || null,
          applicationDeadline: deadline || null, location: location || null,
          country: country || null, requirements: requirements || null,
          perks: perks || null, status,
          maxApplicants: maxApplicants ? parseInt(maxApplicants) : null,
        }),
      });
      setDialogOpen(false);
      resetForm();
      await fetchPrograms();
    } finally {
      setSaving(false);
    }
  }

  function formatDate(d?: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Ambassador Programs
          </h1>
          <p className="text-slate-500 mt-1">
            Manage campus ambassador programs and review applications.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Program
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No ambassador programs yet</p>
          <p className="text-sm mt-1">Create your first program to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{p.title}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${STATUS_COLORS[p.status] ?? ""}`}
                  >
                    {p.status}
                  </Badge>
                </div>
                {p.cohort && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    {p.cohort}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {p.description && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {p.description}
                  </CardDescription>
                )}
                <div className="space-y-1 text-xs text-slate-500">
                  {(p.location || p.country) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {[p.location, p.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {p.applicationDeadline && (
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 shrink-0" />
                      Deadline: {formatDate(p.applicationDeadline)}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-slate-700 font-medium">
                    <Users className="h-3 w-3 shrink-0" />
                    {p.applicationCount ?? 0} applicant{(p.applicationCount ?? 0) !== 1 ? "s" : ""}
                  </div>
                </div>
                <Link href={`/dashboard/ambassador/${p.id}`}>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
                    View applicants
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Program Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Ambassador Program</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="p-title">Program title <span className="text-red-500">*</span></Label>
              <Input id="p-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Campus Ambassador — Spring 2026" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What is this program about?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-cohort">Cohort</Label>
                <Input id="p-cohort" value={cohort} onChange={e => setCohort(e.target.value)} placeholder="e.g. Spring 2026" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-deadline">Application deadline</Label>
                <Input id="p-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-location">City</Label>
                <Input id="p-location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Amsterdam" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-country">Country</Label>
                <Input id="p-country" value={country} onChange={e => setCountry(e.target.value)} placeholder="Netherlands" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-req">Requirements</Label>
              <Textarea id="p-req" value={requirements} onChange={e => setRequirements(e.target.value)} rows={3} placeholder="What we're looking for in candidates..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-perks">Perks</Label>
              <Textarea id="p-perks" value={perks} onChange={e => setPerks(e.target.value)} rows={2} placeholder="What ambassadors will receive..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-max">Max applicants</Label>
                <Input id="p-max" type="number" min={1} value={maxApplicants} onChange={e => setMaxApplicants(e.target.value)} placeholder="Unlimited" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !title.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create program
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
