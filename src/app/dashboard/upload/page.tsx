"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Briefcase,
  GraduationCap,
  Languages,
  Sparkles,
  User,
  Pencil,
  Save,
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  FileUp,
  FileSignature,
  Clock,
} from "lucide-react";

import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { Input } from "@client/components/ui/input";
import { Separator } from "@client/components/ui/separator";
import { Progress } from "@client/components/ui/progress";
import { Textarea } from "@client/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@client/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import { useRole } from "@client/components/providers/role-provider";
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
import HrBulkUpload from "./hr-bulk-upload";

// ─── Types ───────────────────────────────────────────────────────

interface ExtractionExperience {
  jobTitle: string;
  company?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
}

interface ExtractionEducation {
  institution?: string | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  level?: string | null;
}

interface ExtractionLanguage {
  language: string;
  level?: string | null;
}

interface ExtractionSkill {
  name: string;
  category?: string | null;
}

interface CvExtraction {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  country?: string | null;
  linkedinUrl?: string | null;
  experiences: ExtractionExperience[];
  education: ExtractionEducation[];
  languages: ExtractionLanguage[];
  skills: ExtractionSkill[];
}

interface UploadResult {
  candidateId: string;
  status: "created" | "updated";
  extraction: CvExtraction;
  isDuplicate: boolean;
  duplicateOf: string | null;
  rawCvUrl: string;
}

type UploadState = "idle" | "uploading" | "success" | "error";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_SIZE_MB = 10;
const LS_CV_DATA = "cv-upload-data";
const LS_CV_META = "cv-upload-meta";
const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const LS_ML_DATA = "ml-upload-data"; // motivation letter
const LS_LA_DATA = "la-upload-data"; // learning agreement

const EUROPEAN_LANGUAGES = [
  "Albanian", "Armenian", "Azerbaijani", "Basque", "Belarusian",
  "Bosnian", "Breton", "Bulgarian", "Catalan", "Croatian", "Czech",
  "Danish", "Dutch", "English", "Estonian", "Finnish", "French",
  "Galician", "Georgian", "German", "Greek", "Hungarian", "Icelandic",
  "Irish", "Italian", "Kazakh", "Latvian", "Lithuanian", "Luxembourgish",
  "Macedonian", "Maltese", "Moldovan", "Montenegrin", "Norwegian",
  "Polish", "Portuguese", "Romanian", "Russian", "Scottish Gaelic",
  "Serbian", "Slovak", "Slovenian", "Spanish", "Swedish", "Turkish",
  "Ukrainian", "Welsh",
] as const;

// ─── Component ───────────────────────────────────────────────────

