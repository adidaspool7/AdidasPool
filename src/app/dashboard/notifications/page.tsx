"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
  RichContentRenderer,
} from "@client/components/ui/rich-text-editor";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@client/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import { useRole } from "@client/components/providers/role-provider";
import {
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  Briefcase,
  Clock,
  Megaphone,
  GraduationCap,
  FileText,
  AlertCircle,
  Archive,
  ExternalLink,
  Pin,
  Settings,
  Globe,
  Filter,
  UserCog,
  Users,
  ArchiveRestore,
  RotateCcw,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface NotificationJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  country: string | null;
  type?: string | null;
  sourceUrl?: string | null;
}

interface NotificationCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  archived?: boolean;
  createdAt: string;
  targetRole: string | null;
  campaignId: string | null;
  isPinned?: boolean;
  job: NotificationJob | null;
  candidate: NotificationCandidate | null;
  applicationId: string | null;
  metadata?: Record<string, unknown> | null;
}

interface NotificationPreferences {
  jobNotifications: boolean;
  internshipNotifications: boolean;
  onlyMyCountry: boolean;
  fieldFilters: string[];
  promotionalNotifications: boolean;
}

// HR view filters
type HrTypeTab = "applications" | "internships" | "assessments" | "talent_pool" | "other";
type HrStatusFilter = "unread" | "read" | "archived" | "all";

/** Map a notification to one of the HR type tabs. */
function hrTabFor(n: Notification): HrTypeTab {
  const t = n.type;
  const meta = (n.metadata ?? {}) as { jobType?: string | null };
  const jobType = meta.jobType ?? n.job?.type ?? null;
  if (t === "HR_APPLICATION_RECEIVED" || t === "HR_APPLICATION_WITHDRAWN") {
    return jobType === "INTERNSHIP" ? "internships" : "applications";
  }
  if (t === "HR_ASSESSMENT_COMPLETED") return "assessments";
  if (t === "HR_CV_UPLOADED" || t === "HR_PROFILE_UPDATED") return "talent_pool";
  return "other";
}

function emptyMessageForHrTab(tab: HrTypeTab, status: HrStatusFilter): string {
  if (status === "archived") return "No archived notifications in this category.";
  const base = {
    applications: "No job application notifications",
    internships: "No internship application notifications",
    assessments: "No assessment notifications",
    talent_pool: "No talent pool notifications",
    other: "No general notifications",
  }[tab];
  if (status === "unread") return `${base} to read.`;
  if (status === "read") return `${base} marked as read.`;
  return `${base} yet.`;
}

// ============================================
// NOTIFICATION TYPE HELPERS
// ============================================

