"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FolderArchive,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  FileWarning,
  Ban,
} from "lucide-react";

import { Button } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { Progress } from "@client/components/ui/progress";
import { Separator } from "@client/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table";
import { Skeleton } from "@client/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────────────

interface ParsingJob {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalFiles: number;
  parsedFiles: number;
  failedFiles: number;
  errorLog: { file: string; error: string; timestamp: string }[];
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SelectedFile {
  file: File;
  id: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt", ".zip"];
const MAX_SIZE_MB = 10;
const MAX_BULK_FILES = 500;

// ─── Component ───────────────────────────────────────────────────

export default function HrBulkUpload() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeJob, setActiveJob] = useState<ParsingJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<ParsingJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [expandedErrorJob, setExpandedErrorJob] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load recent jobs on mount ─────────────────────────────────

  const fetchRecentJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/upload/bulk");
      if (res.ok) {
        const data = await res.json();
        setRecentJobs(data.jobs ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentJobs();
  }, [fetchRecentJobs]);

  // ─── Poll active job ──────────────────────────────────────────

  const pollJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/upload/bulk/${jobId}`);
        if (!res.ok) return;
        const job: ParsingJob = await res.json();
        setActiveJob(job);

        if (job.status === "COMPLETED" || job.status === "FAILED") {
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setUploading(false);
          fetchRecentJobs();

          if (job.status === "COMPLETED") {
            const msg =
              job.failedFiles > 0
                ? `Parsed ${job.parsedFiles} of ${job.totalFiles} CVs (${job.failedFiles} failed)`
                : `Successfully parsed all ${job.parsedFiles} CVs`;
            toast.success(msg);
          } else {
            toast.error("Bulk upload failed — check error log for details.");
          }
        }
      } catch {
        /* silent */
      }
    },
    [fetchRecentJobs]
  );

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ─── File handling ─────────────────────────────────────────────

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles: SelectedFile[] = [];
      for (const file of Array.from(fileList)) {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        const isAccepted =
          ACCEPTED_TYPES.includes(file.type) ||
          ACCEPTED_EXTENSIONS.includes(ext);
        const isTooBig = file.size > MAX_SIZE_MB * 1024 * 1024;

        if (!isAccepted) {
          toast.error(`${file.name}: Unsupported format`);
          continue;
        }
        if (isTooBig && ext !== ".zip") {
          toast.error(`${file.name}: File too large (max ${MAX_SIZE_MB}MB)`);
          continue;
        }

        newFiles.push({ file, id: `${Date.now()}-${Math.random()}` });
      }

      setSelectedFiles((prev) => {
        const combined = [...prev, ...newFiles];
        if (combined.length > MAX_BULK_FILES) {
          toast.error(`Maximum ${MAX_BULK_FILES} files allowed`);
          return combined.slice(0, MAX_BULK_FILES);
        }
        return combined;
      });
    },
    []
  );

  const removeFile = (id: string) =>
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));

  const clearFiles = () => setSelectedFiles([]);

  // ─── Drag & drop ──────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  // ─── Upload ───────────────────────────────────────────────────

  const startUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setActiveJob(null);

    try {
      const formData = new FormData();
      for (const sf of selectedFiles) {
        formData.append("files", sf.file);
      }

      const res = await fetch("/api/upload/bulk", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      const jobId = data.jobId as string;

      // Set initial active job
      setActiveJob({
        id: jobId,
        status: "PROCESSING",
        totalFiles: data.totalFiles,
        parsedFiles: 0,
        failedFiles: 0,
        errorLog: [],
        fileName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Clear selected files
      setSelectedFiles([]);

      // Start polling
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(jobId);
      }, 2000);

      toast.info(
        `Processing ${data.totalFiles} files — you can monitor progress below.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      setUploading(false);
    }
  };

  // ─── Cancel job ───────────────────────────────────────────────

  const cancelJob = async (jobId: string) => {
    setCancelling(jobId);
    try {
      const res = await fetch("/api/upload/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.cancelled) {
          toast.info("Cancelling job — will stop after current file.");
          // Stop polling, mark as failed locally
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setUploading(false);
          // Wait a moment then refresh
          setTimeout(() => {
            setActiveJob(null);
            fetchRecentJobs();
          }, 2000);
        } else {
          toast.info("Job already completed or failed.");
        }
      }
    } catch {
      toast.error("Failed to cancel job");
    } finally {
      setCancelling(null);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────

  const totalSize = selectedFiles.reduce((sum, sf) => sum + sf.file.size, 0);
  const zipCount = selectedFiles.filter((sf) =>
    sf.file.name.toLowerCase().endsWith(".zip")
  ).length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: ParsingJob["status"]) => {
    const config = {
      QUEUED: { label: "Queued", variant: "secondary" as const },
      PROCESSING: { label: "Processing", variant: "default" as const },
      COMPLETED: { label: "Completed", variant: "outline" as const },
      FAILED: { label: "Failed", variant: "destructive" as const },
    };
    const c = config[status];
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  // ─── Active job progress ──────────────────────────────────────

  const progressPercent = activeJob
    ? activeJob.totalFiles > 0
      ? Math.round(
          ((activeJob.parsedFiles + activeJob.failedFiles) /
            activeJob.totalFiles) *
            100
        )
      : 0
    : 0;

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk CV Upload</h1>
        <p className="text-muted-foreground">
          Upload multiple CVs or a ZIP archive. Files are parsed automatically
          with AI and added to the talent pool.
        </p>
      </div>

      {/* Drop Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            } ${uploading ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div className="rounded-full bg-muted p-3">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">
              Drop files here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, TXT — or a ZIP archive containing CVs. Max{" "}
              {MAX_SIZE_MB}MB per file, up to {MAX_BULK_FILES} files total.
            </p>
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {selectedFiles.length} file
                  {selectedFiles.length !== 1 ? "s" : ""} selected
                  {zipCount > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      ({zipCount} ZIP archive{zipCount !== 1 ? "s" : ""})
                    </span>
                  )}
                  <span className="ml-2 text-muted-foreground">
                    ({formatSize(totalSize)})
                  </span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFiles}
                  disabled={uploading}
                >
                  Clear all
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-md border">
                {selectedFiles.map((sf) => (
                  <div
                    key={sf.id}
                    className="flex items-center justify-between border-b px-3 py-2 last:border-b-0"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {sf.file.name.toLowerCase().endsWith(".zip") ? (
                        <FolderArchive className="h-4 w-4 text-amber-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="max-w-[300px] truncate">
                        {sf.file.name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatSize(sf.file.size)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(sf.id);
                      }}
                      disabled={uploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={startUpload}
                disabled={uploading || !selectedFiles.length}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Parse {selectedFiles.length} File
                    {selectedFiles.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Job Progress */}
      {activeJob &&
        (activeJob.status === "PROCESSING" ||
          activeJob.status === "QUEUED") && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Processing CVs…
                </CardTitle>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => cancelJob(activeJob.id)}
                  disabled={cancelling === activeJob.id}
                >
                  {cancelling === activeJob.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-1 h-4 w-4" />
                  )}
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progressPercent} className="h-3" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {activeJob.parsedFiles + activeJob.failedFiles} of{" "}
                  {activeJob.totalFiles} files processed
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {activeJob.parsedFiles} parsed
                </span>
                {activeJob.failedFiles > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {activeJob.failedFiles} failed
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Completed Job Summary */}
      {activeJob &&
        (activeJob.status === "COMPLETED" || activeJob.status === "FAILED") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {activeJob.status === "COMPLETED" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                Upload{" "}
                {activeJob.status === "COMPLETED" ? "Complete" : "Failed"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-md bg-muted p-3 text-center">
                  <p className="text-2xl font-bold">{activeJob.totalFiles}</p>
                  <p className="text-xs text-muted-foreground">Total Files</p>
                </div>
                <div className="rounded-md bg-green-50 p-3 text-center dark:bg-green-900/20">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {activeJob.parsedFiles}
                  </p>
                  <p className="text-xs text-muted-foreground">Parsed</p>
                </div>
                <div className="rounded-md bg-red-50 p-3 text-center dark:bg-red-900/20">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {activeJob.failedFiles}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {/* Error log */}
              {activeJob.errorLog.length > 0 && (
                <div className="space-y-2">
                  <button
                    className="flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                    onClick={() =>
                      setExpandedErrorJob(
                        expandedErrorJob === activeJob.id
                          ? null
                          : activeJob.id
                      )
                    }
                  >
                    <FileWarning className="h-4 w-4" />
                    {activeJob.errorLog.length} error
                    {activeJob.errorLog.length !== 1 ? "s" : ""}
                    {expandedErrorJob === activeJob.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {expandedErrorJob === activeJob.id && (
                    <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/50 p-3 text-xs">
                      {activeJob.errorLog.map((err, i) => (
                        <div
                          key={i}
                          className="border-b border-muted py-1.5 last:border-0"
                        >
                          <span className="font-medium">{err.file}</span>
                          <span className="mx-1 text-muted-foreground">—</span>
                          <span className="text-red-600">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveJob(null)}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

      <Separator />

      {/* Job History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecentJobs}
            disabled={loadingJobs}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${loadingJobs ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {loadingJobs ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : recentJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No upload history yet. Upload some CVs to get started.
            </p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File / Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Parsed</TableHead>
                  <TableHead className="text-center">Failed</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {job.fileName || "Bulk upload"}
                    </TableCell>
                    <TableCell>{statusBadge(job.status)}</TableCell>
                    <TableCell className="text-center">
                      {job.totalFiles}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {job.parsedFiles}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {job.failedFiles || "–"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(job.status === "PROCESSING" || job.status === "QUEUED") && (
                          <button
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => cancelJob(job.id)}
                            disabled={cancelling === job.id}
                          >
                            {cancelling === job.id ? "Cancelling…" : "Cancel"}
                          </button>
                        )}
                        {job.errorLog &&
                          Array.isArray(job.errorLog) &&
                          job.errorLog.length > 0 && (
                          <button
                            className="text-xs text-red-600 hover:underline"
                            onClick={() =>
                              setExpandedErrorJob(
                                expandedErrorJob === job.id ? null : job.id
                              )
                            }
                          >
                            {expandedErrorJob === job.id
                              ? "Hide errors"
                              : `${job.errorLog.length} error${job.errorLog.length !== 1 ? "s" : ""}`}
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Expanded error log for history item */}
            {expandedErrorJob &&
              recentJobs
                .filter((j) => j.id === expandedErrorJob && j.errorLog?.length)
                .map((j) => (
                  <div
                    key={`err-${j.id}`}
                    className="border-t bg-muted/50 px-4 py-3"
                  >
                    <p className="mb-2 text-xs font-medium">
                      Error log for {j.fileName || "upload"}:
                    </p>
                    <div className="max-h-48 overflow-y-auto text-xs">
                      {j.errorLog.map(
                        (
                          err: {
                            file: string;
                            error: string;
                            timestamp: string;
                          },
                          i: number
                        ) => (
                          <div
                            key={i}
                            className="border-b border-muted py-1 last:border-0"
                          >
                            <span className="font-medium">{err.file}</span>
                            <span className="mx-1 text-muted-foreground">
                              —
                            </span>
                            <span className="text-red-600">{err.error}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
          </Card>
        )}
      </div>
    </div>
  );
}
