"use client";

import { useEffect, useState } from "react";
import { useRole } from "@client/components/providers/role-provider";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Calendar,
  Briefcase,
  Clock,
  Building2,
  Heart,
  FileText,
  Loader2,
  Save,
  Check,
  ChevronsUpDown,
  Bell,
  Megaphone,
  Filter,
  Trash2,
} from "lucide-react";

import { Button } from "@client/components/ui/button";
import { Card } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import { Separator } from "@client/components/ui/separator";
import { Badge } from "@client/components/ui/badge";
import { Skeleton } from "@client/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@client/components/ui/command";
import { cn } from "@client/lib/utils";
import { FIELDS_OF_WORK } from "@client/lib/constants";

// ─── Types ───────────────────────────────────────────────────────
interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  country: string | null;
  linkedinUrl: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  willingToRelocate: boolean | null;
  availability: string | null;
  workModel: string | null;
  bio: string | null;
  sourceType: string;
  createdAt: string;
  rawCvUrl?: string | null;
}

const AVAILABILITY_OPTIONS = [
  "Immediately",
  "1 month",
  "2 months",
  "3+ months",
] as const;

const WORK_MODEL_OPTIONS = [
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ON_SITE", label: "On-site" },
] as const;

const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan",
  "Argentine", "Armenian", "Australian", "Austrian", "Azerbaijani",
  "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian",
  "Belgian", "Belizean", "Beninese", "Bhutanese", "Bolivian",
  "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian",
  "Burkinabe", "Burmese", "Burundian", "Cambodian", "Cameroonian",
  "Canadian", "Cape Verdean", "Central African", "Chadian", "Chilean",
  "Chinese", "Colombian", "Comorian", "Congolese", "Costa Rican",
  "Croatian", "Cuban", "Cypriot", "Czech", "Danish", "Djiboutian",
  "Dominican", "Dutch", "East Timorese", "Ecuadorian", "Egyptian",
  "Emirati", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian",
  "Fijian", "Filipino", "Finnish", "French", "Gabonese", "Gambian",
  "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan",
  "Guinean", "Guyanese", "Haitian", "Honduran", "Hungarian",
  "Icelandic", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish",
  "Israeli", "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian",
  "Kazakh", "Kenyan", "Kiribati", "Kuwaiti", "Kyrgyz", "Laotian",
  "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtenstein",
  "Lithuanian", "Luxembourgish", "Macedonian", "Malagasy", "Malawian",
  "Malaysian", "Maldivian", "Malian", "Maltese", "Marshallese",
  "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan",
  "Monegasque", "Mongolian", "Montenegrin", "Moroccan", "Mozambican",
  "Namibian", "Nauruan", "Nepalese", "New Zealand", "Nicaraguan",
  "Nigerian", "Nigerien", "North Korean", "Norwegian", "Omani",
  "Pakistani", "Palauan", "Palestinian", "Panamanian", "Papua New Guinean",
  "Paraguayan", "Peruvian", "Polish", "Portuguese", "Qatari",
  "Romanian", "Russian", "Rwandan", "Saint Lucian", "Salvadoran",
  "Samoan", "Saudi", "Senegalese", "Serbian", "Seychellois",
  "Sierra Leonean", "Singaporean", "Slovak", "Slovenian", "Solomon Islander",
  "Somali", "South African", "South Korean", "South Sudanese", "Spanish",
  "Sri Lankan", "Sudanese", "Surinamese", "Swazi", "Swedish", "Swiss",
  "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese",
  "Tongan", "Trinidadian", "Tunisian", "Turkish", "Turkmen", "Tuvaluan",
  "Ugandan", "Ukrainian", "Uruguayan", "Uzbek", "Vanuatuan",
  "Venezuelan", "Vietnamese", "Yemeni", "Zambian", "Zimbabwean",
] as const;

// ─── Nationality Combobox ────────────────────────────────────────

function NationalityCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || "Select nationality..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search nationality..." />
          <CommandList>
            <CommandEmpty>No nationality found.</CommandEmpty>
            <CommandGroup>
              {NATIONALITIES.map((nat) => (
                <CommandItem
                  key={nat}
                  value={nat}
                  onSelect={(current) => {
                    onChange(current === value ? "" : current);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === nat ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {nat}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Notification Preferences Section ─────────────────────────────

interface NotificationPreferences {
  jobNotifications: boolean;
  internshipNotifications: boolean;
  onlyMyCountry: boolean;
  fieldFilters: string[];
  promotionalNotifications: boolean;
}

function NotificationPreferencesSection({ candidateId }: { candidateId: string }) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    jobNotifications: true,
    internshipNotifications: true,
    onlyMyCountry: false,
    fieldFilters: [],
    promotionalNotifications: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/notifications/preferences?candidateId=${encodeURIComponent(candidateId)}`)
      .then((r) => r.json())
      .then((data) => setPrefs(data))
      .catch(console.error);
  }, [candidateId]);

  async function save(updated: NotificationPreferences) {
    setPrefs(updated);
    setSaving(true);
    try {
      await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, ...updated }),
      });
    } catch (e) {
      console.error("Failed to save preferences:", e);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof Omit<NotificationPreferences, "fieldFilters">) {
    const updated = { ...prefs, [key]: !prefs[key] };
    save(updated);
  }

  function addField(field: string) {
    if (prefs.fieldFilters.includes(field)) return;
    const updated = { ...prefs, fieldFilters: [...prefs.fieldFilters, field] };
    save(updated);
  }

  function removeField(f: string) {
    const updated = { ...prefs, fieldFilters: prefs.fieldFilters.filter((x) => x !== f) };
    save(updated);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Notification Preferences</h2>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="space-y-4">
        <div className="space-y-3">
          <NotifPrefToggle
            label="Job notifications"
            description="Get notified when new jobs are posted"
            active={prefs.jobNotifications}
            onToggle={() => toggle("jobNotifications")}
          />
          <NotifPrefToggle
            label="Internship notifications"
            description="Get notified when new internships open"
            active={prefs.internshipNotifications}
            onToggle={() => toggle("internshipNotifications")}
          />
          <NotifPrefToggle
            label="Only my country"
            description="Only receive notifications for jobs/internships in your country"
            active={prefs.onlyMyCountry}
            onToggle={() => toggle("onlyMyCountry")}
            icon={<Globe className="h-4 w-4" />}
          />
          <NotifPrefToggle
            label="Highlights & announcements"
            description="Receive announcements and communications from HR"
            active={prefs.promotionalNotifications}
            onToggle={() => toggle("promotionalNotifications")}
            icon={<Megaphone className="h-4 w-4" />}
          />
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm font-medium flex items-center gap-1">
            <Filter className="h-4 w-4" /> Field of work filter
          </Label>
          <p className="text-xs text-muted-foreground">
            Only receive notifications for positions matching these fields. Leave empty to receive all.
          </p>
          <Select onValueChange={(value) => addField(value)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select a field of work..." />
            </SelectTrigger>
            <SelectContent>
              {FIELDS_OF_WORK.filter((f) => !prefs.fieldFilters.includes(f)).map((field) => (
                <SelectItem key={field} value={field}>{field}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {prefs.fieldFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {prefs.fieldFilters.map((f) => (
                <Badge key={f} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeField(f)}>
                  {f} &times;
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function NotifPrefToggle({
  label,
  description,
  active,
  onToggle,
  icon,
}: {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium flex items-center gap-1.5">
          {icon}
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button
        variant={active ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        className="shrink-0 min-w-[60px]"
      >
        {active ? "On" : "Off"}
      </Button>
    </div>
  );
}

// ─── HR localStorage profile ─────────────────────────────────────

const HR_PROFILE_KEY = "ti_hr_profile";
const LS_CV_DATA_KEY = "cv-upload-data";
const LS_CV_META_KEY = "cv-upload-meta";
const LS_ML_DATA_KEY = "ml-upload-data";
const LS_LA_DATA_KEY = "la-upload-data";

interface HRProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
}

const DEFAULT_HR_PROFILE: HRProfile = {
  firstName: "HR",
  lastName: "Manager",
  email: "hr.manager@adidas.com",
  phone: "",
  location: "Maia, Porto, Portugal",
};

function loadHRProfile(): HRProfile {
  if (typeof window === "undefined") return DEFAULT_HR_PROFILE;
  try {
    const raw = localStorage.getItem(HR_PROFILE_KEY);
    if (raw) return { ...DEFAULT_HR_PROFILE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_HR_PROFILE;
}

function saveHRProfile(profile: HRProfile) {
  localStorage.setItem(HR_PROFILE_KEY, JSON.stringify(profile));
}

// ─── Component ───────────────────────────────────────────────────

export default function SettingsPage() {
  const { role } = useRole();
  const isHR = role === "hr";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingCv, setDeletingCv] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [dirty, setDirty] = useState(false);

  // HR-specific profile state
  const [hrForm, setHrForm] = useState<HRProfile>(DEFAULT_HR_PROFILE);

  // Form state — mirrors profile but editable
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    nationality: "",
    linkedinUrl: "",
    dateOfBirth: "",
    willingToRelocate: null as boolean | null,
    availability: "" as string,
    workModel: "" as string,
    bio: "",
  });

  // ─── Fetch profile ────────────────────────────────────────────
  useEffect(() => {
    if (isHR) {
      // HR profile is localStorage-based — no backend candidate record
      const stored = loadHRProfile();
      setHrForm(stored);
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("Failed to load profile");
        const data: Profile = await res.json();
        setProfile(data);
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          location: data.location ?? "",
          nationality: data.nationality ?? "",
          linkedinUrl: data.linkedinUrl ?? "",
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth).toISOString().split("T")[0]
            : "",
          willingToRelocate: data.willingToRelocate,
          availability: data.availability ?? "",
          workModel: data.workModel ?? "",
          bio: data.bio ?? "",
        });
      } catch {
        toast.error("Could not load your profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [isHR]);

  // ─── Helpers ──────────────────────────────────────────────────
  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function updateHrField<K extends keyof HRProfile>(key: K, value: HRProfile[K]) {
    setHrForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  // ─── Save ─────────────────────────────────────────────────────
  async function handleSaveHR() {
    saveHRProfile(hrForm);
    setDirty(false);
    toast.success("HR profile saved");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      // Only send fields that changed
      if (form.firstName !== (profile?.firstName ?? ""))
        payload.firstName = form.firstName;
      if (form.lastName !== (profile?.lastName ?? ""))
        payload.lastName = form.lastName;
      if (form.email !== (profile?.email ?? ""))
        payload.email = form.email || null;
      if (form.phone !== (profile?.phone ?? ""))
        payload.phone = form.phone || null;
      if (form.location !== (profile?.location ?? ""))
        payload.location = form.location || null;
      if (form.nationality !== (profile?.nationality ?? ""))
        payload.nationality = form.nationality || null;
      if (form.linkedinUrl !== (profile?.linkedinUrl ?? ""))
        payload.linkedinUrl = form.linkedinUrl || null;
      if (
        form.dateOfBirth !==
        (profile?.dateOfBirth
          ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
          : "")
      )
        payload.dateOfBirth = form.dateOfBirth || null;
      if (form.willingToRelocate !== profile?.willingToRelocate)
        payload.willingToRelocate = form.willingToRelocate;
      if (form.availability !== (profile?.availability ?? ""))
        payload.availability = form.availability || null;
      if (form.workModel !== (profile?.workModel ?? ""))
        payload.workModel = form.workModel || null;
      if (form.bio !== (profile?.bio ?? "")) payload.bio = form.bio || null;

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Update failed");
      }

      const updated: Profile = await res.json();
      setProfile(updated);
      setDirty(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save changes"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCv() {
    if (!confirm("Are you sure you want to delete your CV from the platform?")) {
      return;
    }

    setDeletingCv(true);
    try {
      const res = await fetch("/api/me?mode=cv", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete CV");
      }
      const updated: Profile = await res.json();
      setProfile(updated);
      toast.success("Your CV was deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete CV");
    } finally {
      setDeletingCv(false);
    }
  }

  async function handleDeleteAllInformation() {
    if (!confirm("Are you sure you want to permanently delete all your information? This cannot be undone.")) {
      return;
    }

    setDeletingAll(true);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to delete profile data");
      }

      [
        LS_CV_DATA_KEY,
        LS_CV_META_KEY,
        LS_ML_DATA_KEY,
        LS_LA_DATA_KEY,
      ].forEach((key) => localStorage.removeItem(key));

      toast.success("All your information was deleted.");
      window.location.reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete all information"
      );
    } finally {
      setDeletingAll(false);
    }
  }

  // ─── Loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Card className="p-6 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // ── HR-only render ───────────────────────────────────────────
  if (isHR) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HR Profile</h1>
            <p className="text-muted-foreground">
              Manage your HR manager display information.
            </p>
          </div>
          <Button onClick={handleSaveHR} disabled={!dirty}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Identity</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hrFirstName">First Name</Label>
              <Input
                id="hrFirstName"
                value={hrForm.firstName}
                onChange={(e) => updateHrField("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrLastName">Last Name</Label>
              <Input
                id="hrLastName"
                value={hrForm.lastName}
                onChange={(e) => updateHrField("lastName", e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Contact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hrEmail">Email</Label>
              <Input
                id="hrEmail"
                type="email"
                value={hrForm.email}
                onChange={(e) => updateHrField("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrPhone">Phone</Label>
              <Input
                id="hrPhone"
                type="tel"
                value={hrForm.phone}
                onChange={(e) => updateHrField("phone", e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Location</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hrLocation">Office Location</Label>
            <Input
              id="hrLocation"
              value={hrForm.location}
              onChange={(e) => updateHrField("location", e.target.value)}
              placeholder="e.g. Maia, Porto, Portugal"
            />
          </div>
        </Card>

        <Separator />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">HR Manager</Badge>
          <span>·</span>
          <span>Profile stored locally on this device</span>
        </div>
      </div>
    );
  }

  // ── Candidate render ───────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal information and preferences.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* ── Section 1: Identity ────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Identity</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="Your first name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="Your last name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">
              <Calendar className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Date of Birth
            </Label>
            <Input
              id="dob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>
              <Globe className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Nationality
            </Label>
            <NationalityCombobox
              value={form.nationality}
              onChange={(val) => updateField("nationality", val)}
            />
          </div>
        </div>
      </Card>

      {/* ── Section 2: Contact ─────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Contact Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+351 912 345 678"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="linkedin">
              <Linkedin className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              LinkedIn URL
            </Label>
            <Input
              id="linkedin"
              type="url"
              value={form.linkedinUrl}
              onChange={(e) => updateField("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/your-profile"
            />
          </div>
        </div>
      </Card>

      {/* ── Section 3: Location & Relocation ───────────────────── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Location &amp; Relocation</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">
              <MapPin className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Current Location
            </Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g. Lisbon, Portugal"
            />
          </div>
          <div className="space-y-2">
            <Label>
              <Heart className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Willing to Relocate to Porto?
            </Label>
            <div className="flex gap-2 pt-1">
              {[
                { value: true, label: "Yes" },
                { value: false, label: "No" },
              ].map((opt) => (
                <Button
                  key={String(opt.value)}
                  type="button"
                  size="sm"
                  variant={
                    form.willingToRelocate === opt.value
                      ? "default"
                      : "outline"
                  }
                  onClick={() => updateField("willingToRelocate", opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
              {form.willingToRelocate !== null && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground text-xs"
                  onClick={() => updateField("willingToRelocate", null)}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 4: Work Preferences ────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Work Preferences</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="availability">
              <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Availability / Notice Period
            </Label>
            <Select
              value={form.availability}
              onValueChange={(val) => updateField("availability", val)}
            >
              <SelectTrigger id="availability">
                <SelectValue placeholder="Select availability" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workModel">
              <Building2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Preferred Work Model
            </Label>
            <Select
              value={form.workModel}
              onValueChange={(val) => updateField("workModel", val)}
            >
              <SelectTrigger id="workModel">
                <SelectValue placeholder="Select work model" />
              </SelectTrigger>
              <SelectContent>
                {WORK_MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Section 5: About / Bio ─────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">About You</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Short Bio</Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => updateField("bio", e.target.value)}
            placeholder="Tell us a bit about yourself — your background, strengths, and what you're looking for..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {form.bio.length}/500
          </p>
        </div>
      </Card>

      {/* ── Section 6: Notification Preferences ─── */}
      {profile && <NotificationPreferencesSection candidateId={profile.id} />}

      {/* ── Profile meta ────────────────────── */}
      {profile && (
        <>
          <Separator />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {profile.sourceType === "PLATFORM" ? "Self-Registered" : profile.sourceType === "INTERNAL" ? "Internal" : "External"}{" "}
              Candidate
            </Badge>
            <span>·</span>
            <span>
              Profile created{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </>
      )}

      <Card className="p-6 border-destructive/30">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You can remove your CV only, or permanently remove all your data.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteCv}
              disabled={deletingCv || deletingAll || !profile?.rawCvUrl}
            >
              {deletingCv ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete CV
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAllInformation}
              disabled={deletingAll || deletingCv}
            >
              {deletingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete All Information
            </Button>
          </div>
        </div>
      </Card>

      {/* Bottom save button for long pages */}
      {dirty && (
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