function getNotificationIcon(type: string) {
  if (type === "PROMOTIONAL") return <Megaphone className="h-4 w-4 text-purple-500" />;
  if (type === "JOB_INVITATION") return <Briefcase className="h-4 w-4 text-emerald-600" />;
  if (type === "HR_PROFILE_UPDATED") return <UserCog className="h-4 w-4 text-cyan-600" />;
  if (type === "HR_CV_UPLOADED" || type === "CV_UPLOADED") return <FileText className="h-4 w-4 text-cyan-600" />;
  if (type.includes("INTERNSHIP")) return <GraduationCap className="h-4 w-4 text-blue-500" />;
  if (type.includes("APPLICATION")) return <FileText className="h-4 w-4 text-green-500" />;
  if (type.includes("ASSESSMENT")) return <AlertCircle className="h-4 w-4 text-orange-500" />;
  if (type.includes("JOB")) return <Briefcase className="h-4 w-4 text-primary" />;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

function getNotificationLabel(type: string): string {
  const labels: Record<string, string> = {
    JOB_POSTED: "New Job",
    INTERNSHIP_POSTED: "New Internship",
    JOB_INVITATION: "You're Invited",
    JOB_STATE_CHANGED: "Job Update",
    APPLICATION_RECEIVED: "Application Confirmed",
    APPLICATION_STATUS_CHANGED: "Application Update",
    APPLICATION_WITHDRAWN: "Application Withdrawn",
    ASSESSMENT_INVITE: "Assessment Invite",
    ASSESSMENT_COMPLETED: "Assessment Complete",
    HR_APPLICATION_RECEIVED: "New Application",
    HR_APPLICATION_WITHDRAWN: "Application Withdrawn",
    HR_ASSESSMENT_COMPLETED: "Assessment Complete",
    HR_CV_UPLOADED: "CV Uploaded",
    HR_PROFILE_UPDATED: "Profile Updated",
    PROMOTIONAL: "Announcement",
    CV_UPLOADED: "CV Uploaded",
    STATUS_CHANGE: "Status Change",
  };
  return labels[type] || type.replace(/_/g, " ");
}

// ============================================
// NOTIFICATION ROW (Compact for HR, Card for Candidate)
// ============================================

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NotificationRow({
  notification,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onUnarchive,
  onClick,
  selected,
  onSelect,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onClick: (n: Notification) => void;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
}) {
  const candidateName = notification.candidate
    ? `${notification.candidate.firstName} ${notification.candidate.lastName}`
    : null;
  const jobTitle = notification.job?.title ?? null;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
        !notification.read && !notification.archived ? "bg-primary/[0.03] border-l-2 border-l-primary" : ""
      } ${selected ? "bg-primary/[0.06]" : ""}`}
      onClick={() => onClick(notification)}
    >
      {/* Checkbox — hidden for archived notifications */}
      {!notification.archived && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(notification.id, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300 accent-primary shrink-0"
        />
      )}
      {notification.archived && <div className="h-4 w-4 shrink-0" />}

      {/* Icon */}
      <div className="shrink-0">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content - single line */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {!notification.read && !notification.archived && (
          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
        )}
        <span className="text-sm truncate">
          {candidateName && <span className="font-medium">{candidateName}</span>}
          {candidateName && jobTitle && <span className="text-muted-foreground"> applied for </span>}
          {jobTitle && <span className="font-medium">{jobTitle}</span>}
          {!candidateName && !jobTitle && (
            <span>{notification.message}</span>
          )}
        </span>
        <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
          {getNotificationLabel(notification.type)}
        </Badge>
      </div>

      {/* Time */}
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {timeAgo(notification.createdAt)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {notification.archived ? (
          // Archived state: only Unarchive
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUnarchive(notification.id)}
            title="Unarchive"
          >
            <ArchiveRestore className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <>
            {!notification.read ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onMarkRead(notification.id)}
                title="Mark as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onMarkUnread(notification.id)}
                title="Mark as unread"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onArchive(notification.id)}
              title="Archive"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {(notification.applicationId || notification.candidate) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onClick(notification)}
            title="View candidate"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const time = new Date(notification.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className={notification.read ? "opacity-60" : "border-primary/30 bg-primary/[0.02]"}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getNotificationLabel(notification.type)}
              </Badge>
              {notification.type === "PROMOTIONAL" && (
                <Badge variant="secondary" className="text-xs">
                  Promo
                </Badge>
              )}
              {notification.isPinned && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  <Pin className="h-3 w-3 mr-0.5" /> Pinned
                </Badge>
              )}
            </div>
            {notification.type === "PROMOTIONAL" && notification.campaignId ? (
              <RichContentRenderer html={notification.message} />
            ) : (
              <p className="text-sm leading-snug">{notification.message}</p>
            )}
            {notification.job && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {notification.job.title}
                {notification.job.location && ` - ${notification.job.location}`}
              </p>
            )}
            {notification.type === "JOB_INVITATION" && notification.job?.sourceUrl && (
              <a
                href={notification.job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
              >
                Check more on adidas Careers <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {time}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!notification.read && (
              <>
                <Badge variant="default" className="text-xs">
                  New
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onMarkRead(notification.id)}
                  title="Mark as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// PREFERENCES PANEL (Candidate only)
// ============================================

function PreferencesPanel({
  candidateId,
}: {
  candidateId: string;
}) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    jobNotifications: true,
    internshipNotifications: true,
    onlyMyCountry: false,
    fieldFilters: [],
    promotionalNotifications: true,
  });
  const [saving, setSaving] = useState(false);
  const [fieldInput, setFieldInput] = useState("");

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

  function toggle(key: keyof NotificationPreferences) {
    const updated = { ...prefs, [key]: !prefs[key] };
    save(updated);
  }

  function addField() {
    const trimmed = fieldInput.trim();
    if (!trimmed || prefs.fieldFilters.includes(trimmed)) return;
    const updated = { ...prefs, fieldFilters: [...prefs.fieldFilters, trimmed] };
    setFieldInput("");
    save(updated);
  }

  function removeField(f: string) {
    const updated = { ...prefs, fieldFilters: prefs.fieldFilters.filter((x) => x !== f) };
    save(updated);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" /> Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <PreferenceToggle
            label="Job notifications"
            description="Get notified when new jobs are posted"
            active={prefs.jobNotifications}
            onToggle={() => toggle("jobNotifications")}
          />
          <PreferenceToggle
            label="Internship notifications"
            description="Get notified when new internships open"
            active={prefs.internshipNotifications}
            onToggle={() => toggle("internshipNotifications")}
          />
          <PreferenceToggle
            label="Only my country"
            description="Only receive notifications for jobs/internships in your country"
            active={prefs.onlyMyCountry}
            onToggle={() => toggle("onlyMyCountry")}
            icon={<Globe className="h-4 w-4" />}
          />
          <PreferenceToggle
            label="Promotional notifications"
            description="Receive announcements and communications from HR"
            active={prefs.promotionalNotifications}
            onToggle={() => toggle("promotionalNotifications")}
            icon={<Megaphone className="h-4 w-4" />}
          />
        </div>

        {/* Field filters */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm font-medium flex items-center gap-1">
            <Filter className="h-4 w-4" /> Field of study filter
          </Label>
          <p className="text-xs text-muted-foreground">
            Only receive notifications for positions matching these fields. Leave empty to receive all.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Computer Science"
              value={fieldInput}
              onChange={(e) => setFieldInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addField()}
              className="text-sm"
            />
            <Button size="sm" onClick={addField} disabled={!fieldInput.trim()}>
              Add
            </Button>
          </div>
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

        {saving && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PreferenceToggle({
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



// ============================================
// NOTIFICATIONS PAGE — DUAL ROLE
// ============================================

export default function NotificationsPage() {
  const { role } = useRole();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  // HR-only: type tab + status filter (independent of candidate `activeTab`)
  const [hrTypeTab, setHrTypeTab] = useState<HrTypeTab>("applications");
  const [hrStatusFilter, setHrStatusFilter] = useState<HrStatusFilter>("unread");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Resolve candidate ID for candidate role
  useEffect(() => {
    if (role === "candidate") {
      fetch("/api/me")
        .then((r) => r.json())
        .then((data) => setCandidateId(data.id))
        .catch(console.error);
    }
  }, [role]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/notifications";
      if (role === "candidate" && candidateId) {
        url += `?role=candidate&candidateId=${encodeURIComponent(candidateId)}`;
      } else if (role === "hr") {
        url += "?role=hr";
        // For HR, the status filter (not the type tab) decides whether we
        // fetch archived rows. Type tabs filter client-side from the same
        // fetched dataset so per-tab unread counts stay accurate.
        if (hrStatusFilter === "archived") {
          url += "&archived=true";
        }
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount ?? 0);
      } else {
        setNotifications(Array.isArray(data) ? data : []);
        setUnreadCount(Array.isArray(data) ? data.filter((n: Notification) => !n.read).length : 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [role, candidateId, hrStatusFilter]);

  useEffect(() => {
    if (role === "hr" || (role === "candidate" && candidateId)) {
      fetchNotifications();
    }
  }, [role, candidateId, fetchNotifications]);

  // Clear selection when tab or HR filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, hrTypeTab, hrStatusFilter]);

  async function handleMarkRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => {
        const next = Math.max(0, c - 1);
        window.dispatchEvent(new CustomEvent("notifications:unread", { detail: next }));
        return next;
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markAllRead: true,
          candidateId: role === "candidate" ? candidateId : undefined,
          targetRole: role === "candidate" ? "CANDIDATE" : "HR",
        }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent("notifications:unread", { detail: 0 }));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  async function handleMarkUnread(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, markUnread: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
      setUnreadCount((c) => {
        const next = c + 1;
        window.dispatchEvent(new CustomEvent("notifications:unread", { detail: next }));
        return next;
      });
    } catch (error) {
      console.error("Error marking notification as unread:", error);
    }
  }

  async function handleArchive(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true, id }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Error archiving notification:", error);
    }
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveIds: ids }),
      });
      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk archiving:", error);
    }
  }

  async function handleUnarchive(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, unarchive: true }),
      });
      // Remove from the archived list; it returns to Read state in the DB
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Error unarchiving notification:", error);
    }
  }

  function handleNotificationClick(n: Notification) {
    // Mark as read when clicking (unless already read or archived)
    if (!n.read && !n.archived) handleMarkRead(n.id);
    // Navigate to the candidate profile for HR application/candidate notifications
    if (n.candidate?.id) {
      router.push(`/dashboard/candidates/${n.candidate.id}`);
    } else if (n.applicationId) {
      router.push(`/dashboard/received-applications`);
    }
  }

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Filter notifications by active tab (for non-archived tabs)
  const filtered = notifications.filter((n) => {
    if (activeTab === "archived") return true; // archived tab fetches from API
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.read;
    if (activeTab === "read") return n.read;
    // candidate tabs
    if (activeTab === "promotional") return n.type === "PROMOTIONAL";
    if (activeTab === "system") return n.type !== "PROMOTIONAL";
    return true;
  });

  // HR view: status filter narrows the fetched list, then type tab narrows further.
  const hrStatusFiltered = notifications.filter((n) => {
    if (hrStatusFilter === "all" || hrStatusFilter === "archived") return true;
    if (hrStatusFilter === "unread") return !n.read;
    if (hrStatusFilter === "read") return n.read;
    return true;
  });

  const hrFiltered = hrStatusFiltered.filter((n) => hrTabFor(n) === hrTypeTab);

  // Per-tab unread counts (always derived from non-archived data)
  const hrTabUnreadCounts: Record<HrTypeTab, number> = {
    applications: 0,
    internships: 0,
    assessments: 0,
    talent_pool: 0,
    other: 0,
  };
  if (hrStatusFilter !== "archived") {
    notifications.forEach((n) => {
      if (n.read) return;
      hrTabUnreadCounts[hrTabFor(n)]++;
    });
  }

  const isCandidate = role === "candidate";
  const allSelected = filtered.length > 0 && filtered.every((n) => selectedIds.has(n.id));
  const hrAllSelected = hrFiltered.length > 0 && hrFiltered.every((n) => selectedIds.has(n.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {isCandidate
              ? "Stay updated on new opportunities, application status, and announcements."
              : "Stay updated on new applications, assessments, and candidate changes."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bell className="h-4 w-4" />
            {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
          </span>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-xs">
              {role === "hr"
                ? Object.values(hrTabUnreadCounts).reduce((a, b) => a + b, 0)
                : unreadCount}{" "}
              unread
            </Badge>
          )}
        </div>
      )}

      {/* CANDIDATE VIEW */}
      {isCandidate && (
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="system">Updates</TabsTrigger>
              <TabsTrigger value="promotional">Campaigns</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <CandidateNotificationList
                notifications={filtered}
                loading={loading}
                onMarkRead={handleMarkRead}
                emptyMessage={
                  activeTab === "promotional"
                    ? "No campaigns yet."
                    : "No notifications yet. You'll be notified about new opportunities and application updates."
                }
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* HR VIEW — Type tabs + status filter */}
      {role === "hr" && (
        <div className="space-y-3">
          {/* Status filter row */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Status</span>
            <Select
              value={hrStatusFilter}
              onValueChange={(v) => setHrStatusFilter(v as HrStatusFilter)}
            >
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="all">All (active)</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={hrTypeTab} onValueChange={(v) => setHrTypeTab(v as HrTypeTab)}>
            <TabsList>
              <TabsTrigger value="applications" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Job Applications
                {hrTabUnreadCounts.applications > 0 && (
                  <Badge variant="default" className="ml-1 h-4 px-1 text-[10px]">
                    {hrTabUnreadCounts.applications}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="internships" className="gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> Internships
                {hrTabUnreadCounts.internships > 0 && (
                  <Badge variant="default" className="ml-1 h-4 px-1 text-[10px]">
                    {hrTabUnreadCounts.internships}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="assessments" className="gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> Assessments
                {hrTabUnreadCounts.assessments > 0 && (
                  <Badge variant="default" className="ml-1 h-4 px-1 text-[10px]">
                    {hrTabUnreadCounts.assessments}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="talent_pool" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Talent Pool
                {hrTabUnreadCounts.talent_pool > 0 && (
                  <Badge variant="default" className="ml-1 h-4 px-1 text-[10px]">
                    {hrTabUnreadCounts.talent_pool}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="other" className="gap-1.5">
                <Bell className="h-3.5 w-3.5" /> General
                {hrTabUnreadCounts.other > 0 && (
                  <Badge variant="default" className="ml-1 h-4 px-1 text-[10px]">
                    {hrTabUnreadCounts.other}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Bulk action bar — hidden when viewing archived */}
            {selectedIds.size > 0 && hrStatusFilter !== "archived" && (
              <div className="flex items-center gap-3 mt-3 px-3 py-2 bg-muted rounded-md">
                <span className="text-sm font-medium">
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleBulkArchive}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}

            <TabsContent value={hrTypeTab} className="mt-3">
              <HRNotificationList
                notifications={hrFiltered}
                loading={loading}
                onMarkRead={handleMarkRead}
                onMarkUnread={handleMarkUnread}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                onClick={handleNotificationClick}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                allSelected={hrAllSelected}
                onSelectAll={(checked) => {
                  if (checked) {
                    setSelectedIds(new Set(hrFiltered.map((n) => n.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
                isArchiveTab={hrStatusFilter === "archived"}
                emptyMessage={emptyMessageForHrTab(hrTypeTab, hrStatusFilter)}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// ============================================
// CANDIDATE: Card-based notification list
// ============================================

function CandidateNotificationList({
  notifications,
  loading,
  onMarkRead,
  emptyMessage,
}: {
  notifications: Notification[];
  loading: boolean;
  onMarkRead: (id: string) => void;
  emptyMessage: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <BellOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
        />
      ))}
    </div>
  );
}

// ============================================
// HR: Compact row-based notification list
// ============================================

function HRNotificationList({
  notifications,
  loading,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onUnarchive,
  onClick,
  selectedIds,
  onSelect,
  allSelected,
  onSelectAll,
  isArchiveTab,
  emptyMessage,
}: {
  notifications: Notification[];
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onClick: (n: Notification) => void;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  isArchiveTab: boolean;
  emptyMessage: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <BellOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header row */}
      {!isArchiveTab && (
        <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 border-b text-xs text-muted-foreground font-medium">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-primary shrink-0"
          />
          <span>Select all</span>
        </div>
      )}
      {notifications.map((notification) => (
        <NotificationRow
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onMarkUnread={onMarkUnread}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onClick={onClick}
          selected={selectedIds.has(notification.id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
