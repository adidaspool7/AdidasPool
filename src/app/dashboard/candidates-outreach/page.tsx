"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
  RichTextEditor,
  RichContentRenderer,
} from "@client/components/ui/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@client/components/ui/dialog";
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
import {
  Loader2,
  Megaphone,
  Send,
  Eye,
  Trash2,
  Pencil,
  ChevronsUpDown,
  Check,
  X,
  Copy,
  Mail,
  Pin,
  Archive,
  Search,
} from "lucide-react";
import { FIELDS_OF_WORK } from "@client/lib/constants";

// ============================================
// TYPES & CONSTANTS
// ============================================

const COUNTRIES = [
  { code: "AT", name: "Austria" }, { code: "AU", name: "Australia" },
  { code: "BE", name: "Belgium" }, { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" }, { code: "CH", name: "Switzerland" },
  { code: "CN", name: "China" }, { code: "CO", name: "Colombia" },
  { code: "CZ", name: "Czech Republic" }, { code: "DE", name: "Germany" },
  { code: "DK", name: "Denmark" }, { code: "EG", name: "Egypt" },
  { code: "ES", name: "Spain" }, { code: "FI", name: "Finland" },
  { code: "FR", name: "France" }, { code: "GB", name: "United Kingdom" },
  { code: "GR", name: "Greece" }, { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" }, { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" }, { code: "IN", name: "India" },
  { code: "IT", name: "Italy" }, { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" }, { code: "MX", name: "Mexico" },
  { code: "MY", name: "Malaysia" }, { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" }, { code: "NZ", name: "New Zealand" },
  { code: "PH", name: "Philippines" }, { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" }, { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" }, { code: "SA", name: "Saudi Arabia" },
  { code: "SE", name: "Sweden" }, { code: "SG", name: "Singapore" },
  { code: "TH", name: "Thailand" }, { code: "TR", name: "Turkey" },
  { code: "TW", name: "Taiwan" }, { code: "UA", name: "Ukraine" },
  { code: "US", name: "United States" }, { code: "VN", name: "Vietnam" },
  { code: "ZA", name: "South Africa" },
] as const;

interface Campaign {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isPinned: boolean;
  scheduledAt: string | null;
  status: "DRAFT" | "SENT" | "TERMINATED" | "ARCHIVED";
  targetAll: boolean;
  targetCountries: string[];
  targetFields: string[];
  targetEducation: string[];
  targetEmails: string[];
  recipientCount: number | null;
  sentAt: string | null;
  sentBy: string | null;
  createdAt: string;
  readStats: { total: number; read: number } | null;
}

// ============================================
// MULTI-SELECT COMPONENTS
// ============================================

function CountryMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (code: string) => {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code]
    );
  };

  const selectedNames = selected
    .map((c) => COUNTRIES.find((co) => co.code === c)?.name ?? c)
    .join(", ");

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-auto min-h-9"
          >
            <span className="truncate text-left">
              {selected.length > 0 ? selectedNames : "Select countries..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder="Search countries..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={`${c.name} ${c.code}`}
                    onSelect={() => toggle(c.code)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        selected.includes(c.code) ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    {c.name} ({c.code})
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1 text-xs">
              {COUNTRIES.find((c) => c.code === code)?.name ?? code}
              <button
                type="button"
                onClick={() => toggle(code)}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (fields: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (field: string) => {
    onChange(
      selected.includes(field)
        ? selected.filter((f) => f !== field)
        : [...selected, field]
    );
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-auto min-h-9"
          >
            <span className="truncate text-left">
              {selected.length > 0 ? selected.join(", ") : "Select fields of work..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder="Search fields..." />
            <CommandList>
              <CommandEmpty>No field found.</CommandEmpty>
              <CommandGroup>
                {FIELDS_OF_WORK.map((field) => (
                  <CommandItem
                    key={field}
                    value={field}
                    onSelect={() => toggle(field)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        selected.includes(field) ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    {field}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((field) => (
            <Badge key={field} variant="secondary" className="gap-1 text-xs">
              {field}
              <button
                type="button"
                onClick={() => toggle(field)}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// CAMPAIGN STATUS BADGE
// ============================================

function CampaignStatusBadge({ status }: { status: string }) {
  if (status === "DRAFT") return <Badge variant="outline" className="text-xs">Draft</Badge>;
  if (status === "SENT") return <Badge variant="default" className="text-xs bg-green-600">Sent</Badge>;
  if (status === "TERMINATED") return <Badge variant="secondary" className="text-xs">Terminated</Badge>;
  if (status === "ARCHIVED") return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-300">Archived</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

// ============================================
// CAMPAIGN EDITOR FORM
// ============================================

function CampaignEditorForm({
  campaign,
  onSaved,
}: {
  campaign?: Campaign;
  onSaved: () => void;
}) {
  const isEdit = !!campaign;
  const [title, setTitle] = useState(campaign?.title ?? "");
  const [body, setBody] = useState(campaign?.body ?? "");
  const [linkUrl, setLinkUrl] = useState(campaign?.linkUrl ?? "");
  const [targetAll, setTargetAll] = useState(campaign?.targetAll ?? true);
  const [targetCountries, setTargetCountries] = useState<string[]>(campaign?.targetCountries ?? []);
  const [scheduledAt, setScheduledAt] = useState(campaign?.scheduledAt ?? "");
  const [targetFields, setTargetFields] = useState<string[]>(campaign?.targetFields ?? []);
  const [targetEmails, setTargetEmails] = useState<string[]>(campaign?.targetEmails ?? []);
  const [emailInput, setEmailInput] = useState("");
  const [isPinned, setIsPinned] = useState(campaign?.isPinned ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  async function previewAudience() {
    try {
      const res = await fetch("/api/notifications/campaigns/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAll, targetCountries: targetAll ? [] : targetCountries }),
      });
      if (res.ok) {
        const data = await res.json();
        setAudienceCount(data.audienceCount);
      }
    } catch (e) {
      console.error("Preview failed:", e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        linkUrl: linkUrl.trim() || undefined,
        targetAll: targetEmails.length > 0 ? false : targetAll,
        targetCountries: targetAll ? [] : targetCountries,
        targetFields: targetAll ? [] : targetFields,
        targetEmails,
        scheduledAt: scheduledAt || null,
        isPinned,
      };

      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/notifications/campaigns/${campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/notifications/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) onSaved();
    } catch (e) {
      console.error("Error saving campaign:", e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="camp-title">Title *</Label>
        <Input id="camp-title" placeholder="Campaign title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Content *</Label>
        <p className="text-xs text-muted-foreground">Use the toolbar to format text, add images inline, insert links, or add footnotes.</p>
        <RichTextEditor content={body} onChange={(html) => setBody(html)} placeholder="Write your notification content..." minHeight="250px" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="camp-link">CTA Link URL (optional)</Label>
        <Input id="camp-link" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="camp-schedule">Schedule Send (optional)</Label>
        <p className="text-xs text-muted-foreground">Leave empty to send manually. Set a future date/time to schedule the campaign.</p>
        <Input
          id="camp-schedule"
          type="datetime-local"
          value={scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : ""}
          onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
          min={new Date().toISOString().slice(0, 16)}
        />
        {scheduledAt && (
          <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setScheduledAt("")}>Clear schedule</Button>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 py-2 border-t">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Pin Campaign</p>
          <p className="text-xs text-muted-foreground">Pinned campaigns appear at the top of candidate notifications.</p>
        </div>
        <Button type="button" variant={isPinned ? "default" : "outline"} size="sm" onClick={() => setIsPinned(!isPinned)} className="shrink-0 min-w-[60px]">
          {isPinned ? "Pinned" : "Off"}
        </Button>
      </div>
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-sm font-medium">Targeting</Label>
        <div className="flex gap-2">
          <Button type="button" variant={targetAll ? "default" : "outline"} size="sm" onClick={() => setTargetAll(true)}>All candidates</Button>
          <Button type="button" variant={!targetAll ? "default" : "outline"} size="sm" onClick={() => setTargetAll(false)}>Targeted</Button>
        </div>
        {!targetAll && (
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Countries</Label>
              <CountryMultiSelect selected={targetCountries} onChange={setTargetCountries} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fields of Work</Label>
              <p className="text-xs text-muted-foreground">Only target candidates matching these fields. Leave empty for all fields.</p>
              <FieldMultiSelect selected={targetFields} onChange={setTargetFields} />
            </div>
          </div>
        )}
        <div className="space-y-2 pt-2">
          <Label className="text-xs flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Individual Recipients (by email)</Label>
          <p className="text-xs text-muted-foreground">Send directly to specific users by email. This overrides the audience targeting above.</p>
          <div className="flex gap-2">
            <Input
              placeholder="user@example.com"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const trimmed = emailInput.trim().toLowerCase();
                  if (trimmed && !targetEmails.includes(trimmed)) {
                    setTargetEmails([...targetEmails, trimmed]);
                    setEmailInput("");
                  }
                }
              }}
              className="text-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const trimmed = emailInput.trim().toLowerCase();
                if (trimmed && !targetEmails.includes(trimmed)) {
                  setTargetEmails([...targetEmails, trimmed]);
                  setEmailInput("");
                }
              }}
              disabled={!emailInput.trim()}
            >
              Add
            </Button>
          </div>
          {targetEmails.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {targetEmails.map((e) => (
                <Badge key={e} variant="secondary" className="gap-1 text-xs">
                  {e}
                  <button type="button" onClick={() => setTargetEmails(targetEmails.filter((x) => x !== e))} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={previewAudience}>
          <Eye className="h-3.5 w-3.5" /> Preview audience
        </Button>
        {audienceCount !== null && (
          <p className="text-xs text-muted-foreground">
            Estimated audience: <span className="font-medium">{audienceCount}</span> candidate{audienceCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={submitting || !title.trim() || !body.trim()}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        {isEdit ? "Save Changes" : "Create Campaign (Draft)"}
      </Button>
    </form>
  );
}

// ============================================
// CANDIDATES OUTREACH PAGE
// ============================================

export default function CandidatesOutreachPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Campaign["status"]>("ALL");

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/campaigns");
      if (res.ok) setCampaigns(await res.json());
    } catch (e) {
      console.error("Error loading campaigns:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  async function handleSend(id: string) {
    try {
      const res = await fetch(`/api/notifications/campaigns/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentBy: "HR" }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to send");
        return;
      }
      loadCampaigns();
    } catch (e) {
      console.error("Error sending campaign:", e);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/notifications/campaigns/${id}`, { method: "DELETE" });
      setDeletingCampaign(null);
      loadCampaigns();
    } catch (e) {
      console.error("Error deleting campaign:", e);
    }
  }

  async function handleClone(campaign: Campaign) {
    try {
      const res = await fetch("/api/notifications/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${campaign.title} (copy)`,
          body: campaign.body,
          imageUrl: campaign.imageUrl,
          linkUrl: campaign.linkUrl,
          isPinned: false,
          targetAll: campaign.targetAll,
          targetCountries: campaign.targetCountries,
          targetFields: campaign.targetFields,
          targetEducation: campaign.targetEducation,
        }),
      });
      if (res.ok) loadCampaigns();
    } catch (e) {
      console.error("Error cloning campaign:", e);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const res = await fetch(`/api/notifications/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) loadCampaigns();
    } catch (e) {
      console.error("Error changing campaign status:", e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            Candidates Outreach
          </h1>
          <p className="text-muted-foreground">
            Create and manage promotional campaigns to engage with candidates.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Megaphone className="h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Create Promotional Campaign</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <CampaignEditorForm
                onSaved={() => {
                  setCreateOpen(false);
                  loadCampaigns();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      {editingCampaign && (
        <Dialog open onOpenChange={() => setEditingCampaign(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <CampaignEditorForm
                campaign={editingCampaign}
                onSaved={() => {
                  setEditingCampaign(null);
                  loadCampaigns();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {previewCampaign && (
        <Dialog open onOpenChange={() => setPreviewCampaign(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewCampaign.title}</DialogTitle>
              <DialogDescription>
                {previewCampaign.targetAll
                  ? "All candidates"
                  : `Targeted: ${previewCampaign.targetCountries.join(", ")}`}
                {previewCampaign.recipientCount != null && ` · ${previewCampaign.recipientCount} recipients`}
              </DialogDescription>
            </DialogHeader>
            <div className="border rounded-md p-4">
              <RichContentRenderer html={previewCampaign.body} />
            </div>
            {previewCampaign.imageUrl && (
              <div className="text-sm text-muted-foreground">
                Banner image: <a href={previewCampaign.imageUrl} target="_blank" rel="noopener noreferrer" className="underline">{previewCampaign.imageUrl}</a>
              </div>
            )}
            {previewCampaign.linkUrl && (
              <div className="text-sm text-muted-foreground">
                CTA link: <a href={previewCampaign.linkUrl} target="_blank" rel="noopener noreferrer" className="underline">{previewCampaign.linkUrl}</a>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      {deletingCampaign && (
        <Dialog open onOpenChange={() => setDeletingCampaign(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Campaign</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{deletingCampaign.title}&quot;?
                This will permanently remove the campaign and all associated notifications. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeletingCampaign(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deletingCampaign.id)}>Yes, delete permanently</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {(["ALL", "DRAFT", "SENT", "TERMINATED", "ARCHIVED"] as const).map((s) => {
            const count = s === "ALL" ? campaigns.length : campaigns.filter((c) => c.status === s).length;
            return (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setStatusFilter(s)}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0 h-4">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-40" />
            {campaigns.length === 0 ? (
              <>
                <p className="font-medium">No campaigns yet</p>
                <p className="text-sm">Create one to send announcements to candidates.</p>
              </>
            ) : (
              <>
                <p className="font-medium">No campaigns match your filters</p>
                <p className="text-sm">Try adjusting the search or status filter.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.title}</p>
                      <CampaignStatusBadge status={c.status} />
                      {c.isPinned && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          <Pin className="h-3 w-3 mr-0.5" /> Pinned
                        </Badge>
                      )}
                    </div>
                    <div
                      className="text-sm text-muted-foreground line-clamp-2 [&_img]:hidden [&_hr]:hidden"
                      dangerouslySetInnerHTML={{ __html: c.body }}
                    />
                    <div className="flex gap-3 text-xs text-muted-foreground pt-1">
                      <span>{c.targetAll ? "All candidates" : `Targeted (${c.targetCountries.length} countries)`}</span>
                      {c.recipientCount != null && <span>{c.recipientCount} recipients</span>}
                      {c.sentAt && <span>Sent {new Date(c.sentAt).toLocaleDateString()}</span>}
                      {c.readStats && c.readStats.total > 0 && (
                        <span className="text-emerald-600">
                          {Math.round((c.readStats.read / c.readStats.total) * 100)}% read ({c.readStats.read}/{c.readStats.total})
                        </span>
                      )}
                      {c.scheduledAt && c.status === "DRAFT" && (
                        <span className="text-orange-600">
                          Scheduled for {new Date(c.scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setPreviewCampaign(c)}>
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </Button>
                    {c.status === "DRAFT" && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingCampaign(c)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button variant="default" size="sm" className="gap-1" onClick={() => handleSend(c.id)}>
                          <Send className="h-3.5 w-3.5" /> Send
                        </Button>
                      </>
                    )}
                    {c.status === "SENT" && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleStatusChange(c.id, "TERMINATED")}>
                          Terminate
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleClone(c)} title="Clone as new draft">
                          <Copy className="h-3.5 w-3.5" /> Clone
                        </Button>
                      </>
                    )}
                    {c.status === "TERMINATED" && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleStatusChange(c.id, "ARCHIVED")}>
                          <Archive className="h-4 w-4" /> Archive
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleClone(c)}>
                          <Copy className="h-3.5 w-3.5" /> Clone
                        </Button>
                      </>
                    )}
                    {(c.status === "DRAFT" || c.status === "ARCHIVED") && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setDeletingCampaign(c)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleClone(c)}>
                          <Copy className="h-3.5 w-3.5" /> Clone
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
