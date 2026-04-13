"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

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

          {/* CV download */}
          {c.rawCvUrl && (
            <div className="mt-4">
              <a
                href={`/api/upload/download?url=${encodeURIComponent(c.rawCvUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" /> Download Original CV
                </Button>
              </a>
            </div>
          )}

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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {(!c.skills || c.skills.length === 0) ? (
                <p className="text-sm text-muted-foreground">
                  No skills data available.
                </p>
              ) : (
                <div className="space-y-2">
                  {c.skills.map((skill: any, i: number) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <Badge variant="secondary">
                        {skill.name}
                        {skill.category && (
                          <span className="ml-1 text-muted-foreground">
                            ({skill.category})
                          </span>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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

      {/* ── Job Matches ─────────────────────────────────────────── */}
      {c.jobMatches && c.jobMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Job Matches ({c.jobMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {c.jobMatches.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {m.job?.title || "Unknown Job"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.job?.location || ""}{" "}
                      {m.job?.department && `· ${m.job.department}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={m.matchScore}
                      className="h-2 w-20"
                    />
                    <span className="text-sm font-bold tabular-nums">
                      {m.matchScore}%
                    </span>
                  </div>
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