export default function UploadPage() {
  const { role } = useRole();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedExtraction, setEditedExtraction] = useState<CvExtraction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ─── Candidate ID (from /api/me) ────────────────────────────
  const [candidateId, setCandidateId] = useState<string | null>(null);

  // ─── Tab 2 — Motivation Letter ──────────────────────────────
  const [mlFile, setMlFile] = useState<File | null>(null);
  const [mlUploadState, setMlUploadState] = useState<UploadState>("idle");
  const [mlProgress, setMlProgress] = useState(0);
  const [mlErrorMessage, setMlErrorMessage] = useState("");
  const [mlText, setMlText] = useState("");
  const [mlUrl, setMlUrl] = useState<string | null>(null);
  const [mlFileName, setMlFileName] = useState<string | null>(null);
  const [mlSaving, setMlSaving] = useState(false);
  const [mlDragActive, setMlDragActive] = useState(false);

  // ─── Tab 3 — Learning Agreement ─────────────────────────────
  const [laFile, setLaFile] = useState<File | null>(null);
  const [laUploadState, setLaUploadState] = useState<UploadState>("idle");
  const [laProgress, setLaProgress] = useState(0);
  const [laErrorMessage, setLaErrorMessage] = useState("");
  const [laUrl, setLaUrl] = useState<string | null>(null);
  const [laFileName, setLaFileName] = useState<string | null>(null);
  const [laFileType, setLaFileType] = useState<string | null>(null);
  const [laUploadedAt, setLaUploadedAt] = useState<string | null>(null);
  const [laDragActive, setLaDragActive] = useState(false);

  // Restore persisted data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_CV_DATA);
      if (stored) {
        const data: UploadResult = JSON.parse(stored);
        setResult(data);
        setUploadState("success");
      }
    } catch {
      /* ignore corrupted data */
    }
  }, []);

  // Persist data on successful upload
  useEffect(() => {
    if (uploadState === "success" && result) {
      localStorage.setItem(LS_CV_DATA, JSON.stringify(result));
    }
  }, [uploadState, result]);

  // Fetch candidateId + restore saved motivation letter / learning agreement
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setCandidateId(data.id);
          // Restore motivation letter text from server
          if (data.motivationLetterText) {
            setMlText(data.motivationLetterText);
            setMlUrl(data.motivationLetterUrl ?? null);
            setMlUploadState("success");
          }
          // Restore learning agreement from server
          if (data.learningAgreementUrl) {
            setLaUrl(data.learningAgreementUrl);
            setLaUploadState("success");
          }
        }
      } catch { /* ignore */ }

      // Restore ML metadata from localStorage
      try {
        const stored = localStorage.getItem(LS_ML_DATA);
        if (stored) {
          const meta = JSON.parse(stored);
          if (meta.fileName) setMlFileName(meta.fileName);
          if (meta.url) setMlUrl(meta.url);
          if (meta.text && !mlText) {
            setMlText(meta.text);
            setMlUploadState("success");
          }
        }
      } catch { /* ignore */ }

      // Restore LA metadata from localStorage
      try {
        const stored = localStorage.getItem(LS_LA_DATA);
        if (stored) {
          const meta = JSON.parse(stored);
          if (meta.fileName) setLaFileName(meta.fileName);
          if (meta.fileType) setLaFileType(meta.fileType);
          if (meta.uploadedAt) setLaUploadedAt(meta.uploadedAt);
          if (meta.url) setLaUrl(meta.url);
          if (meta.url) setLaUploadState("success");
        }
      } catch { /* ignore */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForReupload = useCallback(() => {
    setUploadState("idle");
    setSelectedFile(null);
    setErrorMessage("");
    setProgress(0);
    setIsEditing(false);
    setEditedExtraction(null);
    // Keep result & localStorage — we'll pass candidateId to the upload
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload a PDF, DOCX, or TXT file.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSelectedFile(file);
    setUploadState("idle");
    setResult(null);
    setErrorMessage("");
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so re-selecting the same file works
    e.target.value = "";
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploadState("uploading");
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Always target the current profile candidate when available.
      // Fall back to last upload candidateId for re-uploads.
      const candidateIdToUpdate = candidateId ?? result?.candidateId;
      if (candidateIdToUpdate) {
        formData.append("candidateId", candidateIdToUpdate);
      }

      // Simulate progress (actual upload is one request)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 8, 85));
      }, 500);

      const response = await fetch("/api/upload/candidate", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data: UploadResult = await response.json();
      setProgress(100);
      setResult(data);
      setUploadState("success");
      toast.success("CV parsed successfully!");

      // Save upload metadata for dashboard
      localStorage.setItem(
        LS_CV_META,
        JSON.stringify({
          fileName: selectedFile.name,
          uploadedAt: new Date().toISOString(),
          candidateId: data.candidateId,
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMessage(msg);
      setUploadState("error");
      setProgress(0);
      toast.error(msg);
    }
  };

  // ─── Motivation Letter handlers ────────────────────────────────

  const validateMlFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload a PDF, DOCX, or TXT file.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum: ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleMlFile = (file: File) => {
    const error = validateMlFile(file);
    if (error) { toast.error(error); return; }
    setMlFile(file);
    setMlUploadState("idle");
    setMlErrorMessage("");
  };

  const uploadMotivationLetter = async () => {
    if (!mlFile) return;
    setMlUploadState("uploading");
    setMlProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", mlFile);
      if (candidateId) formData.append("candidateId", candidateId);

      const progressInterval = setInterval(() => {
        setMlProgress((p) => Math.min(p + 10, 85));
      }, 400);

      const res = await fetch("/api/upload/motivation-letter", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setMlProgress(100);
      setMlUrl(data.url);
      setMlFileName(mlFile.name);
      setMlText(data.extractedText || "");
      setMlUploadState("success");

      localStorage.setItem(
        LS_ML_DATA,
        JSON.stringify({
          url: data.url,
          fileName: mlFile.name,
          text: data.extractedText || "",
          uploadedAt: new Date().toISOString(),
        })
      );
      toast.success("Motivation letter uploaded!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setMlErrorMessage(msg);
      setMlUploadState("error");
      setMlProgress(0);
      toast.error(msg);
    }
  };

  const saveMotivationLetterText = async () => {
    if (!candidateId) {
      toast.error("No candidate profile found. Please upload your CV first.");
      return;
    }
    setMlSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivationLetterText: mlText || null,
          motivationLetterUrl: mlUrl || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      // Update localStorage
      const stored = localStorage.getItem(LS_ML_DATA);
      const meta = stored ? JSON.parse(stored) : {};
      localStorage.setItem(LS_ML_DATA, JSON.stringify({ ...meta, text: mlText }));
      toast.success("Motivation letter saved!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setMlSaving(false);
    }
  };

  // ─── Learning Agreement handlers ───────────────────────────────

  const handleLaFile = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Please upload a PDF or DOCX file.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum: ${MAX_SIZE_MB}MB.`);
      return;
    }
    setLaFile(file);
    setLaUploadState("idle");
    setLaErrorMessage("");
  };

  const uploadLearningAgreement = async () => {
    if (!laFile) return;
    setLaUploadState("uploading");
    setLaProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", laFile);
      if (candidateId) formData.append("candidateId", candidateId);

      const progressInterval = setInterval(() => {
        setLaProgress((p) => Math.min(p + 12, 85));
      }, 400);

      const res = await fetch("/api/upload/learning-agreement", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setLaProgress(100);
      setLaUrl(data.url);
      setLaFileName(laFile.name);
      setLaFileType(laFile.type === "application/pdf" ? "PDF" : "DOCX");
      const now = new Date().toISOString();
      setLaUploadedAt(now);
      setLaUploadState("success");

      localStorage.setItem(
        LS_LA_DATA,
        JSON.stringify({
          url: data.url,
          fileName: laFile.name,
          fileType: laFile.type === "application/pdf" ? "PDF" : "DOCX",
          uploadedAt: now,
        })
      );
      toast.success("Learning agreement uploaded!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setLaErrorMessage(msg);
      setLaUploadState("error");
      setLaProgress(0);
      toast.error(msg);
    }
  };

  // ─── HR view — Bulk CV Upload ──────────────────────────────────

  if (role === "hr") {
    return <HrBulkUpload />;
  }

  // ─── Candidate view ───────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents Upload</h1>
        <p className="text-muted-foreground">
          Upload your documents. Supported formats vary by document type.
        </p>
      </div>

      {/* 3-Tab Layout */}
      <Tabs defaultValue="cv" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="cv" className="gap-2">
            <FileUp className="h-4 w-4" />
            Upload CV
          </TabsTrigger>
          <TabsTrigger value="motivation-letter" className="gap-2">
            <FileSignature className="h-4 w-4" />
            Motivation Letter
          </TabsTrigger>
          <TabsTrigger value="learning-agreement" className="gap-2">
            <FileText className="h-4 w-4" />
            Learning Agreement
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Upload CV ═══ */}
        <TabsContent value="cv">
          <Card>
            <CardContent className="p-6">
              {uploadState === "success" && result ? (
                // ── Parsed Result Preview ──
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">CV Parsed Successfully</h3>
                        <p className="text-sm text-muted-foreground">
                          {result.status === "created"
                            ? "Your profile has been created."
                            : "Your profile has been updated with the new CV."}
                        </p>
                        {(() => {
                          try {
                            const meta = localStorage.getItem(LS_CV_META);
                            if (meta) {
                              const { fileName, uploadedAt } = JSON.parse(meta);
                              return (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                  <FileText className="h-3 w-3" />
                                  {fileName} &middot;{" "}
                                  {new Date(uploadedAt).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              );
                            }
                          } catch { /* ignore */ }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditing(false);
                              setEditedExtraction(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={isSaving}
                            onClick={async () => {
                              if (!editedExtraction || !result) return;
                              setIsSaving(true);
                              try {
                                const rawLinkedin = editedExtraction.linkedinUrl?.trim() || null;
                                const normalizedLinkedin = rawLinkedin && !rawLinkedin.startsWith("http")
                                  ? `https://${rawLinkedin}`
                                  : rawLinkedin;
                                const payload: Record<string, unknown> = {
                                  firstName: editedExtraction.firstName || undefined,
                                  lastName: editedExtraction.lastName || undefined,
                                  email: editedExtraction.email || null,
                                  phone: editedExtraction.phone || null,
                                  location: editedExtraction.location || null,
                                  country: editedExtraction.country || null,
                                  linkedinUrl: normalizedLinkedin,
                                };
                                Object.keys(payload).forEach((k) => {
                                  if (payload[k] === undefined) delete payload[k];
                                });
                                const fullPayload = {
                                  ...payload,
                                  experiences: editedExtraction.experiences.map(
                                    (exp) => ({
                                      jobTitle: exp.jobTitle,
                                      company: exp.company || null,
                                      location: exp.location || null,
                                      startDate: exp.startDate || null,
                                      endDate: exp.endDate || null,
                                      isCurrent: exp.isCurrent,
                                      description: exp.description || null,
                                    })
                                  ),
                                  education: editedExtraction.education.map(
                                    (edu) => ({
                                      institution: edu.institution || null,
                                      degree: edu.degree || null,
                                      fieldOfStudy: edu.fieldOfStudy || null,
                                      startDate: edu.startDate || null,
                                      endDate: edu.endDate || null,
                                      level: edu.level || null,
                                    })
                                  ),
                                  languages: editedExtraction.languages.map(
                                    (lang) => ({
                                      language: lang.language,
                                      selfDeclaredLevel: lang.level || null,
                                    })
                                  ),
                                  skills: editedExtraction.skills.map(
                                    (skill) => ({
                                      name: skill.name,
                                      category: skill.category || null,
                                    })
                                  ),
                                };
                                const res = await fetch(
                                  `/api/candidates/${result.candidateId}`,
                                  {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(fullPayload),
                                  }
                                );
                                if (!res.ok) {
                                  const errorData = await res.json().catch(() => null);
                                  console.error("[Save] Server error:", errorData);
                                  const detail = errorData?.details
                                    ? JSON.stringify(errorData.details)
                                    : errorData?.error || "Failed to save";
                                  throw new Error(detail);
                                }
                                const updatedResult = {
                                  ...result,
                                  extraction: editedExtraction,
                                };
                                setResult(updatedResult);
                                localStorage.setItem(
                                  LS_CV_DATA,
                                  JSON.stringify(updatedResult)
                                );
                                setIsEditing(false);
                                setEditedExtraction(null);
                                toast.success("Changes saved successfully!");
                              } catch (err) {
                                const msg = err instanceof Error ? err.message : "Failed to save";
                                toast.error(msg);
                              } finally {
                                setIsSaving(false);
                              }
                            }}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsEditing(true);
                              setEditedExtraction(
                                structuredClone(result.extraction)
                              );
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetForReupload}
                          >
                            Replace CV
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <ExtractionPreview
                    extraction={
                      isEditing && editedExtraction
                        ? editedExtraction
                        : result.extraction
                    }
                    isEditing={isEditing}
                    onUpdate={setEditedExtraction}
                  />
                </div>
              ) : (
                // ── Drop Zone ──
                <div className="space-y-4">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    } ${uploadState === "uploading" ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
                    onClick={() =>
                      uploadState !== "uploading" &&
                      document.getElementById("cv-file-input")?.click()
                    }
                  >
                    <input
                      id="cv-file-input"
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={handleFileInput}
                    />

                    {uploadState === "uploading" ? (
                      <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                    ) : (
                      <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    )}

                    <p className="text-sm font-medium">
                      {dragActive
                        ? "Drop your CV here"
                        : "Drag & drop your CV, or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, or TXT — up to {MAX_SIZE_MB}MB
                    </p>
                  </div>

                  {selectedFile && uploadState !== "uploading" && (
                    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button onClick={uploadFile} size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload & Parse
                        </Button>
                      </div>
                    </div>
                  )}

                  {uploadState === "uploading" && (
                    <div className="space-y-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">
                        {progress < 30
                          ? "Uploading file..."
                          : progress < 70
                            ? "Extracting text from CV..."
                            : "Parsing with AI... this may take a few seconds"}
                      </p>
                    </div>
                  )}

                  {uploadState === "error" && (
                    <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">
                          Upload failed
                        </p>
                        <p className="text-xs text-destructive/80">
                          {errorMessage}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUploadState("idle");
                          setErrorMessage("");
                        }}
                      >
                        Try again
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab 2: Motivation Letter ═══ */}
        <TabsContent value="motivation-letter">
          <Card>
            <CardContent className="p-6">
              {mlUploadState === "success" && mlText !== "" ? (
                // ── Uploaded — Show editable text area ──
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Motivation Letter</h3>
                        <p className="text-sm text-muted-foreground">
                          {mlFileName
                            ? `Uploaded: ${mlFileName}`
                            : "Your motivation letter text is loaded below."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMlUploadState("idle");
                          setMlFile(null);
                          setMlText("");
                          setMlUrl(null);
                          setMlFileName(null);
                          localStorage.removeItem(LS_ML_DATA);
                        }}
                      >
                        Replace
                      </Button>
                      <Button
                        size="sm"
                        disabled={mlSaving}
                        onClick={saveMotivationLetterText}
                      >
                        {mlSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Edit your motivation letter
                    </label>
                    <Textarea
                      value={mlText}
                      onChange={(e) => setMlText(e.target.value)}
                      className="min-h-[300px] text-sm leading-relaxed"
                      placeholder="Your motivation letter text..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {mlText.length} characters
                    </p>
                  </div>
                </div>
              ) : (
                // ── Drop Zone ──
                <div className="space-y-4">
                  <div
                    onDrop={(e) => {
                      e.preventDefault();
                      setMlDragActive(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleMlFile(file);
                    }}
                    onDragOver={(e) => { e.preventDefault(); setMlDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setMlDragActive(false); }}
                    className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                      mlDragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    } ${mlUploadState === "uploading" ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
                    onClick={() =>
                      mlUploadState !== "uploading" &&
                      document.getElementById("ml-file-input")?.click()
                    }
                  >
                    <input
                      id="ml-file-input"
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMlFile(file);
                        e.target.value = "";
                      }}
                    />

                    {mlUploadState === "uploading" ? (
                      <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                    ) : (
                      <FileSignature className="h-10 w-10 text-muted-foreground mb-3" />
                    )}

                    <p className="text-sm font-medium">
                      {mlDragActive
                        ? "Drop your motivation letter here"
                        : "Drag & drop your motivation letter, or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, or TXT — up to {MAX_SIZE_MB}MB
                    </p>
                  </div>

                  {mlFile && mlUploadState !== "uploading" && (
                    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{mlFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(mlFile.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMlFile(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button onClick={uploadMotivationLetter} size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload & Extract Text
                        </Button>
                      </div>
                    </div>
                  )}

                  {mlUploadState === "uploading" && (
                    <div className="space-y-2">
                      <Progress value={mlProgress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">
                        {mlProgress < 50
                          ? "Uploading file..."
                          : "Extracting text..."}
                      </p>
                    </div>
                  )}

                  {mlUploadState === "error" && (
                    <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">Upload failed</p>
                        <p className="text-xs text-destructive/80">{mlErrorMessage}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setMlUploadState("idle"); setMlErrorMessage(""); }}
                      >
                        Try again
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab 3: Learning Agreement ═══ */}
        <TabsContent value="learning-agreement">
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 mb-4 dark:border-blue-900 dark:bg-blue-950/40">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              The learning agreement is only required for <strong>Erasmus internship</strong> applications.
              If you are not applying for an internship, you can skip this section.
            </p>
          </div>
          <Card>
            <CardContent className="p-6">
              {laUploadState === "success" && (laFileName || laUrl) ? (
                // ── Uploaded — Show metadata ──
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Learning Agreement Uploaded</h3>
                        <p className="text-sm text-muted-foreground">
                          Your learning agreement has been stored successfully.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLaUploadState("idle");
                        setLaFile(null);
                        setLaUrl(null);
                        setLaFileName(null);
                        setLaFileType(null);
                        setLaUploadedAt(null);
                        localStorage.removeItem(LS_LA_DATA);
                      }}
                    >
                      Replace
                    </Button>
                  </div>

                  <Separator />

                  <div className="rounded-lg border bg-muted/30 p-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">File Name</p>
                          <p className="text-sm font-medium">{laFileName || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-0.5">
                          {laFileType || "—"}
                        </Badge>
                        <div>
                          <p className="text-xs text-muted-foreground">File Type</p>
                          <p className="text-sm font-medium">{laFileType || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Uploaded At</p>
                          <p className="text-sm font-medium">
                            {laUploadedAt
                              ? new Date(laUploadedAt).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {laUrl && (
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <a href={laUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-2" />
                          View Document
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                // ── Drop Zone ──
                <div className="space-y-4">
                  <div
                    onDrop={(e) => {
                      e.preventDefault();
                      setLaDragActive(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleLaFile(file);
                    }}
                    onDragOver={(e) => { e.preventDefault(); setLaDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setLaDragActive(false); }}
                    className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                      laDragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    } ${laUploadState === "uploading" ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
                    onClick={() =>
                      laUploadState !== "uploading" &&
                      document.getElementById("la-file-input")?.click()
                    }
                  >
                    <input
                      id="la-file-input"
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLaFile(file);
                        e.target.value = "";
                      }}
                    />

                    {laUploadState === "uploading" ? (
                      <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                    ) : (
                      <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    )}

                    <p className="text-sm font-medium">
                      {laDragActive
                        ? "Drop your learning agreement here"
                        : "Drag & drop your learning agreement, or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF or DOCX — up to {MAX_SIZE_MB}MB
                    </p>
                  </div>

                  {laFile && laUploadState !== "uploading" && (
                    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{laFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(laFile.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLaFile(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button onClick={uploadLearningAgreement} size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  )}

                  {laUploadState === "uploading" && (
                    <div className="space-y-2">
                      <Progress value={laProgress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">
                        Uploading file...
                      </p>
                    </div>
                  )}

                  {laUploadState === "error" && (
                    <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">Upload failed</p>
                        <p className="text-xs text-destructive/80">{laErrorMessage}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setLaUploadState("idle"); setLaErrorMessage(""); }}
                      >
                        Try again
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Extraction Preview Sub-component ────────────────────────────

interface ExtractionPreviewProps {
  extraction: CvExtraction;
  isEditing: boolean;
  onUpdate: (updated: CvExtraction) => void;
}

function ExtractionPreview({
  extraction,
  isEditing,
  onUpdate,
}: ExtractionPreviewProps) {
  const updateField = (field: keyof CvExtraction, value: unknown) => {
    onUpdate({ ...extraction, [field]: value });
  };

  const updateExperience = (
    index: number,
    updates: Partial<ExtractionExperience>
  ) => {
    const exps = [...extraction.experiences];
    exps[index] = { ...exps[index], ...updates };
    onUpdate({ ...extraction, experiences: exps });
  };

  const updateEducation = (
    index: number,
    updates: Partial<ExtractionEducation>
  ) => {
    const edus = [...extraction.education];
    edus[index] = { ...edus[index], ...updates };
    onUpdate({ ...extraction, education: edus });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isEditing ? (
            <div className="space-y-3">
              <EditableField
                label="First Name"
                value={extraction.firstName}
                onChange={(v) => updateField("firstName", v)}
              />
              <EditableField
                label="Last Name"
                value={extraction.lastName}
                onChange={(v) => updateField("lastName", v)}
              />
              <EditableField
                label="Email"
                value={extraction.email ?? ""}
                onChange={(v) => updateField("email", v || null)}
              />
              <EditableField
                label="Phone"
                value={extraction.phone ?? ""}
                onChange={(v) => updateField("phone", v || null)}
              />
              <EditableField
                label="Location"
                value={extraction.location ?? ""}
                onChange={(v) => updateField("location", v || null)}
              />
              <EditableField
                label="Country"
                value={extraction.country ?? ""}
                onChange={(v) => updateField("country", v || null)}
              />
              <EditableField
                label="LinkedIn URL"
                value={extraction.linkedinUrl ?? ""}
                onChange={(v) => updateField("linkedinUrl", v || null)}
              />
            </div>
          ) : (
            <>
              <InfoRow
                label="Name"
                value={`${extraction.firstName} ${extraction.lastName}`}
              />
              {extraction.email && (
                <InfoRow label="Email" value={extraction.email} />
              )}
              {extraction.phone && (
                <InfoRow label="Phone" value={extraction.phone} />
              )}
              {extraction.location && (
                <InfoRow label="Location" value={extraction.location} />
              )}
              {extraction.country && (
                <InfoRow label="Country" value={extraction.country} />
              )}
              {extraction.linkedinUrl && (
                <InfoRow
                  label="LinkedIn"
                  value={extraction.linkedinUrl}
                  isLink
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Languages ({extraction.languages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extraction.languages.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {extraction.languages.map((lang, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {lang.language}
                  {lang.level && (
                    <span className="ml-1 opacity-70">({lang.level})</span>
                  )}
                  {isEditing && (
                    <button
                      onClick={() =>
                        onUpdate({
                          ...extraction,
                          languages: extraction.languages.filter(
                            (_, idx) => idx !== i
                          ),
                        })
                      }
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No languages found</p>
          )}
          {isEditing && (
            <AddLanguageInput
              existingLanguages={extraction.languages.map((l) => l.language)}
              onAdd={(lang, level) =>
                onUpdate({
                  ...extraction,
                  languages: [
                    ...extraction.languages,
                    { language: lang, level: level || null },
                  ],
                })
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Experience */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Work Experience ({extraction.experiences.length})
            {isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={() =>
                  onUpdate({
                    ...extraction,
                    experiences: [
                      ...extraction.experiences,
                      { jobTitle: "", isCurrent: false },
                    ],
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extraction.experiences.length > 0 ? (
            <div className="space-y-4">
              {extraction.experiences.map((exp, i) =>
                isEditing ? (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div className="grid grid-cols-2 gap-2 flex-1 mr-2">
                        <EditableField
                          label="Job Title"
                          value={exp.jobTitle}
                          onChange={(v) =>
                            updateExperience(i, { jobTitle: v })
                          }
                        />
                        <EditableField
                          label="Company"
                          value={exp.company ?? ""}
                          onChange={(v) =>
                            updateExperience(i, { company: v || null })
                          }
                        />
                        <EditableField
                          label="Location"
                          value={exp.location ?? ""}
                          onChange={(v) =>
                            updateExperience(i, { location: v || null })
                          }
                        />
                        <EditableField
                          label="Start Date"
                          value={exp.startDate ?? ""}
                          onChange={(v) =>
                            updateExperience(i, { startDate: v || null })
                          }
                        />
                        <EditableField
                          label="End Date"
                          value={
                            exp.isCurrent
                              ? "Present"
                              : (exp.endDate ?? "")
                          }
                          onChange={(v) =>
                            updateExperience(i, {
                              endDate:
                                v.toLowerCase() === "present"
                                  ? null
                                  : (v || null),
                              isCurrent: v.toLowerCase() === "present",
                            })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive/70 hover:text-destructive"
                        onClick={() =>
                          onUpdate({
                            ...extraction,
                            experiences: extraction.experiences.filter(
                              (_, idx) => idx !== i
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="flex gap-3 pb-4 last:pb-0 border-b last:border-0"
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{exp.jobTitle}</p>
                      {exp.company && (
                        <p className="text-xs text-muted-foreground">
                          {exp.company}
                          {exp.location && ` · ${exp.location}`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {exp.startDate ?? "?"} —{" "}
                        {exp.isCurrent
                          ? "Present"
                          : (exp.endDate ?? "?")}
                      </p>
                      {exp.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No work experience found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Education ({extraction.education.length})
            {isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={() =>
                  onUpdate({
                    ...extraction,
                    education: [
                      ...extraction.education,
                      {
                        institution: null,
                        degree: null,
                        fieldOfStudy: null,
                        startDate: null,
                        endDate: null,
                        level: null,
                      },
                    ],
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extraction.education.length > 0 ? (
            <div className="space-y-3">
              {extraction.education.map((edu, i) =>
                isEditing ? (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div className="grid grid-cols-2 gap-2 flex-1 mr-2">
                        <EditableField
                          label="Degree"
                          value={edu.degree ?? ""}
                          onChange={(v) =>
                            updateEducation(i, { degree: v || null })
                          }
                        />
                        <EditableField
                          label="Field of Study"
                          value={edu.fieldOfStudy ?? ""}
                          onChange={(v) =>
                            updateEducation(i, { fieldOfStudy: v || null })
                          }
                        />
                        <EditableField
                          label="Institution"
                          value={edu.institution ?? ""}
                          onChange={(v) =>
                            updateEducation(i, { institution: v || null })
                          }
                        />
                        <EditableField
                          label="Level"
                          value={edu.level ?? ""}
                          onChange={(v) =>
                            updateEducation(i, { level: v || null })
                          }
                        />
                        <EditableField
                          label="Start"
                          value={edu.startDate ?? ""}
                          onChange={(v) =>
                            updateEducation(i, { startDate: v || null })
                          }
                        />
                        <EditableField
                          label="End"
                          value={edu.endDate ?? ""}
                          onChange={(v) =>
                            updateEducation(i, { endDate: v || null })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive/70 hover:text-destructive"
                        onClick={() =>
                          onUpdate({
                            ...extraction,
                            education: extraction.education.filter(
                              (_, idx) => idx !== i
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {edu.degree ?? edu.fieldOfStudy ?? "Education"}
                      {edu.level && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {edu.level === "VOCATIONAL" ? "Certificate"
                            : edu.level === "OTHER" ? "Course"
                            : edu.level === "HIGH_SCHOOL" ? "High School"
                            : edu.level}
                        </Badge>
                      )}
                    </p>
                    {edu.institution && (
                      <p className="text-xs text-muted-foreground">
                        {edu.institution}
                      </p>
                    )}
                    {(edu.startDate || edu.endDate) && (
                      <p className="text-xs text-muted-foreground">
                        {edu.startDate ?? "?"} — {edu.endDate ?? "?"}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No education found</p>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Skills ({extraction.skills.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extraction.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {extraction.skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs gap-1">
                  {skill.name}
                  {isEditing && (
                    <button
                      onClick={() =>
                        onUpdate({
                          ...extraction,
                          skills: extraction.skills.filter(
                            (_, idx) => idx !== i
                          ),
                        })
                      }
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills found</p>
          )}
          {isEditing && (
            <AddItemInput
              placeholder="Add skill..."
              onAdd={(v) =>
                onUpdate({
                  ...extraction,
                  skills: [...extraction.skills, { name: v }],
                })
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-right truncate text-primary hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="text-right truncate">{value}</span>
      )}
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}

function AddItemInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="flex items-center gap-2 mt-3">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onAdd(value.trim());
            setValue("");
          }
        }}
      />
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={!value.trim()}
        onClick={() => {
          if (value.trim()) {
            onAdd(value.trim());
            setValue("");
          }
        }}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function AddLanguageInput({
  onAdd,
  existingLanguages,
}: {
  onAdd: (language: string, level: string) => void;
  existingLanguages: string[];
}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("");
  const [level, setLevel] = useState("");

  // Filter out languages already in the list (case-insensitive)
  const existingSet = new Set(existingLanguages.map((l) => l.toLowerCase()));
  const availableLanguages = EUROPEAN_LANGUAGES.filter(
    (l) => !existingSet.has(l.toLowerCase())
  );

  const add = () => {
    if (lang.trim()) {
      onAdd(lang.trim(), level);
      setLang("");
      setLevel("");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 flex-1 justify-between text-sm font-normal"
          >
            {lang || "Select language..."}
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search language..." />
            <CommandList>
              <CommandEmpty>No language found.</CommandEmpty>
              <CommandGroup>
                {availableLanguages.map((language) => (
                  <CommandItem
                    key={language}
                    value={language}
                    onSelect={(current) => {
                      setLang(current === lang ? "" : current);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        lang.toLowerCase() === language.toLowerCase()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {language}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Select value={level} onValueChange={setLevel}>
        <SelectTrigger className="h-8 w-[90px] text-xs">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGE_LEVELS.map((l) => (
            <SelectItem key={l} value={l}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={!lang.trim()}
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
