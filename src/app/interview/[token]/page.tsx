"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { formatTime, isClarificationText, STT_FALLBACK_MESSAGE } from "@/lib/interview-utils";

// ─── Timer constants ──────────────────────────────────────────────────────────
// Total interview timer removed (Phase 2 — only per-question timer remains)
const QUESTION_SECONDS = 3 * 60; // 3 minutes per question

// ─── Browser API types ────────────────────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type RealtimeStartResponse = {
  session: {
    interviewId: string;
    aiSessionId: string;
    status: "running";
  };
  firstQuestion: string;
};

type RealtimeTurnResponse = {
  assistant_reply?: string;
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

/** Speak text with the browser TTS API (Chrome/Edge). No-op on unsupported browsers. */
function speakText(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // stop any current speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function getBrowserSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"] ?? null) as SpeechRecognitionConstructor | null;
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
  const [clipboardState, setClipboardState] = useState("unknown");
  const [isRecording, setIsRecording] = useState(false);
  const [sttTranscript, setSttTranscript] = useState("");  // live STT transcript
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // ── Evaluation results
  const [evaluation, setEvaluation] = useState<TerminateResponse | null>(null);

  // ── Per-question timer only (total timer removed)
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_SECONDS);
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
  const busyRef = useRef(false);
  const endedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const sttTranscriptRef = useRef<string>("");   // stable ref for access across renders

  // ── Camera state
  const [cameraDevices, setCameraDevices] = useState<Array<{ deviceId: string; label: string }>>(
    []
  );
  const [selectedCameraId, setSelectedCameraId] = useState("");

  // Keep busyRef in sync
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  // Detect STT support on mount
  useEffect(() => {
    setSttSupported(getBrowserSpeechRecognition() !== null);
  }, []);

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
        }
      } catch {
        setClipboardState("unavailable");
      }
    } else {
      setClipboardState("unavailable");
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
  function stopQuestionTimer() {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
  }

  /**
   * Reset and restart the per-question countdown.
   * Only call this when a new question arrives — NOT on clarification turns.
   */
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

  // ─── Turn sending ─────────────────────────────────────────────────────────────
  const sendTurnWithText = useCallback(
    async (text: string, opts: { isTimeoutAdvance?: boolean; isClarification?: boolean } = {}) => {
      if (!interviewIdRef.current || !aiSessionIdRef.current) return;
      if (endedRef.current) return;
      setBusy(true);
      const displayText = text || (opts.isTimeoutAdvance ? "[Time expired – no answer provided]" : "");
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
          if (ttsEnabled) speakText(assistantText);
        }

        if (data.should_end) {
          await finishInterview(data.evaluation ?? null);
        } else if (!opts.isClarification) {
          // Only reset the per-question timer when this is a new question, not a clarification
          resetQuestionTimer();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Turn failed");
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, ttsEnabled]
  );

  async function sendTurn() {
    if (!input.trim() || busy || !interviewIdRef.current || !aiSessionIdRef.current) return;
    const text = input.trim();
    setInput("");
    const clarification = isClarificationText(text);
    await sendTurnWithText(text, { isClarification: clarification });
  }

  // ─── Question timeout ─────────────────────────────────────────────────────────
  async function handleQuestionTimeout() {
    if (busyRef.current || endedRef.current) return;
    await emitProctoring("question_timeout", "WARNING", {
      partialAnswer: input.trim() || null,
    });
    const partialText = input.trim();
    setInput("");
    // Timeout advance is never a clarification — always counts as submitting
    await sendTurnWithText(partialText, { isTimeoutAdvance: true, isClarification: false });
  }

  // ─── Finalize interview (backend-driven end) ──────────────────────────────────
  async function finishInterview(evalData: EvaluationResult | null) {
    endedRef.current = true;
    setEnded(true);
    stopQuestionTimer();
    if (monitorRef.current) window.clearInterval(monitorRef.current);
    stopMediaStream();
    window.speechSynthesis?.cancel();
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
    setEnded(true);           // Show ended view immediately — Return button visible at once
    stopQuestionTimer();
    if (monitorRef.current) window.clearInterval(monitorRef.current);
    stopMediaStream();
    window.speechSynthesis?.cancel();
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

  /** Append STT fallback guidance into chat when SpeechRecognition is unavailable. */
  function appendSttFallback(lines: ChatLine[]): ChatLine[] {
    if (!getBrowserSpeechRecognition()) {
      return [...lines, { role: "assistant", content: `⚠️ ${STT_FALLBACK_MESSAGE}` }];
    }
    return lines;
  }

  // ─── Browser STT (SpeechRecognition) ─────────────────────────────────────────
  function startSpeechRecognition() {
    const SR = getBrowserSpeechRecognition();
    if (!SR) {
      setChat((prev) => appendSttFallback(prev));
      return;
    }

    setSttTranscript("");
    sttTranscriptRef.current = "";
    setIsRecording(true);

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;  // keep listening until user presses stop

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }
      const combined = (finalText + interimText).trim();
      setSttTranscript(combined);
      sttTranscriptRef.current = combined;
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "aborted") {
        setError(`STT error: ${e.error}`);
      }
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // Recognition ended (browser-initiated or after stop()).
      // Only auto-submit if the user explicitly pressed stop.
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.start();
    void emitProctoring("voice_capture_started", "INFO");
  }

  /**
   * Stop recording and immediately submit the accumulated STT transcript.
   * This is the only way to end a voice turn — auto-submit on stop.
   */
  function stopAndSubmitVoice() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);

    const transcript = sttTranscriptRef.current.trim();
    sttTranscriptRef.current = "";
    setSttTranscript("");

    if (transcript) {
      void sendTurnWithText(transcript, { isClarification: isClarificationText(transcript) });
    }
    void emitProctoring("voice_capture_stopped", "INFO");
  }

  function toggleVoiceCapture() {
    if (isRecording) {
      stopAndSubmitVoice();
    } else {
      startSpeechRecognition();
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
      await ensureAudioContextReady();
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
          candidate: {
            candidate_id: profile.id,
            full_name: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim(),
            target_skill: null,
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
      const initialChat: ChatLine[] = [{ role: "assistant", content: data.firstQuestion }];
      setChat(appendSttFallback(initialChat));
      if (ttsEnabled) speakText(data.firstQuestion);
      startIntegrityMonitor();
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
      setSelectedCameraId(appliedCameraId || deviceId);
      await emitProctoring("camera_switched", "INFO", { deviceId });
    } catch (cameraError) {
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
      stopQuestionTimer();
      stopMediaStream();
      window.speechSynthesis?.cancel();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (started) attachPreviewStream(streamRef.current);
  }, [started]);

  // ─── Timer color ──────────────────────────────────────────────────────────────
  const questionTimerColor =
    questionTimeLeft < 30
      ? "text-destructive"
      : questionTimeLeft < 60
        ? "text-amber-500"
        : "text-foreground";

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

            {!started ? (
              // ── Consent screen ────────────────────────────────────────────────
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
                    // Evaluation still loading — show spinner but allow closing
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing evaluation…
                    </p>
                  )}
                </div>
                {/* Return button is NEVER disabled — always available once interview ends */}
                <Button variant="outline" onClick={() => router.replace("/dashboard/ai-interview")}>
                  Return to Dashboard
                </Button>
              </div>
            ) : (
              // ── Active interview ──────────────────────────────────────────────
              <>
                {/* Per-question timer only */}
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground text-xs">Per-question timer</span>
                  <span>
                    <span className={`font-mono font-semibold ${questionTimerColor}`}>
                      {formatTime(questionTimeLeft)}
                    </span>
                  </span>
                  {/* TTS toggle */}
                  <button
                    className="text-xs text-muted-foreground underline"
                    onClick={() => {
                      setTtsEnabled((v) => {
                        if (v) window.speechSynthesis?.cancel();
                        return !v;
                      });
                    }}
                  >
                    {ttsEnabled ? "🔊 TTS on" : "🔇 TTS off"}
                  </button>
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
                        onChange={(e) => { void switchCamera(e.target.value); }}
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
                    placeholder={
                      isRecording
                        ? "Listening… press Stop & Send to submit"
                        : "Type your answer (end with ? for a clarification)"
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void sendTurn();
                    }}
                    disabled={busy || isRecording}
                    readOnly={isRecording}
                  />
                  <Button onClick={sendTurn} disabled={busy || isRecording || !input.trim()}>
                    Send
                  </Button>

                  {/* Voice button — push-to-talk: press to start, press again to stop & auto-submit */}
                  {sttSupported && (
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      onClick={toggleVoiceCapture}
                      disabled={busy && !isRecording}
                      title={isRecording ? "Stop recording & submit" : "Start voice input (Chrome/Edge)"}
                    >
                      {isRecording ? "⏹ Stop & Send" : "🎤 Voice"}
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    onClick={() => void terminateInterview("user_early_exit")}
                    disabled={busy}
                  >
                    End
                  </Button>
                </div>

                {isRecording && (
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    🎙️ Recording… {sttTranscript ? <em>Heard: &ldquo;{sttTranscript}&rdquo;</em> : "speak your answer"}
                  </p>
                )}

                {!sttSupported && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Voice input unavailable — type your answers instead.
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Questions ending with <strong>?</strong> are treated as clarifications — timer
                  does not reset. Press <strong>End</strong> to finish early.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
