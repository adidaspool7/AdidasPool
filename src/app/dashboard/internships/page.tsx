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
  BookOpen,
  MapPin,
  Building2,
  ExternalLink,
  Loader2,
  Globe,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SendHorizonal,
  Check,
  Banknote,
  UserCheck,
  Plus,
  Pencil,
  CalendarDays,
  GraduationCap,
  Eye,
  Copy,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@client/components/ui/input";
import { useRole } from "@client/components/providers/role-provider";
import { FIELDS_OF_WORK } from "@client/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";

// ============================================
// TYPES
// ============================================

interface Internship {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  location: string | null;
  country: string | null;
  status: string;
  type: string;
  sourceUrl: string | null;
  externalId: string | null;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  stipend: string | null;
  mentorName: string | null;
  mentorEmail: string | null;
  isErasmus: boolean;
  internshipStatus: string | null;
  requiredLanguage: string | null;
  requiredLanguageLevel: string | null;
  requiredExperienceType: string | null;
  minYearsExperience: number | null;
  requiredEducationLevel: string | null;
  _count?: { matches: number; assessments: number };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  distinctCountries: number;
}

interface InternshipsResponse {
  data: Internship[];
  pagination: Pagination;
}

interface Application {
  id: string;
  jobId: string;
  status: string;
}

// ============================================
// STATUS BADGES
// ============================================

function InternshipStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const config: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
  > = {
    DRAFT: { label: "Draft", variant: "outline", className: "border-gray-400 text-gray-600" },
    ACTIVE: { label: "Active", variant: "default", className: "bg-green-600 text-white" },
    INACTIVE: { label: "Inactive", variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
    FINISHED: { label: "Finished", variant: "secondary", className: "bg-blue-100 text-blue-800" },
  };
  const c = config[status] || config.DRAFT;
  return (
    <Badge variant={c.variant} className={c.className}>
      {c.label}
    </Badge>
  );
}

// ============================================
// SHARED FORM TYPES & DEFAULTS
// ============================================

interface InternshipFormData {
  title: string;
  description: string;
  department: string;
  location: string;
  country: string;
  startDate: string;
  endDate: string;
  stipend: string;
  mentorName: string;
  mentorEmail: string;
  isErasmus: boolean;
  internshipStatus: string;
  requiredLanguage: string;
  requiredLanguageLevel: string;
  requiredExperienceType: string;
  minYearsExperience: string;
  requiredEducationLevel: string;
}

const EMPTY_FORM: InternshipFormData = {
  title: "",
  description: "",
  department: "",
  location: "",
  country: "",
  startDate: "",
  endDate: "",
  stipend: "",
  mentorName: "",
  mentorEmail: "",
  isErasmus: false,
  internshipStatus: "DRAFT",
  requiredLanguage: "",
  requiredLanguageLevel: "",
  requiredExperienceType: "",
  minYearsExperience: "",
  requiredEducationLevel: "",
};

// ============================================
// SHARED FORM FIELDS COMPONENT
// ============================================

