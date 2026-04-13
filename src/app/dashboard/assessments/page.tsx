"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Progress } from "@client/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@client/components/ui/tabs";
import { Separator } from "@client/components/ui/separator";
import {
  Headphones,
  Mic,
  BookOpen,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  ClipboardCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

// ============================================
// ASSESSMENT TYPES CONFIG
// ============================================

interface AssessmentTypeInfo {
  label: string;
  description: string;
  icon: LucideIcon;
  instructions: string[];
  estimatedMinutes: number;
  color: string;
}

const ASSESSMENT_TYPES: Record<string, AssessmentTypeInfo> = {
  LISTENING_WRITTEN: {
    label: "Listening & Written Response",
    description:
      "Listen to an audio prompt in the target language and provide a written response demonstrating comprehension and communication skills.",
    icon: Headphones,
    instructions: [
      "You will listen to an audio recording (played up to 3 times)",
      "After listening, write a response in the target language",
      "Your response will be evaluated on grammar, vocabulary, clarity, and comprehension",
      "You have a set time limit to complete the task",
    ],
    estimatedMinutes: 30,
    color: "text-blue-600 bg-blue-50",
  },
  SPEAKING: {
    label: "Speaking Task",
    description:
      "Record a spoken response to a given prompt. Your speech will be transcribed and evaluated for fluency, grammar, and clarity.",
    icon: Mic,
    instructions: [
      "Read the prompt carefully before recording",
      "Click 'Record' when ready and speak clearly into your microphone",
      "Your speech will be transcribed using AI speech-to-text",
      "Scoring covers fluency, pronunciation, grammar, and vocabulary",
    ],
    estimatedMinutes: 20,
    color: "text-emerald-600 bg-emerald-50",
  },
  READING_ALOUD: {
    label: "Reading Aloud",
    description:
      "Read a provided text passage aloud. Your pronunciation, fluency, and intonation will be evaluated via speech-to-text analysis.",
    icon: BookOpen,
    instructions: [
      "A text passage will be displayed on screen",
      "Read through it silently first (1 minute preparation)",
      "Click 'Record' and read the passage aloud clearly",
      "Focus on pronunciation, natural rhythm, and correct intonation",
    ],
    estimatedMinutes: 15,
    color: "text-purple-600 bg-purple-50",
  },
  COMBINED: {
    label: "Combined Assessment",
    description:
      "A comprehensive assessment combining listening, writing, and speaking tasks to provide a complete evaluation of your language abilities.",
    icon: Layers,
    instructions: [
      "This assessment has multiple sections (listening, writing, and speaking)",
      "Each section is timed individually",
      "Complete all sections in order — you cannot go back",
      "Your overall score reflects performance across all sections",
    ],
    estimatedMinutes: 45,
    color: "text-amber-600 bg-amber-50",
  },
};

// ============================================
// STATUS CONFIG
// ============================================

interface StatusInfo {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: LucideIcon;
}

const ASSESSMENT_STATUS: Record<string, StatusInfo> = {
  PENDING: { label: "Pending", variant: "outline", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "secondary", icon: AlertCircle },
  SUBMITTED: { label: "Submitted", variant: "secondary", icon: CheckCircle2 },
  SCORED: { label: "Scored", variant: "default", icon: CheckCircle2 },
  REVIEWED: { label: "Reviewed", variant: "default", icon: CheckCircle2 },
  EXPIRED: { label: "Expired", variant: "destructive", icon: AlertCircle },
};

// ============================================
// SCORING DIMENSIONS
// ============================================

const SCORING_DIMENSIONS = [
  { key: "grammar", label: "Grammar", description: "Sentence structure and correctness" },
  { key: "vocabulary", label: "Vocabulary", description: "Range and accuracy of word choice" },
  { key: "clarity", label: "Clarity", description: "Clear communication of ideas" },
  { key: "fluency", label: "Fluency", description: "Natural flow and ease of expression" },
  { key: "customerHandling", label: "Customer Handling", description: "Professional communication ability" },
] as const;

// ============================================
// CEFR DISPLAY
// ============================================

const CEFR_INFO: Record<string, { label: string; color: string }> = {
  A1: { label: "A1 — Beginner", color: "bg-red-100 text-red-800" },
  A2: { label: "A2 — Elementary", color: "bg-orange-100 text-orange-800" },
  B1: { label: "B1 — Intermediate", color: "bg-yellow-100 text-yellow-800" },
  B2: { label: "B2 — Upper Intermediate", color: "bg-blue-100 text-blue-800" },
  C1: { label: "C1 — Advanced", color: "bg-green-100 text-green-800" },
  C2: { label: "C2 — Proficient", color: "bg-emerald-100 text-emerald-800" },
};

// ============================================
// MOCK DATA (will be replaced by API calls)
// ============================================

interface MockAssessment {
  id: string;
  type: string;
  language: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  magicToken: string;
  jobTitle?: string;
  result?: {
    overallScore: number;
    grammarScore: number;
    vocabularyScore: number;
    clarityScore: number;
    fluencyScore: number;
    customerHandlingScore: number;
    cefrEstimation: string;
    isBorderline: boolean;
    feedbackSummary: string;
  };
}

// TODO: Replace with real API call to GET /api/assessments?candidateId=...
const MOCK_ASSESSMENTS: MockAssessment[] = [
  {
    id: "1",
    type: "LISTENING_WRITTEN",
    language: "English",
    status: "PENDING",
    createdAt: "2026-02-20T10:00:00Z",
    expiresAt: "2026-02-27T10:00:00Z",
    magicToken: "abc123",
    jobTitle: "Customer Service Representative — Berlin",
  },
  {
    id: "2",
    type: "SPEAKING",
    language: "German",
    status: "SCORED",
    createdAt: "2026-02-15T10:00:00Z",
    expiresAt: "2026-02-17T10:00:00Z",
    magicToken: "def456",
    jobTitle: "Support Specialist — Munich",
    result: {
      overallScore: 72,
      grammarScore: 75,
      vocabularyScore: 68,
      clarityScore: 80,
      fluencyScore: 65,
      customerHandlingScore: 72,
      cefrEstimation: "B2",
      isBorderline: false,
      feedbackSummary:
        "Good command of German with solid grammar fundamentals. Vocabulary range is adequate for professional settings. Consider expanding topic-specific vocabulary for customer interactions. Clarity of expression is a strength — ideas are communicated effectively.",
    },
  },
  {
    id: "3",
    type: "COMBINED",
    language: "French",
    status: "SCORED",
    createdAt: "2026-02-10T10:00:00Z",
    expiresAt: "2026-02-12T10:00:00Z",
    magicToken: "ghi789",
    jobTitle: "Finance Analyst — Paris",
    result: {
      overallScore: 52,
      grammarScore: 55,
      vocabularyScore: 48,
      clarityScore: 58,
      fluencyScore: 45,
      customerHandlingScore: 54,
      cefrEstimation: "B1",
      isBorderline: true,
      feedbackSummary:
        "Shows foundational understanding of French but struggles with complex sentence structures. Vocabulary is limited for professional contexts. We recommend enrolling in the improvement track to strengthen fluency and expand vocabulary before reassessment.",
    },
  },
];

// ============================================
// SUB-COMPONENTS
// ============================================

function AssessmentStatusBadge({ status }: { status: string }) {
  const info = ASSESSMENT_STATUS[status] || ASSESSMENT_STATUS.PENDING;
  const Icon = info.icon;

  return (
    <Badge variant={info.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>
  );
}

function ScoreBar({
  label,
  description,
  score,
}: {
  label: string;
  description: string;
  score: number;
}) {
  const getScoreColor = (s: number) => {
    if (s >= 75) return "text-green-600";
    if (s >= 60) return "text-blue-600";
    if (s >= 45) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {description}
          </span>
        </div>
        <span className={`text-sm font-bold ${getScoreColor(score)}`}>
          {score}/100
        </span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}

function AssessmentCard({ assessment }: { assessment: MockAssessment }) {
  const typeInfo = ASSESSMENT_TYPES[assessment.type] || ASSESSMENT_TYPES.COMBINED;
  const Icon = typeInfo.icon;
  const isPending = assessment.status === "PENDING";
  const hasResult = !!assessment.result;
  const isExpired = assessment.status === "EXPIRED";

  const expiresDate = new Date(assessment.expiresAt);
  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Card className={isExpired ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${typeInfo.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{typeInfo.label}</CardTitle>
              <CardDescription>
                {assessment.language}
                {assessment.jobTitle && ` · ${assessment.jobTitle}`}
              </CardDescription>
            </div>
          </div>
          <AssessmentStatusBadge status={assessment.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending state — show instructions + CTA */}
        {isPending && (
          <>
            <p className="text-sm text-muted-foreground">
              {typeInfo.description}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>~{typeInfo.estimatedMinutes} minutes</span>
              <span className="text-muted-foreground">·</span>
              <span className={daysLeft <= 2 ? "text-red-600 font-medium" : ""}>
                {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
              </span>
            </div>
            <Link href={`/assess/${assessment.magicToken}`}>
              <Button className="w-full gap-2">
                Start Assessment <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </>
        )}

        {/* Scored/Reviewed state — show results */}
        {hasResult && assessment.result && (
          <AssessmentResults result={assessment.result} />
        )}

        {/* Submitted state — waiting */}
        {assessment.status === "SUBMITTED" && (
          <div className="rounded-lg border bg-muted/50 p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Your assessment has been submitted and is being scored by AI.
              Results will appear here shortly.
            </p>
          </div>
        )}

        {/* In Progress state */}
        {assessment.status === "IN_PROGRESS" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You have started this assessment. Continue where you left off.
            </p>
            <Link href={`/assess/${assessment.magicToken}`}>
              <Button variant="outline" className="w-full gap-2">
                Continue Assessment <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Expired state */}
        {isExpired && (
          <p className="text-sm text-muted-foreground">
            This assessment link has expired. Contact your recruiter for a new
            invitation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AssessmentResults({
  result,
}: {
  result: NonNullable<MockAssessment["result"]>;
}) {
  const cefrInfo = CEFR_INFO[result.cefrEstimation] || {
    label: result.cefrEstimation,
    color: "bg-gray-100 text-gray-800",
  };

  const getOverallColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 45) return "text-orange-600";
    return "text-red-600";
  };

  const scores = [
    { ...SCORING_DIMENSIONS[0], score: result.grammarScore },
    { ...SCORING_DIMENSIONS[1], score: result.vocabularyScore },
    { ...SCORING_DIMENSIONS[2], score: result.clarityScore },
    { ...SCORING_DIMENSIONS[3], score: result.fluencyScore },
    { ...SCORING_DIMENSIONS[4], score: result.customerHandlingScore },
  ];

  return (
    <div className="space-y-4">
      {/* Overall score + CEFR */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className={`text-3xl font-bold ${getOverallColor(result.overallScore)}`}>
            {result.overallScore}
          </div>
          <div className="text-xs text-muted-foreground">Overall</div>
        </div>
        <Separator orientation="vertical" className="h-12" />
        <div>
          <Badge className={cefrInfo.color}>{cefrInfo.label}</Badge>
          <p className="text-xs text-muted-foreground mt-1">
            Estimated CEFR Level
          </p>
        </div>
      </div>

      <Separator />

      {/* Sub-scores */}
      <div className="space-y-3">
        {scores.map((s) => (
          <ScoreBar
            key={s.key}
            label={s.label}
            description={s.description}
            score={s.score}
          />
        ))}
      </div>

      {/* Feedback */}
      {result.feedbackSummary && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-1">Feedback</h4>
            <p className="text-sm text-muted-foreground">
              {result.feedbackSummary}
            </p>
          </div>
        </>
      )}

      {/* Borderline notice */}
      {result.isBorderline && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-orange-800">
                Borderline Result — Improvement Track Available
              </h4>
              <p className="text-sm text-orange-700 mt-1">
                Your score falls in the borderline range (45–60). You are
                eligible for a 2-week micro-learning improvement track to
                strengthen your skills before reassessment.
              </p>
              <Link href="/dashboard/improvement">
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  View Improvement Tracks <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ASSESSMENT TYPE OVERVIEW CARDS
// ============================================

function AssessmentTypeCard({ type }: { type: string }) {
  const info = ASSESSMENT_TYPES[type];
  if (!info) return null;
  const Icon = info.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${info.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{info.label}</CardTitle>
            <CardDescription>~{info.estimatedMinutes} min</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{info.description}</p>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            What to expect
          </p>
          <ul className="space-y-1">
            {info.instructions.map((instruction, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-primary font-bold text-xs mt-0.5">
                  {i + 1}.
                </span>
                {instruction}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function AssessmentsPage() {
  const [activeTab, setActiveTab] = useState("my-assessments");

  // TODO: Replace with real API call filtered by candidate
  const assessments = MOCK_ASSESSMENTS;
  const pendingCount = assessments.filter(
    (a) => a.status === "PENDING" || a.status === "IN_PROGRESS"
  ).length;
  const completedCount = assessments.filter(
    (a) =>
      a.status === "SCORED" ||
      a.status === "REVIEWED" ||
      a.status === "SUBMITTED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Assessments</h1>
        <p className="text-muted-foreground">
          View your language assessments, take pending tests, and review your
          results.
        </p>
      </div>

      {/* Quick stats */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">
                  Pending Assessment{pendingCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">
                  Completed Assessment{completedCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Skill Validation</CardTitle>
          <CardDescription>
            Validate technical skills through AI interview sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/ai-interview">
            <Button variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Start Skill Validation
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-assessments">My Assessments</TabsTrigger>
          <TabsTrigger value="assessment-types">Assessment Types</TabsTrigger>
        </TabsList>

        {/* Tab: My Assessments */}
        <TabsContent value="my-assessments" className="space-y-4 mt-4">
          {assessments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  You don&apos;t have any assessments yet. When an HR manager
                  invites you to a language assessment, it will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            assessments.map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} />
            ))
          )}
        </TabsContent>

        {/* Tab: Assessment Types Overview */}
        <TabsContent value="assessment-types" className="mt-4">
          <div className="space-y-3 mb-4">
            <p className="text-sm text-muted-foreground">
              The platform supports the following assessment types. Each
              evaluates your language skills across 5 dimensions: grammar,
              vocabulary, clarity, fluency, and customer handling ability.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.keys(ASSESSMENT_TYPES).map((type) => (
              <AssessmentTypeCard key={type} type={type} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
