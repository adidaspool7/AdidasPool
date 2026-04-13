"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { buildAudioPayload, formatTime, AudioPayload } from "@/lib/interview-utils";

// ─── Timer constants ──────────────────────────────────────────────────────────
const TOTAL_INTERVIEW_SECONDS = 30 * 60; // 30 minutes
const QUESTION_SECONDS = 3 * 60; // 3 minutes per question

// ─── Types ────────────────────────────────────────────────────────────────────
type RealtimeStartResponse = {
  session: {
    interviewId: string;
    aiSessionId: string;
    status: "running";
  };
  firstQuestion: string;
  audioBase64?: string | null;
  audioMimeType?: string | null;
};

type RealtimeTurnResponse = {
  assistant_reply?: string;
  audio_base64?: string | null;
  audio_mime_type?: string | null;
  should_end?: boolean;
  evaluation?: EvaluationResult | null;
  error?: string;
};

type TerminateResponse = {
  terminated?: boolean;
  finalDecision?: "PASS" | "FAIL";
  technicalDecision?: "PASS" | "FAIL";
  integrityDecision?: string;
  rationale?: {
    technical?: string;
    integrity?: string;
    final?: string;
  };
  error?: string;
};

type EvaluationResult = {
  final?: boolean;
  technical?: { passed?: boolean };
  integrity?: { status?: string };
  rationale?: { technical?: string; integrity?: string; final?: string };
};

type ChatLine = { role: "assistant" | "user"; content: string };

type PermissionAwareNavigator = Navigator & {
  permissions?: {
    query: (descriptor: PermissionDescriptor) => Promise<{ state?: string }>;
  };
};