function InternshipFormFields({
  form,
  setField,
  setBoolean,
}: {
  form: InternshipFormData;
  setField: (field: keyof InternshipFormData, value: string) => void;
  setBoolean: (field: keyof InternshipFormData, value: boolean) => void;
}) {
  const isActive = form.internshipStatus === "ACTIVE";

  return (
    <div className="grid gap-4 py-4">
      {/* Row 0: Status (top) */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={form.internshipStatus}
          onValueChange={(v) => setField("internshipStatus", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="FINISHED">Finished</SelectItem>
          </SelectContent>
        </Select>
        {isActive && (
          <p className="text-xs text-amber-600">Active status requires: Department, Location, Country, Description, Start Date, End Date, Mentor Name, Mentor Email.</p>
        )}
      </div>

      {/* Row 1: Title */}
      <div className="space-y-2">
        <Label htmlFor="intern-title">Title *</Label>
        <Input
          id="intern-title"
          placeholder="e.g. Marketing Intern — Summer 2026"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
        />
      </div>

      {/* Row 2: Department + Location + Country */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="intern-dept">Department{isActive ? " *" : ""}</Label>
          <Input
            id="intern-dept"
            placeholder="e.g. Digital"
            value={form.department}
            onChange={(e) => setField("department", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intern-loc">Location{isActive ? " *" : ""}</Label>
          <Input
            id="intern-loc"
            placeholder="e.g. Porto"
            value={form.location}
            onChange={(e) => setField("location", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intern-country">Country{isActive ? " *" : ""}</Label>
          <Input
            id="intern-country"
            placeholder="e.g. Portugal"
            value={form.country}
            onChange={(e) => setField("country", e.target.value)}
          />
        </div>
      </div>

      {/* Row 3: Description */}
      <div className="space-y-2">
        <Label htmlFor="intern-desc">Description{isActive ? " *" : ""}</Label>
        <Textarea
          id="intern-desc"
          placeholder="Describe the internship, learning goals, day-to-day activities..."
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={3}
        />
      </div>

      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Internship Details</p>

      {/* Row 4: Start Date + End Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="intern-start">Start Date{isActive ? " *" : ""}</Label>
          <Input
            id="intern-start"
            type="date"
            value={form.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intern-end">End Date{isActive ? " *" : ""}</Label>
          <Input
            id="intern-end"
            type="date"
            value={form.endDate}
            onChange={(e) => setField("endDate", e.target.value)}
          />
        </div>
      </div>

      {/* Row 5: Stipend + Erasmus flag */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="intern-stipend">Stipend</Label>
          <Input
            id="intern-stipend"
            placeholder="e.g. €800/month"
            value={form.stipend}
            onChange={(e) => setField("stipend", e.target.value)}
          />
        </div>
        <div className="space-y-2 flex flex-col">
          <Label>Erasmus+ Internship</Label>
          <label className="flex items-center gap-2 h-9 px-3 border rounded-md cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={form.isErasmus}
              onChange={(e) => setBoolean("isErasmus", e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <span className="text-sm">Erasmus+</span>
          </label>
        </div>
      </div>

      {/* Row 6: Mentor */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="intern-mentor">Mentor Name{isActive ? " *" : ""}</Label>
          <Input
            id="intern-mentor"
            placeholder="e.g. Ana Silva"
            value={form.mentorName}
            onChange={(e) => setField("mentorName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intern-mentor-email">Mentor Email{isActive ? " *" : ""}</Label>
          <Input
            id="intern-mentor-email"
            type="email"
            placeholder="e.g. ana.silva@adidas.com"
            value={form.mentorEmail}
            onChange={(e) => setField("mentorEmail", e.target.value)}
          />
        </div>
      </div>

      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Requirements (optional)</p>

      {/* Row 7: Language + Level + Experience Type */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="intern-lang">Required Language</Label>
          <Input
            id="intern-lang"
            placeholder="e.g. English"
            value={form.requiredLanguage}
            onChange={(e) => setField("requiredLanguage", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Language Level</Label>
          <Select
            value={form.requiredLanguageLevel}
            onValueChange={(v) => setField("requiredLanguageLevel", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="intern-exp-type">Experience Type</Label>
          <Input
            id="intern-exp-type"
            placeholder="e.g. Marketing"
            value={form.requiredExperienceType}
            onChange={(e) => setField("requiredExperienceType", e.target.value)}
          />
        </div>
      </div>

      {/* Row 8: Min Years + Education Level */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="intern-yrs">Min Years Experience</Label>
          <Input
            id="intern-yrs"
            type="number"
            min={0}
            placeholder="e.g. 0"
            value={form.minYearsExperience}
            onChange={(e) => setField("minYearsExperience", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Education Level</Label>
          <Select
            value={form.requiredEducationLevel}
            onValueChange={(v) => setField("requiredEducationLevel", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
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
    </div>
  );
}

// ============================================
// CREATE INTERNSHIP DIALOG (HR only)
// ============================================

function CreateInternshipDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InternshipFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof InternshipFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const setBoolean = (field: keyof InternshipFormData, value: boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (form.internshipStatus === "ACTIVE") {
      const missing: string[] = [];
      if (!form.department.trim()) missing.push("Department");
      if (!form.location.trim()) missing.push("Location");
      if (!form.country.trim()) missing.push("Country");
      if (!form.description.trim()) missing.push("Description");
      if (!form.startDate) missing.push("Start Date");
      if (!form.endDate) missing.push("End Date");
      if (!form.mentorName.trim()) missing.push("Mentor Name");
      if (!form.mentorEmail.trim()) missing.push("Mentor Email");
      if (missing.length > 0) {
        setError(`Active status requires: ${missing.join(", ")}.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        type: "INTERNSHIP",
        isErasmus: form.isErasmus,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.department.trim()) body.department = form.department.trim();
      if (form.location.trim()) body.location = form.location.trim();
      if (form.country.trim()) body.country = form.country.trim();
      if (form.startDate) body.startDate = form.startDate;
      if (form.endDate) body.endDate = form.endDate;
      if (form.stipend.trim()) body.stipend = form.stipend.trim();
      if (form.mentorName.trim()) body.mentorName = form.mentorName.trim();
      if (form.mentorEmail.trim()) body.mentorEmail = form.mentorEmail.trim();
      if (form.internshipStatus) body.internshipStatus = form.internshipStatus;
      if (form.requiredLanguage.trim()) body.requiredLanguage = form.requiredLanguage.trim();
      if (form.requiredLanguageLevel) body.requiredLanguageLevel = form.requiredLanguageLevel;
      if (form.requiredExperienceType.trim())
        body.requiredExperienceType = form.requiredExperienceType.trim();
      if (form.minYearsExperience.trim())
        body.minYearsExperience = parseInt(form.minYearsExperience, 10);
      if (form.requiredEducationLevel) body.requiredEducationLevel = form.requiredEducationLevel;

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
      setError(err instanceof Error ? err.message : "Failed to create internship.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setForm(EMPTY_FORM);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Create New Internship
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Internship</DialogTitle>
          <DialogDescription>
            Fill in the internship details. Only the title is required — candidates will see all
            provided info.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          <InternshipFormFields form={form} setField={setField} setBoolean={setBoolean} />

          {error && <p className="text-sm text-red-600">{error}</p>}
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
              "Create Internship"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// EDIT INTERNSHIP DIALOG (HR only)
// ============================================

function EditInternshipDialog({
  internship,
  onUpdated,
}: {
  internship: Internship;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InternshipFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const populateForm = () => {
    setForm({
      title: internship.title || "",
      description: internship.description || "",
      department: internship.department || "",
      location: internship.location || "",
      country: internship.country || "",
      startDate: internship.startDate ? internship.startDate.substring(0, 10) : "",
      endDate: internship.endDate ? internship.endDate.substring(0, 10) : "",
      stipend: internship.stipend || "",
      mentorName: internship.mentorName || "",
      mentorEmail: internship.mentorEmail || "",
      isErasmus: internship.isErasmus ?? false,
      internshipStatus: internship.internshipStatus || "DRAFT",
      requiredLanguage: internship.requiredLanguage || "",
      requiredLanguageLevel: internship.requiredLanguageLevel || "",
      requiredExperienceType: internship.requiredExperienceType || "",
      minYearsExperience:
        internship.minYearsExperience != null ? String(internship.minYearsExperience) : "",
      requiredEducationLevel: internship.requiredEducationLevel || "",
    });
    setError(null);
  };

  const setField = (field: keyof InternshipFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const setBoolean = (field: keyof InternshipFormData, value: boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (form.internshipStatus === "ACTIVE") {
      const missing: string[] = [];
      if (!form.department.trim()) missing.push("Department");
      if (!form.location.trim()) missing.push("Location");
      if (!form.country.trim()) missing.push("Country");
      if (!form.description.trim()) missing.push("Description");
      if (!form.startDate) missing.push("Start Date");
      if (!form.endDate) missing.push("End Date");
      if (!form.mentorName.trim()) missing.push("Mentor Name");
      if (!form.mentorEmail.trim()) missing.push("Mentor Email");
      if (missing.length > 0) {
        setError(`Active status requires: ${missing.join(", ")}.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        isErasmus: form.isErasmus,
        internshipStatus: form.internshipStatus || null,
      };
      body.description = form.description.trim() || null;
      body.department = form.department.trim() || null;
      body.location = form.location.trim() || null;
      body.country = form.country.trim() || null;
      body.startDate = form.startDate || null;
      body.endDate = form.endDate || null;
      body.stipend = form.stipend.trim() || null;
      body.mentorName = form.mentorName.trim() || null;
      body.mentorEmail = form.mentorEmail.trim() || null;
      body.requiredLanguage = form.requiredLanguage.trim() || null;
      body.requiredLanguageLevel = form.requiredLanguageLevel || null;
      body.requiredExperienceType = form.requiredExperienceType.trim() || null;
      body.minYearsExperience = form.minYearsExperience.trim()
        ? parseInt(form.minYearsExperience, 10)
        : null;
      body.requiredEducationLevel = form.requiredEducationLevel || null;

      const res = await fetch(`/api/jobs/${internship.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${res.status})`);
      }

      setOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update internship.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) populateForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Internship</DialogTitle>
          <DialogDescription>
            Update the internship details. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          <InternshipFormFields form={form} setField={setField} setBoolean={setBoolean} />

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// PREVIEW INTERNSHIP DIALOG
// ============================================

function PreviewInternshipDialog({
  internship,
  open,
  onOpenChange,
}: {
  internship: Internship;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const dateRange = formatDateRange(internship.startDate, internship.endDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {internship.title}
          </DialogTitle>
          <DialogDescription>
            Full internship preview
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-amber-100 text-amber-800">Internship</Badge>
            {internship.isErasmus && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 gap-1">
                <GraduationCap className="h-3 w-3" /> Erasmus+
              </Badge>
            )}
            <InternshipStatusBadge status={internship.internshipStatus} />
          </div>

          {internship.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm whitespace-pre-wrap">{internship.description}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            {internship.department && (
              <div>
                <p className="font-medium text-muted-foreground">Department</p>
                <p className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{internship.department}</p>
              </div>
            )}
            {internship.location && (
              <div>
                <p className="font-medium text-muted-foreground">Location</p>
                <p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{internship.location}</p>
              </div>
            )}
            {internship.country && (
              <div>
                <p className="font-medium text-muted-foreground">Country</p>
                <p className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{internship.country}</p>
              </div>
            )}
            {dateRange && (
              <div>
                <p className="font-medium text-muted-foreground">Duration</p>
                <p className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{dateRange}</p>
              </div>
            )}
            {internship.stipend && (
              <div>
                <p className="font-medium text-muted-foreground">Stipend</p>
                <p className="flex items-center gap-1"><Banknote className="h-3.5 w-3.5" />{internship.stipend}</p>
              </div>
            )}
            {internship.mentorName && (
              <div>
                <p className="font-medium text-muted-foreground">Mentor</p>
                <p className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" />{internship.mentorName}</p>
                {internship.mentorEmail && <p className="text-muted-foreground text-xs">{internship.mentorEmail}</p>}
              </div>
            )}
          </div>

          {(internship.requiredLanguage || internship.requiredExperienceType || internship.requiredEducationLevel || internship.minYearsExperience != null) && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Requirements</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {internship.requiredLanguage && (
                    <div>
                      <p className="font-medium text-muted-foreground">Language</p>
                      <p>{internship.requiredLanguage}{internship.requiredLanguageLevel ? ` (${internship.requiredLanguageLevel})` : ""}</p>
                    </div>
                  )}
                  {internship.requiredExperienceType && (
                    <div>
                      <p className="font-medium text-muted-foreground">Experience Type</p>
                      <p>{internship.requiredExperienceType}</p>
                    </div>
                  )}
                  {internship.minYearsExperience != null && (
                    <div>
                      <p className="font-medium text-muted-foreground">Min Years Experience</p>
                      <p>{internship.minYearsExperience}</p>
                    </div>
                  )}
                  {internship.requiredEducationLevel && (
                    <div>
                      <p className="font-medium text-muted-foreground">Education Level</p>
                      <p>{internship.requiredEducationLevel}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// INTERNSHIP CARD
// ============================================

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

function InternshipCard({
  internship,
  onApply,
  isApplied,
  isApplying,
  showApply,
  isHR,
  onUpdated,
}: {
  internship: Internship;
  onApply?: (jobId: string) => void;
  isApplied?: boolean;
  isApplying?: boolean;
  showApply?: boolean;
  isHR?: boolean;
  onUpdated?: () => void;
}) {
  const dateRange = formatDateRange(internship.startDate, internship.endDate);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleClone = async () => {
    try {
      const body: Record<string, unknown> = {
        title: `${internship.title} (copy)`,
        type: "INTERNSHIP",
        isErasmus: internship.isErasmus ?? false,
        internshipStatus: "DRAFT",
      };
      if (internship.description) body.description = internship.description;
      if (internship.department) body.department = internship.department;
      if (internship.location) body.location = internship.location;
      if (internship.country) body.country = internship.country;
      if (internship.startDate) body.startDate = internship.startDate.substring(0, 10);
      if (internship.endDate) body.endDate = internship.endDate.substring(0, 10);
      if (internship.stipend) body.stipend = internship.stipend;
      if (internship.mentorName) body.mentorName = internship.mentorName;
      if (internship.mentorEmail) body.mentorEmail = internship.mentorEmail;
      if (internship.requiredLanguage) body.requiredLanguage = internship.requiredLanguage;
      if (internship.requiredLanguageLevel) body.requiredLanguageLevel = internship.requiredLanguageLevel;
      if (internship.requiredExperienceType) body.requiredExperienceType = internship.requiredExperienceType;
      if (internship.minYearsExperience != null) body.minYearsExperience = internship.minYearsExperience;
      if (internship.requiredEducationLevel) body.requiredEducationLevel = internship.requiredEducationLevel;

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onUpdated?.();
    } catch (err) {
      console.error("Failed to clone internship:", err);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${internship.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteOpen(false);
        onUpdated?.();
      }
    } catch (err) {
      console.error("Failed to delete internship:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="relative">
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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="bg-amber-100 text-amber-800">
                  Internship
                </Badge>
                {internship.isErasmus && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 gap-1">
                    <GraduationCap className="h-3 w-3" />
                    Erasmus+
                  </Badge>
                )}
                <InternshipStatusBadge status={internship.internshipStatus} />
              </div>
              <CardTitle className="text-base leading-snug">{internship.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {internship.department && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {internship.department}
                  </span>
                )}
                {internship.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {internship.location}
                  </span>
                )}
                {internship.country && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {internship.country}
                  </span>
                )}
              </CardDescription>
            </div>
            {/* Action buttons for HR */}
            {isHR && onUpdated && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewOpen(true)} title="Preview">
                  <Eye className="h-4 w-4" />
                </Button>
                <EditInternshipDialog internship={internship} onUpdated={onUpdated} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleClone}>
                      <Copy className="h-4 w-4 mr-2" />
                      Clone
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteOpen(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            {/* Preview button for candidates */}
            {!isHR && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewOpen(true)} title="Preview">
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Internship-specific details */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {dateRange && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {dateRange}
              </span>
            )}
            {internship.stipend && (
              <span className="flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                {internship.stipend}
              </span>
            )}
            {internship.mentorName && (
              <span className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                Mentor: {internship.mentorName}
              </span>
            )}
          </div>

          {/* Apply button */}
          {showApply && !isApplied && (
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => onApply?.(internship.id)}
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
                  Apply for Internship
                </>
              )}
            </Button>
          )}

          <div className="flex items-center justify-between">
            {internship.sourceUrl ? (
              <a
                href={internship.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                View Details <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <PreviewInternshipDialog
        internship={internship}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Internship</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{internship.title}&quot;? This action cannot be undone. All applications and assessments related to this internship will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
        Showing {start}–{end} of {total} internships
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
// MAIN PAGE
// ============================================

const PAGE_SIZE = 50;

export default function InternshipsPage() {
  const { role } = useRole();
  const isHR = role === "hr";
  const [internships, setInternships] = useState<Internship[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    distinctCountries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Application state (candidate only)
  const [applications, setApplications] = useState<Application[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  const fetchInternships = useCallback(
    async (page: number = 1, search?: string, department?: string) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
          type: "INTERNSHIP",
        });
        // Candidates only see active internships
        if (!isHR) params.set("internshipStatus", "ACTIVE");
        if (search) params.set("search", search);
        if (department) params.set("department", department);

        const res = await fetch(`/api/jobs?${params}`);
        if (res.ok) {
          const data: InternshipsResponse = await res.json();
          setInternships(data.data);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error("Failed to fetch internships:", err);
      } finally {
        setLoading(false);
      }
    },
    [isHR]
  );

  const fetchApplications = useCallback(async (cId: string) => {
    try {
      const r = await fetch(`/api/applications?candidateId=${cId}`);
      if (!r.ok) return;
      const apps = await r.json();
      if (Array.isArray(apps)) {
        setApplications(apps);
        setAppliedJobIds(
          new Set(
            apps
              .filter((a: Application) => a.status !== "WITHDRAWN")
              .map((a: Application) => a.jobId)
          )
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchInternships(1);

    if (role === "candidate") {
      fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((candidate) => {
          if (candidate?.id) {
            setCandidateId(candidate.id);
            fetchApplications(candidate.id);
          }
        })
        .catch(() => {});
    }
  }, [fetchInternships, fetchApplications, role]);

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
        fetchApplications(candidateId);
      }
    } catch (err) {
      console.error("Failed to apply:", err);
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    fetchInternships(1, searchInput || undefined, departmentFilter || undefined);
  };

  const handlePageChange = (page: number) => {
    fetchInternships(page, searchQuery || undefined, departmentFilter || undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getApplicationForJob = (jobId: string): Application | null => {
    return (
      applications.find((a) => a.jobId === jobId && a.status !== "WITHDRAWN") || null
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8" />
            Internships
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === "candidate"
              ? "Explore internship opportunities at adidas. Gain real-world experience, learn from mentors, and kickstart your career."
              : "Manage internship positions. Create, edit, and track the lifecycle of each internship."}
          </p>
        </div>
        {isHR && (
          <CreateInternshipDialog
            onCreated={() => {
              setSearchQuery("");
              setSearchInput("");
              setDepartmentFilter("");
              fetchInternships(1);
            }}
          />
        )}
      </div>

      {/* Quick stats */}
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{pagination.total}</p>
                <p className="text-xs text-muted-foreground">
                  Internship{pagination.total !== 1 ? "s" : ""}
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
            placeholder="Search internships by title, department, location..."
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
            fetchInternships(1, searchQuery || undefined, dept || undefined);
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

      {/* Internships list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : internships.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-lg mb-1">No internships available yet</p>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? "No internships match your search. Try different keywords."
                : isHR
                  ? 'No internships created yet. Click "Create New Internship" to get started.'
                  : "Check back soon — new internship opportunities are posted regularly."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {internships.map((internship) => (
              <InternshipCard
                key={internship.id}
                internship={internship}
                showApply={role === "candidate" && !!candidateId}
                isApplied={appliedJobIds.has(internship.id)}
                isApplying={applyingJobId === internship.id}
                onApply={handleApply}
                isHR={isHR}
                onUpdated={() => fetchInternships(pagination.page, searchQuery || undefined, departmentFilter || undefined)}

              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <PaginationControls pagination={pagination} onPageChange={handlePageChange} />
          )}
        </>
      )}
    </div>
  );
}
