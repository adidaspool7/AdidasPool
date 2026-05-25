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
  secondaryEmail: string | null;
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

// ─── Country dial codes ──────────────────────────────────────────

const COUNTRY_CODES = [
  { code: "AL", flag: "🇦🇱", name: "Albania", dialCode: "+355" },
  { code: "DZ", flag: "🇩🇿", name: "Algeria", dialCode: "+213" },
  { code: "AR", flag: "🇦🇷", name: "Argentina", dialCode: "+54" },
  { code: "AU", flag: "🇦🇺", name: "Australia", dialCode: "+61" },
  { code: "AT", flag: "🇦🇹", name: "Austria", dialCode: "+43" },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh", dialCode: "+880" },
  { code: "BE", flag: "🇧🇪", name: "Belgium", dialCode: "+32" },
  { code: "BR", flag: "🇧🇷", name: "Brazil", dialCode: "+55" },
  { code: "BG", flag: "🇧🇬", name: "Bulgaria", dialCode: "+359" },
  { code: "CA", flag: "🇨🇦", name: "Canada", dialCode: "+1" },
  { code: "CL", flag: "🇨🇱", name: "Chile", dialCode: "+56" },
  { code: "CN", flag: "🇨🇳", name: "China", dialCode: "+86" },
  { code: "CO", flag: "🇨🇴", name: "Colombia", dialCode: "+57" },
  { code: "HR", flag: "🇭🇷", name: "Croatia", dialCode: "+385" },
  { code: "CZ", flag: "🇨🇿", name: "Czech Republic", dialCode: "+420" },
  { code: "DK", flag: "🇩🇰", name: "Denmark", dialCode: "+45" },
  { code: "EG", flag: "🇪🇬", name: "Egypt", dialCode: "+20" },
  { code: "EE", flag: "🇪🇪", name: "Estonia", dialCode: "+372" },
  { code: "FI", flag: "🇫🇮", name: "Finland", dialCode: "+358" },
  { code: "FR", flag: "🇫🇷", name: "France", dialCode: "+33" },
  { code: "DE", flag: "🇩🇪", name: "Germany", dialCode: "+49" },
  { code: "GR", flag: "🇬🇷", name: "Greece", dialCode: "+30" },
  { code: "HU", flag: "🇭🇺", name: "Hungary", dialCode: "+36" },
  { code: "IN", flag: "🇮🇳", name: "India", dialCode: "+91" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia", dialCode: "+62" },
  { code: "IE", flag: "🇮🇪", name: "Ireland", dialCode: "+353" },
  { code: "IL", flag: "🇮🇱", name: "Israel", dialCode: "+972" },
  { code: "IT", flag: "🇮🇹", name: "Italy", dialCode: "+39" },
  { code: "JP", flag: "🇯🇵", name: "Japan", dialCode: "+81" },
  { code: "KR", flag: "🇰🇷", name: "South Korea", dialCode: "+82" },
  { code: "LV", flag: "🇱🇻", name: "Latvia", dialCode: "+371" },
  { code: "LT", flag: "🇱🇹", name: "Lithuania", dialCode: "+370" },
  { code: "LU", flag: "🇱🇺", name: "Luxembourg", dialCode: "+352" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia", dialCode: "+60" },
  { code: "MX", flag: "🇲🇽", name: "Mexico", dialCode: "+52" },
  { code: "MA", flag: "🇲🇦", name: "Morocco", dialCode: "+212" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands", dialCode: "+31" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand", dialCode: "+64" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria", dialCode: "+234" },
  { code: "NO", flag: "🇳🇴", name: "Norway", dialCode: "+47" },
  { code: "PK", flag: "🇵🇰", name: "Pakistan", dialCode: "+92" },
  { code: "PL", flag: "🇵🇱", name: "Poland", dialCode: "+48" },
  { code: "PT", flag: "🇵🇹", name: "Portugal", dialCode: "+351" },
  { code: "RO", flag: "🇷🇴", name: "Romania", dialCode: "+40" },
  { code: "RU", flag: "🇷🇺", name: "Russia", dialCode: "+7" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia", dialCode: "+966" },
  { code: "RS", flag: "🇷🇸", name: "Serbia", dialCode: "+381" },
  { code: "SG", flag: "🇸🇬", name: "Singapore", dialCode: "+65" },
  { code: "SK", flag: "🇸🇰", name: "Slovakia", dialCode: "+421" },
  { code: "SI", flag: "🇸🇮", name: "Slovenia", dialCode: "+386" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa", dialCode: "+27" },
  { code: "ES", flag: "🇪🇸", name: "Spain", dialCode: "+34" },
  { code: "SE", flag: "🇸🇪", name: "Sweden", dialCode: "+46" },
  { code: "CH", flag: "🇨🇭", name: "Switzerland", dialCode: "+41" },
  { code: "TH", flag: "🇹🇭", name: "Thailand", dialCode: "+66" },
  { code: "TR", flag: "🇹🇷", name: "Turkey", dialCode: "+90" },
  { code: "UA", flag: "🇺🇦", name: "Ukraine", dialCode: "+380" },
  { code: "AE", flag: "🇦🇪", name: "UAE", dialCode: "+971" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", dialCode: "+44" },
  { code: "US", flag: "🇺🇸", name: "United States", dialCode: "+1" },
  { code: "VN", flag: "🇻🇳", name: "Vietnam", dialCode: "+84" },
] as const;

/**
 * Splits a stored phone string (e.g. "+351 912345678") into its
 * country dial code and local number parts.
 */
function parsePhoneValue(phone: string): { dialCode: string; local: string } {
  if (!phone) return { dialCode: "", local: "" };
  if (phone.startsWith("+")) {
    const spaceIdx = phone.indexOf(" ");
    if (spaceIdx > 0) {
      return { dialCode: phone.slice(0, spaceIdx), local: phone.slice(spaceIdx + 1) };
    }
    // No space — longest-match against known dial codes
    const sorted = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const match = sorted.find((c) => phone.startsWith(c.dialCode));
    if (match) {
      return { dialCode: match.dialCode, local: phone.slice(match.dialCode.length).trim() };
    }
  }
  return { dialCode: "", local: phone };
}

// ─── HR localStorage profile ─────────────────────────────────────

// Key is scoped by the user's email so different HR accounts on the
// same browser never share profile data.
const hrProfileKey = (email: string | null) =>
  email ? `ti_hr_profile_${email}` : "ti_hr_profile";

const LS_CV_DATA_KEY = "cv-upload-data";
const LS_CV_META_KEY = "cv-upload-meta";
const LS_ML_DATA_KEY = "ml-upload-data";
const LS_LA_DATA_KEY = "la-upload-data";

interface HRProfile {
  firstName: string;
  lastName: string;
  email: string; // always overridden by Supabase auth email at load time
  secondaryEmail: string;
  phoneDialCode: string;
  phone: string;
  location: string;
}

const DEFAULT_HR_PROFILE: HRProfile = {
  firstName: "HR",
  lastName: "Manager",
  email: "",
  secondaryEmail: "",
  phoneDialCode: "",
  phone: "",
  location: "Maia, Porto, Portugal",
};

function loadHRProfile(key: string): HRProfile {
  if (typeof window === "undefined") return DEFAULT_HR_PROFILE;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...DEFAULT_HR_PROFILE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_HR_PROFILE;
}

function saveHRProfile(key: string, profile: HRProfile) {
  localStorage.setItem(key, JSON.stringify(profile));
}

// ─── Component ───────────────────────────────────────────────────

export default function SettingsPage() {
  const { role, userEmail } = useRole();
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
    secondaryEmail: "",
    phoneDialCode: "",
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
      // HR profile is localStorage-based, scoped by authenticated email
      const key = hrProfileKey(userEmail);
      const stored = loadHRProfile(key);
      // Parse legacy combined phone values on first load after upgrade
      const parsedPhone = parsePhoneValue(stored.phone);
      setHrForm({
        ...stored,
        email: userEmail ?? "",
        phone: stored.phoneDialCode ? stored.phone : parsedPhone.local,
        phoneDialCode: stored.phoneDialCode || parsedPhone.dialCode,
      });
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
          secondaryEmail: data.secondaryEmail ?? "",
          ...(() => { const p = parsePhoneValue(data.phone ?? ""); return { phoneDialCode: p.dialCode, phone: p.local }; })(),
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
    const key = hrProfileKey(userEmail);
    // Never persist email — it is always read from Supabase auth
    const toStore: HRProfile = { ...hrForm, email: userEmail ?? "" };
    saveHRProfile(key, toStore);
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
      if (form.secondaryEmail !== (profile?.secondaryEmail ?? ""))
        payload.secondaryEmail = form.secondaryEmail || null;
      const combinedPhone = form.phoneDialCode
        ? `${form.phoneDialCode} ${form.phone}`.trim()
        : form.phone;
      if (combinedPhone !== (profile?.phone ?? ""))
        payload.phone = combinedPhone || null;
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
                readOnly
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                This email comes from your Google account and cannot be changed here.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrSecondaryEmail">
                Secondary Email
                <span className="ml-1 text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="hrSecondaryEmail"
                type="email"
                value={hrForm.secondaryEmail}
                onChange={(e) => updateHrField("secondaryEmail", e.target.value)}
                placeholder="another.email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrPhone">Phone</Label>
              <div className="flex gap-2">
                <Select
                  value={hrForm.phoneDialCode}
                  onValueChange={(v) => updateHrField("phoneDialCode", v)}
                >
                  <SelectTrigger className="w-[150px] shrink-0">
                    <SelectValue placeholder="🌐 Code" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {COUNTRY_CODES.map(({ code, name, dialCode }) => (
                      <SelectItem key={code} value={dialCode}>
                        {name} ({dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="hrPhone"
                  type="tel"
                  className="flex-1"
                  value={hrForm.phone}
                  onChange={(e) => updateHrField("phone", e.target.value)}
                  placeholder="912 345 678"
                />
              </div>
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
            <Label htmlFor="secondaryEmail">
              <Mail className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Secondary Email
              <span className="ml-1 text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="secondaryEmail"
              type="email"
              value={form.secondaryEmail}
              onChange={(e) => updateField("secondaryEmail", e.target.value)}
              placeholder="another.email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Phone Number
            </Label>
            <div className="flex gap-2">
              <Select
                value={form.phoneDialCode}
                onValueChange={(v) => updateField("phoneDialCode", v)}
              >
                <SelectTrigger className="w-[150px] shrink-0">
                  <SelectValue placeholder="🌐 Code" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {COUNTRY_CODES.map(({ code, name, dialCode }) => (
                    <SelectItem key={code} value={dialCode}>
                      {name} ({dialCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                className="flex-1"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="912 345 678"
              />
            </div>
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