function isTrackTypeActive(stream: MediaStream | null, kind: "audio" | "video"): boolean {
  if (!stream) return false;
  const tracks = kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
  return tracks.some((track) => track.enabled && track.readyState === "live");
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function InterviewRuntimePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = useMemo(() => params?.token || "", [params]);

  // ── Core session state
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [clipboardState, setClipboardState] = useState("unknown");
  const [audioWarning, setAudioWarning] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // ── Evaluation results
  const [evaluation, setEvaluation] = useState<TerminateResponse | null>(null);

  // ── Timers
  const [totalTimeLeft, setTotalTimeLeft] = useState(TOTAL_INTERVIEW_SECONDS);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_SECONDS);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimeoutFiredRef = useRef(false);

  // ── Refs
  const interviewIdRef = useRef<string>("");
  const aiSessionIdRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const monitorRef = useRef<number | null>(null);
  const focusRef = useRef(true);
  const violationStateRef = useRef<Record<string, boolean>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const busyRef = useRef(false);
  const endedRef = useRef(false);

  // ── Camera state
  const [cameraDevices, setCameraDevices] = useState<Array<{ deviceId: string; label: string }>>(
    []
  );
  const [selectedCameraId, setSelectedCameraId] = useState("");

  // Keep busyRef in sync
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  // ─── Camera helpers ──────────────────────────────────────────────────────────
  async function refreshCameraDevices(preferredDeviceId?: string) {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices
      .filter((device) => device.kind === "videoinput")
      .map((camera, index) => ({
        deviceId: camera.deviceId,
        label: camera.label || `Camera ${index + 1}`,
      }));
    setCameraDevices(cameras);
    if (!cameras.length) {
      setSelectedCameraId("");
      return;
    }
    const cameraIds = new Set(cameras.map((camera) => camera.deviceId));
    if (preferredDeviceId && cameraIds.has(preferredDeviceId)) {
      setSelectedCameraId(preferredDeviceId);
      return;
    }
    if (!selectedCameraId || !cameraIds.has(selectedCameraId)) {
      setSelectedCameraId(cameras[0].deviceId);
    }
  }

  function attachPreviewStream(stream: MediaStream | null) {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }

  // ─── Audio context ───────────────────────────────────────────────────────────
  async function ensureAudioContextReady() {
    if (typeof window === "undefined" || !("AudioContext" in window)) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }

  async function playAudioWithFallback(
    audioBase64: string | null | undefined,
    audioMimeType: string | null | undefined,
    context: string
  ) {
    const payload = buildAudioPayload(audioBase64, audioMimeType);
    if (!payload.valid) return;
    await ensureAudioContextReady();
    new Audio(payload.url).play().catch((playbackError) => {
      console.error(`${context} audio playback failed:`, playbackError);
      setAudioWarning("Audio playback failed. Continue using text.");
    });
  }

  // ─── Proctoring ──────────────────────────────────────────────────────────────
  async function emitProctoring(
    eventType: string,
    severity: "INFO" | "WARNING" | "CRITICAL",
    details?: Record<string, unknown>
  ) {
    if (!token) return;
    try {
      await fetch("/api/interview/proctoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventType,
          severity,
          details,
          occurredAt: new Date().toISOString(),
        }),
      });
    } catch {
      // best effort
    }
  }

  // ─── Media stream ────────────────────────────────────────────────────────────
  function stopMediaStream() {
    attachPreviewStream(null);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function requestPermissions(preferredCameraId?: string): Promise<string | undefined> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: preferredCameraId ? { deviceId: { exact: preferredCameraId } } : true,
    });

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = stream;
    attachPreviewStream(stream);
    const videoTracks = stream.getVideoTracks();
    const appliedCameraId =
      videoTracks.length > 0 ? videoTracks[0].getSettings().deviceId : undefined;
    if (!appliedCameraId && preferredCameraId) {
      console.warn(
        "Camera deviceId unavailable from track settings; browser may apply default camera"
      );
    }
    await refreshCameraDevices(appliedCameraId);
    await emitProctoring("media_permission_granted", "INFO");

    const nav = navigator as PermissionAwareNavigator;
    if ("permissions" in nav && nav.permissions?.query) {
      try {
        const result = await nav.permissions.query({
          name: "clipboard-read",
        } as unknown as PermissionDescriptor);
        setClipboardState(result.state || "unknown");
        if (result.state !== "granted") {
          await emitProctoring("clipboard_permission_not_granted", "WARNING", {
            state: result.state || "unknown",
          });
        } else {
          await emitProctoring("clipboard_permission_granted", "INFO");
        }
      } catch {
        setClipboardState("unavailable");
        await emitProctoring("clipboard_permission_unavailable", "WARNING");
      }
    } else {
      setClipboardState("unavailable");
      await emitProctoring("clipboard_permission_unavailable", "WARNING");
    }
    return appliedCameraId;
  }

  // ─── Integrity monitor ───────────────────────────────────────────────────────
  function installGuards() {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onPopState = () => {
      history.pushState(null, "", window.location.href);
      void emitProctoring("blocked_back_navigation", "WARNING");
    };
    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      focusRef.current = visible;
      if (!visible) void emitProctoring("tab_hidden", "CRITICAL");
    };
    const onBlur = () => {
      focusRef.current = false;
      void emitProctoring("window_blur", "CRITICAL");
    };
    const onFocus = () => {
      focusRef.current = true;
      void emitProctoring("window_focus", "INFO");
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        void emitProctoring("fullscreen_exited", "CRITICAL");
      }
    };
    const onDeviceChange = () => {
      void emitProctoring("media_device_changed", "WARNING");
      void refreshCameraDevices();
    };

    history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreen);
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreen);
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }

  function startIntegrityMonitor() {
    monitorRef.current = window.setInterval(() => {
      const stream = streamRef.current;
      const audioActive = isTrackTypeActive(stream, "audio");
      const videoActive = isTrackTypeActive(stream, "video");
      const fullscreen = Boolean(document.fullscreenElement);
      const visible = document.visibilityState === "visible";
      const focused = focusRef.current;

      const next = {
        audio_stream_inactive: !audioActive,
        video_stream_inactive: !videoActive,
        fullscreen_not_active: !fullscreen,
        window_not_focused: !visible || !focused,
      };

      (Object.keys(next) as Array<keyof typeof next>).forEach((eventType) => {
        const nowActive = next[eventType];
        const wasActive = violationStateRef.current[eventType] ?? false;
        if (nowActive && !wasActive) {
          void emitProctoring(eventType, "CRITICAL");
        }
        violationStateRef.current[eventType] = nowActive;
      });
    }, 5000);
  }

  // ─── Timer management ────────────────────────────────────────────────────────
  function stopAllTimers() {
    if (totalTimerRef.current) {
      clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    }
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  }

  function resetQuestionTimer() {
    questionTimeoutFiredRef.current = false;
    setQuestionTimeLeft(QUESTION_SECONDS);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    let remaining = QUESTION_SECONDS;
    questionTimerRef.current = setInterval(() => {
      remaining -= 1;
      setQuestionTimeLeft(remaining);
      if (remaining <= 0 && !questionTimeoutFiredRef.current) {
        questionTimeoutFiredRef.current = true;
        void handleQuestionTimeout();
      }
    }, 1000);
  }

  function startTotalTimer() {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    let remaining = TOTAL_INTERVIEW_SECONDS;
    totalTimerRef.current = setInterval(() => {
      remaining -= 1;
      setTotalTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(totalTimerRef.current!);
        totalTimerRef.current = null;
        void handleTotalTimeout();
      }
    }, 1000);
  }

  // ─── Turn sending ─────────────────────────────────────────────────────────────
  const sendTurnWithText = useCallback(
    async (text: string, isTimeoutAdvance = false) => {
      if (!interviewIdRef.current || !aiSessionIdRef.current) return;
      if (endedRef.current) return;
      setBusy(true);
      const displayText = text || (isTimeoutAdvance ? "[Time expired – no answer provided]" : "");
      setChat((prev) => [...prev, { role: "user", content: displayText }]);
      try {
        const response = await fetch("/api/interview/realtime/turn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            interviewId: interviewIdRef.current,
            aiSessionId: aiSessionIdRef.current,
            userText: displayText || " ",
            mode: "text",
          }),
        });
        const data = (await response.json()) as RealtimeTurnResponse;
        if (!response.ok) throw new Error(data.error || "Turn failed");

        const assistantText = data.assistant_reply ?? "";
        setQuestion(assistantText);
        if (assistantText.length > 0) {
          setChat((prev) => [...prev, { role: "assistant", content: assistantText }]);
        }

        await playAudioWithFallback(data.audio_base64, data.audio_mime_type, "Interview turn");

        if (data.should_end) {
          await finishInterview(data.evaluation ?? null);
        } else {
          // Reset per-question timer on each new core question
          resetQuestionTimer();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Turn failed");
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

  async function sendTurn() {
    if (!input.trim() || busy || !interviewIdRef.current || !aiSessionIdRef.current) return;
    const text = input.trim();
    setInput("");
    await sendTurnWithText(text);
  }

  // ─── Question timeout ─────────────────────────────────────────────────────────
  async function handleQuestionTimeout() {
    if (busyRef.current || endedRef.current) return;
    await emitProctoring("question_timeout", "WARNING", {
      partialAnswer: input.trim() || null,
    });
    const partialText = input.trim();
    setInput("");
    await sendTurnWithText(partialText, true);
  }

  // ─── Total timeout ────────────────────────────────────────────────────────────
  async function handleTotalTimeout() {
    if (endedRef.current) return;
    await emitProctoring("total_interview_timeout", "CRITICAL");
    await terminateInterview("total_timeout");
  }

  // ─── Finalize interview (backend-driven end) ──────────────────────────────────
  async function finishInterview(evalData: EvaluationResult | null) {
    endedRef.current = true;
    setEnded(true);
    stopAllTimers();
    if (monitorRef.current) window.clearInterval(monitorRef.current);
    stopMediaStream();
    await emitProctoring("interview_ended", "INFO", { evaluation: evalData ?? null });

    if (evalData) {
      setEvaluation({
        finalDecision: evalData.final ? "PASS" : "FAIL",
        technicalDecision: evalData.technical?.passed ? "PASS" : "FAIL",
        integrityDecision: evalData.integrity?.status ?? "REVIEW",
        rationale: evalData.rationale,
      });
    }
  }

  // ─── Early termination ────────────────────────────────────────────────────────
  async function terminateInterview(reason = "user_early_exit") {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    stopAllTimers();
    if (monitorRef.current) window.clearInterval(monitorRef.current);
    stopMediaStream();
    setBusy(true);
    try {
      const response = await fetch("/api/interview/realtime/terminate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interviewId: interviewIdRef.current,
          reason,
        }),
      });
      const data = (await response.json()) as TerminateResponse;
      if (!response.ok) throw new Error(data.error || "Termination failed");
      setEvaluation(data);
      await emitProctoring("interview_terminated", "INFO", { reason, evaluation: data });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finalize interview");
    } finally {
      setBusy(false);
    }
  }

  // ─── Voice recording (STT) ────────────────────────────────────────────────────
  async function startVoiceRecording() {
    if (!streamRef.current) return;
    // Use audio-only stream from existing media stream
    const audioTracks = streamRef.current.getAudioTracks();
    if (!audioTracks.length) {
      setError("No audio track available for voice recording");
      return;
    }
    const audioStream = new MediaStream(audioTracks);

    // Pick a supported MIME type
    const preferredMime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find(
      (m) => MediaRecorder.isTypeSupported(m)
    );

    audioChunksRef.current = [];
    const recorder = new MediaRecorder(audioStream, preferredMime ? { mimeType: preferredMime } : {});
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      void submitVoiceTurn();
    };

    recorder.start();
    setIsRecording(true);
    setMode("voice");
    await emitProctoring("voice_capture_started", "INFO");
  }

  async function stopVoiceRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setMode("text");
    await emitProctoring("voice_capture_stopped", "INFO");
  }

  async function submitVoiceTurn() {
    const chunks = audioChunksRef.current;
    if (!chunks.length || !interviewIdRef.current || !aiSessionIdRef.current) return;
    if (endedRef.current) return;

    const mimeType =
      mediaRecorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });

    // Convert to base64 efficiently
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    const base64 = btoa(binary);

    setBusy(true);
    setChat((prev) => [...prev, { role: "user", content: "[Voice message]" }]);
    try {
      const response = await fetch("/api/interview/realtime/turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interviewId: interviewIdRef.current,
          aiSessionId: aiSessionIdRef.current,
          userAudioBase64: base64,
          mode: "voice",
        }),
      });
      const data = (await response.json()) as RealtimeTurnResponse;
      if (!response.ok) throw new Error(data.error || "Voice turn failed");

      const assistantText = data.assistant_reply ?? "";
      setQuestion(assistantText);
      if (assistantText.length > 0) {
        setChat((prev) => [...prev, { role: "assistant", content: assistantText }]);
      }

      await playAudioWithFallback(data.audio_base64, data.audio_mime_type, "Voice turn");

      if (data.should_end) {
        await finishInterview(data.evaluation ?? null);
      } else {
        resetQuestionTimer();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice turn failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVoiceCapture() {
    if (isRecording) {
      await stopVoiceRecording();
    } else {
      await startVoiceRecording();
    }
  }

  // ─── Begin interview ──────────────────────────────────────────────────────────
  async function begin() {
    setError(null);
    setBusy(true);
    try {
      if (!token) throw new Error("Missing interview token");
      await document.documentElement.requestFullscreen();
      await requestPermissions();
      await emitProctoring("consent_accepted", "INFO");
      setStarted(true);

      const profileRes = await fetch("/api/me", { cache: "no-store" });
      if (!profileRes.ok) throw new Error("Failed to load candidate profile");
      const profile = (await profileRes.json()) as {
        id: string;
        firstName?: string;
        lastName?: string;
        skills?: Array<{ name: string; category?: string }>;
        experiences?: Array<{ jobTitle?: string; description?: string }>;
      };

      const startRes = await fetch("/api/interview/realtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode,
          candidate: {
            candidate_id: profile.id,
            full_name: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim(),
            target_skill: profile.skills?.[0]?.name ?? null,
            skills: (profile.skills || []).map((s) => ({
              name: s.name,
              category: s.category ?? null,
            })),
            projects: (profile.experiences || []).slice(0, 5).map((e) => ({
              title: e.jobTitle || null,
              description: e.description || e.jobTitle || "No project details",
              technologies: [],
            })),
          },
        }),
      });

      if (!startRes.ok) {
        const contentType = startRes.headers.get("content-type") || "";
        let serverMessage = "Failed to create interview runtime session";
        if (contentType.includes("application/json")) {
          const body = await startRes.json().catch(() => null);
          if (body && typeof body === "object") {
            const maybeError = (body as { error?: unknown }).error;
            if (typeof maybeError === "string" && maybeError.trim()) {
              serverMessage = maybeError;
            }
          }
        } else {
          const text = await startRes.text().catch(() => "");
          if (text.trim()) serverMessage = text.slice(0, 300);
        }
        throw new Error(serverMessage);
      }

      const data = (await startRes.json()) as RealtimeStartResponse;
      interviewIdRef.current = data.session.interviewId;
      aiSessionIdRef.current = data.session.aiSessionId;
      setQuestion(data.firstQuestion);
      setChat([{ role: "assistant", content: data.firstQuestion }]);
      await playAudioWithFallback(data.audioBase64, data.audioMimeType, "Interview intro");
      startIntegrityMonitor();
      startTotalTimer();
      resetQuestionTimer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start interview");
    } finally {
      setBusy(false);
    }
  }

  async function switchCamera(deviceId: string) {
    if (!deviceId || deviceId === selectedCameraId) return;
    try {
      setBusy(true);
      const appliedCameraId = await requestPermissions(deviceId);
      const nextCameraId = appliedCameraId || deviceId;
      setSelectedCameraId(nextCameraId);
      await emitProctoring("camera_switched", "INFO", {
        requestedDeviceId: deviceId,
        appliedCameraId,
      });
    } catch (cameraError) {
      console.error("Failed to switch camera:", cameraError);
      setError(cameraError instanceof Error ? cameraError.message : "Failed to switch camera");
    } finally {
      setBusy(false);
    }
  }

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = installGuards();
    return () => {
      cleanup();
      if (monitorRef.current) window.clearInterval(monitorRef.current);
      stopAllTimers();
      stopMediaStream();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (started) {
      attachPreviewStream(streamRef.current);
    }
  }, [started]);

  // ─── Timer colors ─────────────────────────────────────────────────────────────
  const totalTimerColor =
    totalTimeLeft < 5 * 60 ? "text-destructive" : totalTimeLeft < 10 * 60 ? "text-amber-500" : "text-foreground";
  const questionTimerColor =
    questionTimeLeft < 30 ? "text-destructive" : questionTimeLeft < 60 ? "text-amber-500" : "text-foreground";

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>AI Interview Runtime (Controlled Window)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This window is interview-only and monitored for integrity signals (camera, microphone,
              fullscreen, focus, clipboard permission state).
            </p>
            <p className="text-xs text-muted-foreground">
              Clipboard permission status: <strong>{clipboardState}</strong>
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {audioWarning ? <p className="text-xs text-amber-600">{audioWarning}</p> : null}

            {!started ? (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  I consent to camera/mic monitoring and integrity telemetry during interview.
                </label>
                <Button onClick={begin} disabled={!consent || busy}>
                  {busy ? "Starting..." : "Start Interview"}
                </Button>
              </div>
            ) : ended ? (
              // ── Ended / Results view ──────────────────────────────────────────
              <div className="space-y-4">
                <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                  <p className="text-base font-semibold text-green-800 dark:text-green-200">
                    Interview Complete
                  </p>
                  {evaluation ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Final decision: </span>
                        <span
                          className={
                            evaluation.finalDecision === "PASS"
                              ? "font-bold text-green-700 dark:text-green-300"
                              : "font-bold text-destructive"
                          }
                        >
                          {evaluation.finalDecision ?? "Pending"}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium">Technical: </span>
                        {evaluation.technicalDecision ?? "—"}
                      </p>
                      <p>
                        <span className="font-medium">Integrity: </span>
                        {evaluation.integrityDecision ?? "—"}
                      </p>
                      {evaluation.rationale && (
                        <div className="mt-2 space-y-1 rounded border p-2 text-xs text-muted-foreground">
                          {evaluation.rationale.technical && (
                            <p>
                              <span className="font-medium text-foreground">Technical note: </span>
                              {evaluation.rationale.technical}
                            </p>
                          )}
                          {evaluation.rationale.integrity && (
                            <p>
                              <span className="font-medium text-foreground">Integrity note: </span>
                              {evaluation.rationale.integrity}
                            </p>
                          )}
                          {evaluation.rationale.final && (
                            <p>
                              <span className="font-medium text-foreground">Overall: </span>
                              {evaluation.rationale.final}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Evaluation is being processed.
                    </p>
                  )}
                </div>
                <Button variant="outline" onClick={() => router.replace("/dashboard/ai-interview")}>
                  Return to Dashboard
                </Button>
              </div>
            ) : (
              // ── Active interview ──────────────────────────────────────────────
              <>
                {/* Timers */}
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <span>
                    Total:{" "}
                    <span className={`font-mono font-semibold ${totalTimerColor}`}>
                      {formatTime(totalTimeLeft)}
                    </span>
                  </span>
                  <span>
                    Question:{" "}
                    <span className={`font-mono font-semibold ${questionTimerColor}`}>
                      {formatTime(questionTimeLeft)}
                    </span>
                  </span>
                </div>

                {/* Current question */}
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Current AI question</p>
                  <p className="mt-2">{question || "Waiting..."}</p>
                </div>

                {/* Chat log */}
                <div className="h-64 overflow-y-auto rounded-md border p-3">
                  {chat.map((line, i) => (
                    <p key={`${line.role}-${i}`} className="mb-2 text-sm">
                      <span className="font-semibold">
                        {line.role === "assistant" ? "AI" : "You"}:
                      </span>{" "}
                      {line.content}
                    </p>
                  ))}
                </div>

                {/* Camera preview */}
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">Live camera preview</p>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-48 w-full rounded-md bg-black object-cover"
                  />
                  {cameraDevices.length > 1 ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Camera source
                      <select
                        className="rounded border bg-background px-2 py-1 text-xs text-foreground"
                        value={selectedCameraId}
                        onChange={(e) => {
                          void switchCamera(e.target.value);
                        }}
                        disabled={busy}
                      >
                        {cameraDevices.map((camera) => (
                          <option key={camera.deviceId} value={camera.deviceId}>
                            {camera.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>

                {/* Input controls */}
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isRecording ? "Recording voice..." : "Type your answer..."}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void sendTurn();
                    }}
                    disabled={busy || isRecording}
                  />
                  <Button onClick={sendTurn} disabled={busy || isRecording || !input.trim()}>
                    Send
                  </Button>
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={toggleVoiceCapture}
                    disabled={busy && !isRecording}
                  >
                    {isRecording ? "⏹ Stop" : "🎤 Voice"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void terminateInterview("user_early_exit")}
                    disabled={busy}
                  >
                    End
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press <strong>End</strong> to finish the interview early and receive your
                  evaluation.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
