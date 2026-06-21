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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@client/components/ui/accordion";
import {
  CalendarDays,
  MapPin,
  Users,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trophy,
  Video,
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [university, setUniversity] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [motivation, setMotivation] = useState("");
  const [previousExperience, setPreviousExperience] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
    if (videoFile) fd.append("video", videoFile);
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
      <div className="dark min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
      </div>
    );
  }

  // ── Not found ──
  if (pageState === "not-found") {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white">Program not found</h1>
          <p className="text-neutral-400 mt-2">This link may be expired or invalid.</p>
        </div>
      </div>
    );
  }

  // ── Closed ──
  if (pageState === "closed") {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="text-center max-w-sm">
          <Trophy className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white">
            {program?.title}
          </h1>
          <p className="text-neutral-400 mt-2">
            This ambassador program is no longer accepting applications.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (pageState === "success") {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-white mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Application submitted!
          </h1>
          <p className="text-neutral-400">
            Thank you for applying to <strong className="text-white">{program?.title}</strong>. We&apos;ll
            review your application and be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  // ── Error (after attempt) ──
  if (pageState === "error") {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">
            Submission failed
          </h1>
          <p className="text-neutral-400 mb-6">{errorMessage}</p>
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
    <div className="dark min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 bg-black">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <a
            href="https://adidas-pool.vercel.app/welcome"
            className="inline-flex transition-opacity hover:opacity-80"
          >
            <img src="/adidas-logo.svg" alt="adidas" className="h-7 w-auto" />
          </a>
        </div>
      </header>
      <div className="max-w-2xl mx-auto space-y-6 py-12 px-4">
        {/* Program header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-5 w-5 text-white" />
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-[0.2em]">
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
              <Badge className="bg-neutral-800 text-neutral-200 border-neutral-700 shrink-0">
                Open
              </Badge>
            </div>
            {program?.description && (
              <CardDescription className="text-base mt-3 text-neutral-400">
                {program.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-400">
            {(program?.location || program?.country) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-neutral-500 shrink-0" />
                <span>
                  {[program.location, program.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            {deadline && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-neutral-500 shrink-0" />
                <span>Application deadline: {deadline}</span>
              </div>
            )}
            {program?.maxApplicants && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-neutral-500 shrink-0" />
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
                  <p className="text-sm text-neutral-400 whitespace-pre-line">
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
                  <p className="text-sm text-neutral-400 whitespace-pre-line">
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
                      ? "border-white/40 bg-neutral-800"
                      : "border-neutral-700 hover:border-neutral-500"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {cvFile ? (
                    <div className="flex items-center justify-center gap-2 text-white">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium text-sm">{cvFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-neutral-400 space-y-1">
                      <Upload className="h-8 w-8 mx-auto text-neutral-500" />
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

              {/* Pitch Video */}
              <div className="space-y-2">
                <Label htmlFor="video-upload">
                  Pitch video{" "}
                  <span className="text-neutral-500 font-normal">(optional — 1 min max)</span>
                </Label>
                <p className="text-xs text-neutral-500">
                  Record a short 60-second clip introducing yourself and why you&apos;d make a great ambassador. Helps us see your communication style.
                </p>
                <div
                  className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                    videoFile
                      ? "border-white/40 bg-neutral-800"
                      : "border-neutral-700 hover:border-neutral-500"
                  }`}
                  onClick={() => videoInputRef.current?.click()}
                >
                  {videoFile ? (
                    <div className="flex items-center justify-center gap-2 text-white">
                      <Video className="h-5 w-5" />
                      <span className="font-medium text-sm">{videoFile.name}</span>
                      <span className="text-xs text-neutral-400">
                        ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="text-neutral-400 space-y-1">
                      <Video className="h-8 w-8 mx-auto text-neutral-500" />
                      <p className="text-sm font-medium">Click to upload your pitch video</p>
                      <p className="text-xs">MP4, WebM or MOV — max 100 MB · 1 min recommended</p>
                    </div>
                  )}
                </div>
                <input
                  ref={videoInputRef}
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  className="hidden"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-red-400 flex items-center gap-2">
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

              <p className="text-xs text-neutral-500 text-center">
                Your CV will be processed automatically. We&apos;ll contact you via
                the email address in your CV.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Frequently asked questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger className="text-sm font-medium text-left">
                  How much time will I need to commit?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-400">
                  We respect your exams and your schedule. The program is flexible, but we recommend
                  dedicating 3–5 hours per week to stay engaged with your community and tasks.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q2">
                <AccordionTrigger className="text-sm font-medium text-left">
                  Where is the program located?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-400">
                  Our 2026 pilot program is specifically focused on the Porto/Maia ecosystem,
                  targeting students from universities such as UP, IPP, and others.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q3">
                <AccordionTrigger className="text-sm font-medium text-left">
                  Will I receive training?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-400">
                  Yes. Every ambassador begins with a Bootcamp Day at the Porto Hub, covering brand
                  history, content creation workshops, and a deep dive into our corporate culture.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q4">
                <AccordionTrigger className="text-sm font-medium text-left">
                  What are the benefits of being an adidas Student Ambassador?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-400 space-y-3">
                  <p>
                    This program provides a premier platform for students to gain high-value
                    professional experience without compromising their academic priorities. Designed
                    with total flexibility and no rigid hours, the program allows participants to
                    sharpen their skill sets, boost their visibility, and build the core competencies
                    required to excel in the modern job market.
                  </p>
                  <p>
                    Ambassadors will follow an exclusive learning roadmap, gaining deep insights into
                    the inner workings of adidas and the global textile industry. Through this
                    journey, they will connect with seasoned industry experts, expand their
                    professional circles, and gain valuable exposure within a world-leading brand.
                    Additionally, specialised workshops focused on advanced communication will
                    provide the tools necessary to accelerate their long-term career trajectories.
                  </p>
                  <p>
                    To conclude the experience, every participant will receive an official certificate
                    of completion, serving as a distinguished credential to strengthen their
                    professional portfolio and résumé.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
