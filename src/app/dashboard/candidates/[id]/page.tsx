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
import { formatLocation } from "@client/lib/utils";
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
  ClipboardList,
  ChevronDown,
  ChevronUp,
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

// ── Interviews panel ──────────────────────────────────────────────

type TranscriptTurn = {
  role: string;
  text: string;
  sequence: number;
  createdAt: string;
};

type InterviewSession = {
  id: string;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  evaluatedAt?: string | null;
  status: string;
  targetSkill?: string | null;
  interviewMode?: string | null;
  finalDecision?: string | null;
  technicalDecision?: string | null;
  integrityDecision?: string | null;
  evaluationRationale?: Record<string, unknown> | null;
  terminationReason?: string | null;
  transcript: TranscriptTurn[];
};

const DECISION_CONFIG: Record<string, { label: string; className: string }> = {
  PASS: { label: "PASS", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  FAIL: { label: "FAIL", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  CLEAR: { label: "CLEAR", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  REVIEW: { label: "REVIEW", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  EVALUATED: { label: "Evaluated", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  TERMINATED: { label: "Terminated", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-muted text-muted-foreground" },
};

function DecisionBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const cfg = DECISION_CONFIG[value] ?? { label: value, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function InterviewCard({ session }: { session: InterviewSession }) {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const rationale = session.evaluationRationale as Record<string, unknown> | null;
  const date = session.evaluatedAt || session.endedAt || session.createdAt;
  const modeLabel = session.interviewMode === "LANGUAGE" ? "🗣️ Language" : "🔧 Technical";

  return (
    <div className="rounded-md border">
      {/* Header row — always visible */}
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">
            {new Date(date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="text-xs text-muted-foreground">{modeLabel}</span>
          {session.targetSkill && (
            <span className="rounded-full border px-2 py-0.5 text-xs">
              {session.targetSkill}
            </span>
          )}
          <DecisionBadge value={session.finalDecision ?? session.status} />
          {session.terminationReason === "user_early_exit" && (
            <span className="text-xs text-muted-foreground italic">early exit</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Decision grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Final</p>
              <DecisionBadge value={session.finalDecision} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Technical</p>
              <DecisionBadge value={session.technicalDecision} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Integrity</p>
              <DecisionBadge value={session.integrityDecision} />
            </div>
          </div>

          {/* Rationale */}
          {rationale && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Evaluation Reasoning
              </p>
              {(["technical", "integrity", "final"] as const).map((key) =>
                rationale[key] ? (
                  <div key={key} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium capitalize">{key}:</span>{" "}
                    <span className="text-muted-foreground">
                      {String(rationale[key])}
                    </span>
                  </div>
                ) : null
              )}
              {/* CEFR / language metrics */}
              {(["cefr_level", "grammar", "vocabulary", "fluency"] as const).some(
                (k) => rationale[k]
              ) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(["cefr_level", "grammar", "vocabulary", "fluency"] as const).map(
                    (k) =>
                      rationale[k] ? (
                        <span
                          key={k}
                          className="rounded-full border px-2 py-0.5 text-xs capitalize"
                        >
                          {k.replace("_", " ")}: {String(rationale[k])}
                        </span>
                      ) : null
                  )}
                </div>
              )}
              {/* Evidence */}
              {Array.isArray(rationale.evidence) && rationale.evidence.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Evidence cited:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {(rationale.evidence as string[]).map((e, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rationale.turn_count !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Turn count: {String(rationale.turn_count)}
                </p>
              )}
            </div>
          )}

          {/* Transcript toggle */}
          {session.transcript.length > 0 && (
            <div>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowTranscript((v) => !v)}
              >
                {showTranscript ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {showTranscript ? "Hide" : "Show"} transcript (
                {session.transcript.length} turns)
              </button>
              {showTranscript && (
                <div className="mt-2 max-h-80 overflow-y-auto rounded-md border bg-muted/30 p-3 space-y-2">
                  {session.transcript.map((turn, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 text-sm ${
                        turn.role === "assistant" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span className="shrink-0 text-xs font-semibold uppercase text-muted-foreground pt-0.5">
                        {turn.role === "assistant" ? "AI" : "You"}
                      </span>
                      <p
                        className={`rounded-md px-3 py-1.5 text-xs max-w-[80%] ${
                          turn.role === "assistant"
                            ? "bg-primary/10 text-foreground"
                            : "bg-background border text-foreground"
                        }`}
                      >
                        {turn.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InterviewsPanel({ candidateId }: { candidateId: string }) {
  const [interviews, setInterviews] = useState<InterviewSession[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/candidates/${candidateId}/interviews`)
      .then((r) => r.json())
      .then((data: { interviews?: InterviewSession[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setInterviews(data.interviews ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load interviews"))
      .finally(() => setLoading(false));
  }, [candidateId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Interview History</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && interviews?.length === 0 && (
          <p className="text-sm text-muted-foreground">No interviews on record.</p>
        )}
        {!error && interviews && interviews.length > 0 && (
          <div className="space-y-3">
            {interviews.map((session) => (
              <InterviewCard key={session.id} session={session} />
            ))}
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
                    {formatLocation(c.location, c.country)}
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
          <TabsTrigger value="interviews">
            <ClipboardList className="h-4 w-4 mr-1" /> Interviews
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

        {/* Interviews Tab */}
        <TabsContent value="interviews">
          <InterviewsPanel candidateId={c.id} />
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

      {/* ── Interaction History ──────────────────────────────────── */}
      <InteractionHistory candidateId={c.id} />
      <ShortlistedFor candidateId={c.id} />
    </div>
  );
}

// ── Interaction History component ────────────────────────────────

interface HistoryItem {
  id: string;
  type: string;
  message: string;
  createdAt: string | Date;
  createdBy?: string | null;
  read: boolean;
  readAt?: string | Date | null;
  metadata?: Record<string, unknown> | null;
  campaign?: { id: string; title: string } | null;
  job?: { id: string; title: string } | null;
}

const HISTORY_TYPE_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string }
> = {
  STATUS_CHANGE:              { label: "Status Change",       bgClass: "bg-blue-100 dark:bg-blue-950",   textClass: "text-blue-800 dark:text-blue-300"   },
  CONTACT_EMAIL_SENT:         { label: "Email Sent",          bgClass: "bg-purple-100 dark:bg-purple-950",textClass: "text-purple-800 dark:text-purple-300" },
  PROMOTIONAL:                { label: "Campaign",            bgClass: "bg-orange-100 dark:bg-orange-950",textClass: "text-orange-800 dark:text-orange-300" },
  ASSESSMENT_INVITE:          { label: "Assessment Invite",   bgClass: "bg-teal-100 dark:bg-teal-950",   textClass: "text-teal-800 dark:text-teal-300"   },
  APPLICATION_STATUS_CHANGED: { label: "Application Update", bgClass: "bg-indigo-100 dark:bg-indigo-950",textClass: "text-indigo-800 dark:text-indigo-300" },
  ASSESSMENT_COMPLETED:       { label: "Assessment Done",     bgClass: "bg-green-100 dark:bg-green-950",  textClass: "text-green-800 dark:text-green-300"  },
  CV_UPLOADED:                { label: "CV Uploaded",         bgClass: "bg-muted",                        textClass: "text-muted-foreground"               },
  JOB_POSTED:                 { label: "Job Posted",          bgClass: "bg-sky-100 dark:bg-sky-950",     textClass: "text-sky-800 dark:text-sky-300"     },
  INTERNSHIP_POSTED:          { label: "Internship Posted",   bgClass: "bg-sky-100 dark:bg-sky-950",     textClass: "text-sky-800 dark:text-sky-300"     },
  JOB_STATE_CHANGED:          { label: "Job Update",          bgClass: "bg-sky-100 dark:bg-sky-950",     textClass: "text-sky-800 dark:text-sky-300"     },
};

function InteractionHistory({ candidateId }: { candidateId: string }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/candidates/${candidateId}/interaction-history`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
        else setFetchError("Failed to load history");
      })
      .catch(() => setFetchError("Failed to load history"))
      .finally(() => setLoading(false));
  }, [candidateId]);

  function fmtDate(d: string | Date | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function typeConfig(type: string) {
    return (
      HISTORY_TYPE_CONFIG[type] ?? {
        label: type,
        bgClass: "bg-muted",
        textClass: "text-muted-foreground",
      }
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Interaction History ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {fetchError && (
          <p className="text-sm text-destructive">{fetchError}</p>
        )}
        {!fetchError && history.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No interactions recorded yet.
          </p>
        )}
        {history.length > 0 && (
          <div className="relative">
            {/* Vertical timeline line */}
            <div
              className="absolute left-3.5 top-3 bottom-3 w-px bg-border"
              aria-hidden
            />
            <div className="space-y-4">
              {history.map((item) => {
                const cfg = typeConfig(item.type);
                const isEmail = item.type === "CONTACT_EMAIL_SENT";
                const expanded = expandedEmail === item.id;
                const newStatus = item.metadata?.newStatus as string | undefined;
                const campaignTitle = item.campaign?.title;
                const readDate = item.readAt ? fmtDate(item.readAt) : null;

                return (
                  <div key={item.id} className="flex gap-4 pl-8 relative">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-3 w-2.5 h-2.5 rounded-full bg-border border-2 border-background" />

                    <div className="flex-1 rounded-md border p-3 text-sm space-y-2">
                      {/* ── Header row: type badge + date ── */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            cfg.bgClass
                          } ${cfg.textClass}`}
                        >
                          {cfg.label}
                        </span>

                        {/* Status label for STATUS_CHANGE */}
                        {newStatus && STATUS_LABEL[newStatus] && (
                          <span className="text-xs text-muted-foreground">
                            &rarr;{" "}
                            <span className="font-medium text-foreground">
                              {STATUS_LABEL[newStatus]}
                            </span>
                          </span>
                        )}

                        {/* Campaign title for PROMOTIONAL */}
                        {campaignTitle && (
                          <span className="text-xs text-muted-foreground">
                            &ldquo;
                            <span className="font-medium text-foreground">
                              {campaignTitle}
                            </span>
                            &rdquo;
                          </span>
                        )}

                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {fmtDate(item.createdAt)}
                        </span>
                      </div>

                      {/* ── Message / subject ── */}
                      {isEmail ? (
                        <p className="text-muted-foreground">
                          Subject:{" "}
                          <span className="font-medium text-foreground">
                            {item.message}
                          </span>
                        </p>
                      ) : (
                        <p className="text-muted-foreground">{item.message}</p>
                      )}

                      {/* ── Expandable email body ── */}
                      {isEmail && item.metadata != null && typeof item.metadata.body === "string" && (
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEmail(expanded ? null : item.id)
                            }
                            className="text-xs text-primary underline-offset-2 hover:underline flex items-center gap-1"
                          >
                            <ChevronDown
                              className={`h-3 w-3 transition-transform ${
                                expanded ? "rotate-180" : ""
                              }`}
                            />
                            {expanded ? "Hide email body" : "View email body"}
                          </button>
                          {expanded && (
                            <pre className="mt-2 rounded-md bg-muted/50 border p-3 text-xs whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                              {item.metadata.body}
                            </pre>
                          )}
                        </div>
                      )}

                      {/* ── Footer: sent by + read status ── */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 border-t border-border/50">
                        {item.createdBy ? (
                          <span className="text-xs text-muted-foreground">
                            By:{" "}
                            <span className="font-medium">{item.createdBy}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">System</span>
                        )}

                        {isEmail ? (
                          <span className="text-xs text-muted-foreground italic">
                            Email delivered &middot; read receipt unavailable
                          </span>
                        ) : item.read ? (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            ✓ Read{readDate ? ` · ${readDate}` : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not yet read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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

// ── Shortlisted For component (HR-only) ─────────────────────────
// Lists all jobs this candidate has been shortlisted on. Hits an HR-only
// API; renders nothing for candidate viewers (403) or empty results.

interface ShortlistedForRow {
  id: string;
  jobId: string;
  candidateId: string;
  addedBy: string | null;
  addedAt: string;
  fitScoreAtAdd: number | null;
  notes: string | null;
  job: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    country: string | null;
    status: string | null;
  };
}

function ShortlistedFor({ candidateId }: { candidateId: string }) {
  const [rows, setRows] = useState<ShortlistedForRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/candidates/${candidateId}/shortlists`)
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as { entries: ShortlistedForRow[] };
      })
      .then((j) => {
        if (!alive) return;
        setRows(j?.entries ?? []);
      })
      .catch(() => {
        if (alive) setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [candidateId]);

  if (loading || !rows || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Shortlisted For ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {rows.map((r) => {
            const fit = r.fitScoreAtAdd != null ? Math.round(r.fitScoreAtAdd) : null;
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={`/dashboard/jobs/${r.jobId}/match-candidates?tab=shortlist`}
                    className="font-medium hover:underline truncate inline-block max-w-full"
                  >
                    {r.job.title}
                  </a>
                  <div className="text-xs text-muted-foreground truncate">
                    {[r.job.department, r.job.location, r.job.country]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                    {r.addedBy && (
                      <>
                        {" "}· Added by{" "}
                        <span className="font-medium text-foreground">{r.addedBy}</span>
                      </>
                    )}
                    {" "}·{" "}
                    {new Date(r.addedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  {r.notes && (
                    <div className="text-xs text-muted-foreground italic mt-1 truncate">
                      &ldquo;{r.notes}&rdquo;
                    </div>
                  )}
                </div>
                {fit != null && (
                  <Badge variant="outline" className="tabular-nums">
                    Fit {fit}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

