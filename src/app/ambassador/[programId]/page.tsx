"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Textarea } from "@client/components/ui/textarea";
import { Label } from "@client/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  Users,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trophy,
} from "lucide-react";

interface ProgramInfo {
  id: string;
  title: string;
  description?: string | null;
  cohort?: string | null;
  applicationDeadline?: string | Date | null;
  location?: string | null;
  country?: string | null;
  requirements?: string | null;
  perks?: string | null;
  status?: string | null;
  maxApplicants?: number | null;
}

type PageState = "loading" | "not-found" | "closed" | "form" | "submitting" | "success" | "error";

export default function AmbassadorApplyPage() {
  const params = useParams<{ programId: string }>();
  const programId = params.programId;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Form fields
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [university, setUniversity] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [motivation, setMotivation] = useState("");
  const [previousExperience, setPreviousExperience] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/ambassador/public/${programId}`)
      .then((r) => {
        if (r.status === 404) {
          setPageState("not-found");
          return null;
        }
        return r.json();
      })
      .then((data: ProgramInfo | null) => {
        if (!data) return;
        setProgram(data);
        if (data.status !== "OPEN") {
          setPageState("closed");
        } else {
          setPageState("form");
        }
      })
      .catch(() => setPageState("not-found"));
  }, [programId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cvFile) {
      setErrorMessage("Please upload your CV to continue.");
      return;
    }
    setErrorMessage("");
    setPageState("submitting");

    const fd = new FormData();
    fd.append("file", cvFile);
    if (university) fd.append("university", university);
    if (yearOfStudy) fd.append("yearOfStudy", yearOfStudy);
    if (motivation) fd.append("motivation", motivation);
    if (previousExperience) fd.append("previousExperience", previousExperience);

    try {
      const res = await fetch(`/api/ambassador/apply/${programId}`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        setPageState("success");
      } else {
        const body = await res.json() as { error?: string };
        setErrorMessage(body.error ?? "Submission failed. Please try again.");
        setPageState("error");
      }
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setPageState("error");
    }
  }

  function formatDeadline(d?: string | Date | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // ── Loading ──
  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // ── Not found ──
  if (pageState === "not-found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-700">Program not found</h1>
          <p className="text-slate-500 mt-2">This link may be expired or invalid.</p>
        </div>
      </div>
    );
  }

  // ── Closed ──
  if (pageState === "closed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm">
          <Trophy className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-700">
            {program?.title}
          </h1>
          <p className="text-slate-500 mt-2">
            This ambassador program is no longer accepting applications.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (pageState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Application submitted!
          </h1>
          <p className="text-slate-500">
            Thank you for applying to <strong>{program?.title}</strong>. We&apos;ll
            review your application and be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  // ── Error (after attempt) ──
  if (pageState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-700 mb-2">
            Submission failed
          </h1>
          <p className="text-slate-500 mb-6">{errorMessage}</p>
          <Button onClick={() => setPageState("form")} variant="outline">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // ── Application form ──
  const deadline = formatDeadline(program?.applicationDeadline);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Program header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                    Ambassador Program
                  </span>
                </div>
                <CardTitle className="text-2xl">{program?.title}</CardTitle>
                {program?.cohort && (
                  <Badge variant="secondary" className="mt-2">
                    {program.cohort}
                  </Badge>
                )}
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">
                Open
              </Badge>
            </div>
            {program?.description && (
              <CardDescription className="text-base mt-3 text-slate-600">
                {program.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {(program?.location || program?.country) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  {[program.location, program.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            {deadline && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Application deadline: {deadline}</span>
              </div>
            )}
            {program?.maxApplicants && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Limited to {program.maxApplicants} ambassadors</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requirements & Perks */}
        {(program?.requirements || program?.perks) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {program?.requirements && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">What we&apos;re looking for</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {program.requirements}
                  </p>
                </CardContent>
              </Card>
            )}
            {program?.perks && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">What you&apos;ll get</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {program.perks}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Application form */}
        <Card>
          <CardHeader>
            <CardTitle>Apply now</CardTitle>
            <CardDescription>
              Upload your CV and tell us a bit about yourself.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* CV Upload */}
              <div className="space-y-2">
                <Label htmlFor="cv-upload">
                  CV / Resume <span className="text-red-500">*</span>
                </Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    cvFile
                      ? "border-green-300 bg-green-50"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {cvFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium text-sm">{cvFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-slate-500 space-y-1">
                      <Upload className="h-8 w-8 mx-auto text-slate-400" />
                      <p className="text-sm font-medium">
                        Click to upload your CV
                      </p>
                      <p className="text-xs">PDF, DOCX or TXT — max 10 MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id="cv-upload"
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* University */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="university">University / School</Label>
                  <Input
                    id="university"
                    placeholder="e.g. University of Amsterdam"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year of study</Label>
                  <Input
                    id="year"
                    placeholder="e.g. 2nd year Bachelor"
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                  />
                </div>
              </div>

              {/* Motivation */}
              <div className="space-y-2">
                <Label htmlFor="motivation">
                  Why do you want to be a brand ambassador?
                </Label>
                <Textarea
                  id="motivation"
                  rows={4}
                  placeholder="Tell us what excites you about this program and how you'd represent the brand..."
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                />
              </div>

              {/* Previous experience */}
              <div className="space-y-2">
                <Label htmlFor="previous">
                  Previous brand ambassador experience (optional)
                </Label>
                <Textarea
                  id="previous"
                  rows={3}
                  placeholder="Any relevant ambassador, influencer, or brand representation experience..."
                  value={previousExperience}
                  onChange={(e) => setPreviousExperience(e.target.value)}
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMessage}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={pageState === "submitting"}
              >
                {pageState === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit application"
                )}
              </Button>

              <p className="text-xs text-slate-400 text-center">
                Your CV will be processed automatically. We&apos;ll contact you via
                the email address in your CV.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
