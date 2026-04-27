"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Separator } from "@client/components/ui/separator";
import { Skeleton } from "@client/components/ui/skeleton";
import { Progress } from "@client/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@client/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@client/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@client/components/ui/dialog";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Briefcase,
  GraduationCap,
  Languages,
  Sparkles,
  FileText,
  ExternalLink,
  AlertTriangle,
  Building2,
  Upload,
  Trash2,
  Loader2,
  Send,
} from "lucide-react";
import { Textarea } from "@client/components/ui/textarea";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";

// ── Status helpers ────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  PARSED: "Parsed",
  SCREENED: "Screened",
  INVITED: "Invited",
  ASSESSED: "Assessed",
  SHORTLISTED: "Shortlisted",
  BORDERLINE: "Borderline",
  ON_IMPROVEMENT_TRACK: "On Track",
  REJECTED: "Rejected",
  HIRED: "Hired",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SHORTLISTED: "default",
  HIRED: "default",
  REJECTED: "destructive",
  BORDERLINE: "secondary",
};

// ── Skill verification helpers ────────────────────────────────────

type VerificationStatus = "UNVERIFIED" | "PENDING" | "PASSED" | "FAILED" | "OVERRIDDEN";

const SKILL_STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; className: string }
> = {
  UNVERIFIED: {
    label: "Unverified",
    className: "bg-muted text-muted-foreground",
  },
  PENDING: {
    label: "Pending",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  PASSED: {
    label: "Passed",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  OVERRIDDEN: {
    label: "Overridden",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
};

interface SkillRow {
  id?: string;
  name: string;
  category?: string | null;
  verificationStatus?: VerificationStatus | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}

function SkillsVerificationPanel({
  candidateId,
  skills: initialSkills,
}: {
  candidateId: string;
  skills: SkillRow[];
}) {
  const [skills, setSkills] = useState<SkillRow[]>(initialSkills);
  const [saving, setSaving] = useState<string | null>(null); // skillId being saved
  const [error, setError] = useState<string | null>(null);

  async function handleOverride(
    skill: SkillRow,
    newStatus: "PENDING" | "PASSED" | "FAILED" | "UNVERIFIED"
  ) {
    if (!skill.id) return;
    setSaving(skill.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/candidates/${candidateId}/skills/${skill.id}/verification`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationStatus: newStatus }),
        }
      );
      const data = (await res.json()) as {
        verificationStatus?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skill.id
            ? {
                ...s,
                verificationStatus: data.verificationStatus as VerificationStatus,
                verifiedBy: "HR",
                verifiedAt: new Date().toISOString(),
              }
            : s
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update skill");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skills &amp; Verification</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-sm text-destructive">{error}</p>
        )}
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills data available.</p>
        ) : (
          <div className="space-y-2">
            {skills.map((skill, i) => {
              const status = (skill.verificationStatus ?? "UNVERIFIED") as VerificationStatus;
              const config = SKILL_STATUS_CONFIG[status] ?? SKILL_STATUS_CONFIG.UNVERIFIED;
              const isHrOverride = skill.verifiedBy && skill.verifiedBy !== "AI";
              const isSaving = saving === skill.id;

              return (
                <div
                  key={skill.id ?? i}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  {/* Left: skill name + status badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{skill.name}</span>
                    {skill.category && (
                      <span className="text-xs text-muted-foreground">
                        ({skill.category})
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.className}`}
                    >
                      {config.label}
                    </span>
                    {isHrOverride && (
                      <span className="text-xs text-muted-foreground italic">
                        HR override
                      </span>
                    )}
                  </div>

                  {/* Right: override dropdown */}
                  {skill.id && (
                    <select
                      disabled={isSaving}
                      value=""
                      className="rounded border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-50"
                      onChange={(e) => {
                        const val = e.target.value as
                          | "PENDING"
                          | "PASSED"
                          | "FAILED"
                          | "UNVERIFIED";
                        if (val) void handleOverride(skill, val);
                        e.target.value = ""; // reset
                      }}
                    >
                      <option value="" disabled>
                        {isSaving ? "Saving…" : "Set status…"}
                      </option>
                      <option value="PENDING">🔵 Set Pending (allow interview)</option>
                      <option value="PASSED">✅ Mark Passed</option>
                      <option value="FAILED">❌ Mark Failed</option>
                      <option value="UNVERIFIED">⬜ Reset to Unverified</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Score ring ────────────────────────────────────────────────────

function ScoreRing({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  const val = score ?? 0;
  const colour =
    val >= 70 ? "text-green-500" : val >= 45 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted"
          />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={`${val} ${100 - val}`}
            strokeLinecap="round"
            className={colour}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
          {score !== null ? score : "—"}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Email templates ──────────────────────────────────────────────

const EMAIL_TEMPLATES = [
  {
    id: "profile_interest",
    label: "Profile Interest",
    subject: "Your profile caught our attention — adidas Talent Team",
    body: `Dear {name},

My name is [Your Name] from the adidas Talent Acquisition team.

I came across your profile and was genuinely impressed by your background. I believe you could be an excellent fit for one or more of our current open positions.

I would love to connect and learn more about your career aspirations, and share more details about the opportunities we have available.

Could we arrange a brief call at your convenience?

Looking forward to hearing from you.

Best regards,
[Your Name]
adidas Talent Acquisition`,
  },
  {
    id: "interview_invitation",
    label: "Interview Invitation",
    subject: "Interview Invitation — adidas",
    body: `Dear {name},

Thank you for your interest in joining adidas.

We have reviewed your application and are pleased to invite you to an interview. We would like to learn more about your experience and explore how your skills align with our current opportunities.

Please reply to this email with your availability and we will coordinate a suitable time.

We look forward to speaking with you.

Best regards,
[Your Name]
adidas Talent Acquisition`,
  },
  {
    id: "assessment_invitation",
    label: "Assessment Invitation",
    subject: "Next Step: Online Assessment — adidas",
    body: `Dear {name},

Thank you for your interest in adidas.

As the next step in our selection process, we would like to invite you to complete an online assessment. This will help us better understand your skills and suitability for the role.

You will receive a separate message with instructions shortly. Please complete the assessment within 48 hours of receiving it.

If you have any questions, do not hesitate to reach out.

Best regards,
[Your Name]
adidas Talent Acquisition`,
  },
  {
    id: "status_update",
    label: "Application Status Update",
    subject: "Update on Your Application — adidas",
    body: `Dear {name},

Thank you for your patience while we review candidates for our open positions.

We wanted to reach out and let you know that your application is currently under active consideration. We appreciate the time and effort you invested in sharing your profile with us.

We will be in touch with further updates shortly.

Best regards,
[Your Name]
adidas Talent Acquisition`,
  },
  {
    id: "custom",
    label: "Custom message",
    subject: "",
    body: "",
  },
] satisfies { id: string; label: string; subject: string; body: string }[];

type TemplateId = (typeof EMAIL_TEMPLATES)[number]["id"];

// ── Contact candidate dialog ──────────────────────────────────────

function ContactCandidateDialog({
  candidateId,
  candidateName,
  candidateEmail,
}: {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"compose" | "confirm">("compose");
  const [templateId, setTemplateId] = useState<TemplateId>("profile_interest");
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [body, setBody] = useState(
    EMAIL_TEMPLATES[0].body.replace(/\{name\}/g, candidateName)
  );
  const [sending, setSending] = useState(false);

  function applyTemplate(id: TemplateId) {
    setTemplateId(id);
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === id)!;
    setSubject(tpl.subject);
    setBody(tpl.body.replace(/\{name\}/g, candidateName));
  }

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      // Reset to first template each time the dialog opens
      setStep("compose");
      applyTemplate("profile_interest");
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      toast.success(`Email sent to ${candidateName}`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  const canProceed = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="h-4 w-4 mr-1" />
          Contact Candidate
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        {step === "compose" ? (
          <>
            <DialogHeader>
              <DialogTitle>Contact Candidate</DialogTitle>
              <DialogDescription>
                Sending to{" "}
                <span className="font-medium text-foreground">{candidateName}</span>
                {" "}·{" "}
                <span className="font-medium text-foreground">{candidateEmail}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Template selector */}
              <div className="space-y-1.5">
                <Label htmlFor="template-select">Template</Label>
                <Select
                  value={templateId}
                  onValueChange={(v) => applyTemplate(v as TemplateId)}
                >
                  <SelectTrigger id="template-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  maxLength={200}
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <Label htmlFor="email-body">Message</Label>
                <Textarea
                  id="email-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here…"
                  rows={12}
                  className="resize-y font-mono text-sm"
                  maxLength={10000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {body.length} / 10 000
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!canProceed}
                onClick={() => setStep("confirm")}
              >
                Review &amp; Send
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Send</DialogTitle>
              <DialogDescription>
                Are you sure you want to send this email?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-md border bg-muted/40 p-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-[48px]">To:</span>
                  <span className="font-medium">
                    {candidateName} &lt;{candidateEmail}&gt;
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-[48px]">Subject:</span>
                  <span className="font-medium">{subject}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-[48px]">Preview:</span>
                  <span className="text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {body.slice(0, 200)}{body.length > 200 ? "…" : ""}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setStep("compose")}
                disabled={sending}
              >
                Go Back
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Send Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/candidates/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Candidate not found" : "Failed to load");
        return r.json();
      })
      .then(setCandidate)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!candidate) return;
    const name = `${candidate.firstName} ${candidate.lastName}`.trim();

    setDeleting(true);
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Delete failed (${res.status})`);
      }
      toast.success(`${name} deleted`);
      router.push("/dashboard/candidates");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function handleReplaceCv(file: File) {
    setReplacing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("candidateId", id);
      const res = await fetch("/api/upload/candidate", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }
      toast.success("CV replaced — reloading profile");
      // Reload the candidate data
      const refreshed = await fetch(`/api/candidates/${id}`).then((r) => r.json());
      setCandidate(refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setReplacing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) return <DetailSkeleton />;
  if (error || !candidate) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            {error || "Candidate not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const c = candidate;
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Candidates
      </Button>

      {/* ── Header Card ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* Left: identity */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {c.firstName} {c.lastName}
                </h1>
                <Badge variant={STATUS_VARIANT[c.status] || "secondary"}>
                  {STATUS_LABEL[c.status] || c.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {c.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {c.email}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </span>
                )}
                {(c.location || c.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />{" "}
                    {[c.location, c.country].filter(Boolean).join(", ")}
                  </span>
                )}
                {c.linkedinUrl && (
                  <a
                    href={c.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {c.bio && (
                <p className="text-sm max-w-lg mt-1">{c.bio}</p>
              )}
              {c.nationality && (
                <p className="text-xs text-muted-foreground">
                  Nationality: {c.nationality}
                  {c.willingToRelocate && " · Willing to relocate"}
                  {c.availability && ` · Available: ${c.availability}`}
                  {c.workModel && ` · ${c.workModel.replace("_", " ")}`}
                </p>
              )}
            </div>

            {/* Right: score rings */}
            <div className="flex gap-4 flex-wrap">
              <ScoreRing label="Overall" score={c.overallCvScore} />
              <ScoreRing label="Experience" score={c.experienceScore} />
              <ScoreRing label="Education" score={c.educationScore} />
              <ScoreRing label="Location" score={c.locationScore} />
              <ScoreRing label="Language" score={c.languageScore} />
            </div>
          </div>

          {/* CV actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {c.email && (
              <ContactCandidateDialog
                candidateId={c.id}
                candidateName={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()}
                candidateEmail={c.email}
              />
            )}

            {c.rawCvUrl && (
              <a
                href={`/api/upload/download?url=${encodeURIComponent(c.rawCvUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" /> Download Original CV
                </Button>
              </a>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleReplaceCv(f);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={replacing || deleting}
            >
              {replacing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              {c.rawCvUrl ? "Replace Candidate CV" : "Upload Candidate CV"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting || replacing}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Delete Candidate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <AlertDialogTitle>
                      Delete {c.firstName} {c.lastName}?
                    </AlertDialogTitle>
                  </div>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 pt-2">
                      <p>
                        This action is{" "}
                        <span className="font-semibold text-foreground">
                          permanent and cannot be undone
                        </span>
                        . The following data will be removed:
                      </p>
                      <ul className="list-disc space-y-1 pl-5 text-sm">
                        <li>Candidate profile and contact details</li>
                        <li>Uploaded CV file and motivation letter</li>
                        <li>
                          All experiences, education, languages and skills
                        </li>
                        <li>
                          Job applications, matches and assessment results
                        </li>
                        <li>
                          AI interview sessions, transcripts and proctoring
                          events
                        </li>
                        <li>Notes, tags and improvement tracks</li>
                      </ul>
                      {c.email && (
                        <p className="rounded-md bg-muted px-3 py-2 text-sm">
                          <span className="text-muted-foreground">Email:</span>{" "}
                          <span className="font-medium">{c.email}</span>
                        </p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Yes, delete permanently
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Business area + confidence badges */}
          {(c.primaryBusinessArea || c.needsReview) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {c.primaryBusinessArea && (
                <Badge variant="outline" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {c.primaryBusinessArea}
                </Badge>
              )}
              {c.secondaryBusinessAreas?.length > 0 &&
                c.secondaryBusinessAreas.map((area: string) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              {c.candidateCustomArea && (
                <Badge variant="secondary" className="text-xs">
                  Custom: {c.candidateCustomArea}
                </Badge>
              )}
              {c.needsReview && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Needs Review
                </Badge>
              )}
              {c.parsingConfidence?.overall != null && (
                <span className="text-xs text-muted-foreground">
                  Parse confidence:{" "}
                  <span className="font-medium">
                    {Math.round(c.parsingConfidence.overall * 100)}%
                  </span>
                  {c.parsingConfidence.flags?.length > 0 && (
                    <span className="ml-1 text-amber-600">
                      ({c.parsingConfidence.flags.join(", ")})
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <Tabs defaultValue="experience" className="space-y-4">
        <TabsList>
          <TabsTrigger value="experience">
            <Briefcase className="h-4 w-4 mr-1" /> Experience
          </TabsTrigger>
          <TabsTrigger value="education">
            <GraduationCap className="h-4 w-4 mr-1" /> Education
          </TabsTrigger>
          <TabsTrigger value="languages">
            <Languages className="h-4 w-4 mr-1" /> Languages
          </TabsTrigger>
          <TabsTrigger value="skills">
            <Sparkles className="h-4 w-4 mr-1" /> Skills
          </TabsTrigger>
        </TabsList>

        {/* Experience Tab */}
        <TabsContent value="experience">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Work Experience</CardTitle>
            </CardHeader>
            <CardContent>
              {(!c.experiences || c.experiences.length === 0) ? (
                <p className="text-sm text-muted-foreground">
                  No experience data available.
                </p>
              ) : (
                <div className="space-y-4">
                  {c.experiences.map((exp: any, i: number) => (
                    <div key={i} className="relative pl-6 border-l-2 border-muted pb-4 last:pb-0">
                      <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{exp.jobTitle}</p>
                          {exp.company && (
                            <p className="text-sm text-muted-foreground">
                              {exp.company}
                              {exp.location && ` · ${exp.location}`}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {exp.startDate || "?"} – {exp.isCurrent ? "Present" : exp.endDate || "?"}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Education</CardTitle>
            </CardHeader>
            <CardContent>
              {(!c.education || c.education.length === 0) ? (
                <p className="text-sm text-muted-foreground">
                  No education data available.
                </p>
              ) : (
                <div className="space-y-4">
                  {c.education.map((edu: any, i: number) => (
                    <div key={i} className="relative pl-6 border-l-2 border-muted pb-4 last:pb-0">
                      <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {edu.degree || edu.fieldOfStudy || "Degree"}
                            {edu.level && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {edu.level}
                              </Badge>
                            )}
                          </p>
                          {edu.institution && (
                            <p className="text-sm text-muted-foreground">
                              {edu.institution}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {edu.startDate || "?"} – {edu.endDate || "?"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Languages Tab */}
        <TabsContent value="languages">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Languages</CardTitle>
            </CardHeader>
            <CardContent>
              {(!c.languages || c.languages.length === 0) ? (
                <p className="text-sm text-muted-foreground">
                  No language data available.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {c.languages.map((lang: any, i: number) => {
                    const cefrMap: Record<string, number> = {
                      A1: 17, A2: 33, B1: 50, B2: 67, C1: 83, C2: 100,
                    };
                    const pct = cefrMap[lang.selfDeclaredLevel] || 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {lang.language}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {lang.selfDeclaredLevel || "N/A"}
                          </Badge>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <SkillsVerificationPanel candidateId={c.id} skills={c.skills ?? []} />
        </TabsContent>
      </Tabs>

      {/* ── Notes Section ───────────────────────────────────────── */}
      {c.notes && c.notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Recruiter Notes ({c.notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {c.notes.map((note: any) => (
                <div
                  key={note.id}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{note.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{note.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-[300px]" />
    </div>
  );
}

