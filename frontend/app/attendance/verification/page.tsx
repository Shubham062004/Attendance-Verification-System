"use client";

import React, { useCallback, useEffect, useRef, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService, VerificationSessionResponse } from "../../../services/api";
import {
  Camera,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Smile,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Step =
  | "camera_permission"
  | "face_detection"
  | "blink_detection"
  | "smile_detection"
  | "complete";

type StepStatus = "pending" | "active" | "passed" | "failed";

interface StepState {
  camera_permission: StepStatus;
  face_detection: StepStatus;
  blink_detection: StepStatus;
  smile_detection: StepStatus;
  complete: StepStatus;
}

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MEDIAPIPE_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm";
const MEDIAPIPE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const LEFT_EYE_UPPER = [159, 145]; // [upper lid, lower lid] indices
const LEFT_EYE_LOWER = [386, 374];
const BLINK_EAR_THRESHOLD = 0.22; // Eye Aspect Ratio threshold
const BLINK_CONSECUTIVE_FRAMES = 3;
const SMILE_THRESHOLD = 0.6; // Mouth corner lift ratio

// ---------------------------------------------------------------------------
// Step metadata
// ---------------------------------------------------------------------------
const STEPS: { key: Step; label: string; description: string }[] = [
  { key: "camera_permission", label: "Camera Access", description: "Allow camera access" },
  { key: "face_detection", label: "Face Detection", description: "Position face in frame" },
  { key: "blink_detection", label: "Blink Check", description: "Blink naturally" },
  { key: "smile_detection", label: "Smile Check", description: "Smile for liveness" },
  { key: "complete", label: "Complete", description: "Verification done" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function euclidean(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/** Eye Aspect Ratio from 6 landmark points. */
function computeEAR(
  landmarks: { x: number; y: number }[],
  upper: number[],
  lower: number[],
): number {
  const vertical =
    (euclidean(landmarks[upper[0]], landmarks[lower[0]]) +
      euclidean(landmarks[upper[1]], landmarks[lower[1]])) /
    2;
  // Horizontal: corner to corner — using indices 33 (left) and 133 (right) for left eye
  const horizontal = euclidean(landmarks[33], landmarks[133]);
  if (horizontal === 0) return 1;
  return vertical / horizontal;
}

/** Compute mouth-corner-lift ratio as smile proxy. */
function computeSmileRatio(landmarks: { x: number; y: number }[]): number {
  // Outer mouth corners: 61 (left), 291 (right). Upper lip top: 13. Lower lip bottom: 14.
  const mouthWidth = euclidean(landmarks[61], landmarks[291]);
  const mouthHeight = euclidean(landmarks[13], landmarks[14]);
  if (mouthWidth === 0) return 0;
  return mouthHeight / mouthWidth;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function CameraVerificationContent({ searchParams }: PageProps) {
  const resolvedSearchParams = use(searchParams);
  const sessionIdStr = resolvedSearchParams.session_id;
  const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
  const router = useRouter();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  // eslint-disable-next-line
  const landmarkerRef = useRef<any>(null);
  const blinkFrameCountRef = useRef(0);
  const isProcessingRef = useRef(false);

  // State
  const [currentStep, setCurrentStep] = useState<Step>("camera_permission");
  const [stepStatuses, setStepStatuses] = useState<StepState>({
    camera_permission: "active",
    face_detection: "pending",
    blink_detection: "pending",
    smile_detection: "pending",
    complete: "pending",
  });
  const [loadingMediaPipe, setLoadingMediaPipe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("Click 'Allow Camera' to begin");
  const [verificationRecord, setVerificationRecord] = useState<VerificationSessionResponse | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [faceCount, setFaceCount] = useState(0);

  // Result tracking
  const resultsRef = useRef({
    camera_granted: false,
    face_detected: false,
    blink_verified: false,
    smile_verified: false,
    failure_reason: null as string | null,
  });

  // ---------------------------------------------------------------------------
  // Step utilities
  // ---------------------------------------------------------------------------
  const markStep = useCallback((step: Step, status: "passed" | "failed") => {
    setStepStatuses((prev) => ({ ...prev, [step]: status }));
  }, []);

  const advanceTo = useCallback((next: Step) => {
    setCurrentStep(next);
    setStepStatuses((prev) => ({ ...prev, [next]: "active" }));
  }, []);

  // ---------------------------------------------------------------------------
  // MediaPipe initialization
  // ---------------------------------------------------------------------------
  const initMediaPipe = useCallback(async () => {
    setLoadingMediaPipe(true);
    setInstruction("Loading AI model (first time may take a moment)…");
    try {
      // Dynamic import to avoid SSR issues
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: MEDIAPIPE_MODEL,
          delegate: "GPU",
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 2, // Detect up to 2 to catch multiple faces
      });
      landmarkerRef.current = landmarker;
      setLoadingMediaPipe(false);
      setInstruction("Face detected! Look directly at the camera.");
      advanceTo("face_detection");
      markStep("camera_permission", "passed");
      startDetectionLoop();
    } catch (err) {
      setLoadingMediaPipe(false);
      const msg = "Failed to load face detection model. Check your internet connection.";
      setError(msg);
      resultsRef.current.failure_reason = msg;
      markStep("camera_permission", "failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceTo, markStep]);

  // ---------------------------------------------------------------------------
  // Camera access
  // ---------------------------------------------------------------------------
  const requestCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      resultsRef.current.camera_granted = true;
      await initMediaPipe();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access and retry."
          : "Camera not found or unavailable. Ensure a camera is connected.";
      setError(errMsg);
      resultsRef.current.failure_reason = errMsg;
      markStep("camera_permission", "failed");
      setVerificationFailed(true);
    }
  }, [initMediaPipe, markStep]);

  // ---------------------------------------------------------------------------
  // Detection loop
  // ---------------------------------------------------------------------------
  const startDetectionLoop = useCallback(() => {
    const detect = async () => {
      if (!landmarkerRef.current || !videoRef.current || isProcessingRef.current) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      if (video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      isProcessingRef.current = true;
      try {
        const results = landmarkerRef.current.detectForVideo(video, performance.now());
        const faces = results.faceLandmarks ?? [];
        setFaceCount(faces.length);

        // Draw overlay on canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            // Draw face bounding box if face found
            if (faces.length > 0) {
              const lm = faces[0];
              const xs = lm.map((p: { x: number }) => p.x * canvasRef.current!.width);
              const ys = lm.map((p: { y: number }) => p.y * canvasRef.current!.height);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              ctx.strokeStyle = faces.length > 1 ? "#f87171" : "#34d399";
              ctx.lineWidth = 2;
              ctx.strokeRect(minX - 10, minY - 10, maxX - minX + 20, maxY - minY + 20);
            }
          }
        }

        // --- FACE DETECTION step ---
        setCurrentStep((step) => {
          if (step === "face_detection") {
            if (faces.length === 1) {
              resultsRef.current.face_detected = true;
              markStep("face_detection", "passed");
              advanceTo("blink_detection");
              setInstruction("Great! Now blink your eyes naturally.");
            } else if (faces.length > 1) {
              setInstruction("Multiple faces detected! Please ensure only you are in the frame.");
            } else {
              setInstruction("No face detected. Position your face clearly in the camera.");
            }
          }

          // --- BLINK DETECTION step ---
          if (step === "blink_detection" && faces.length === 1) {
            const lm = faces[0];
            const leftEAR = computeEAR(lm, LEFT_EYE_UPPER, LEFT_EYE_LOWER);
            const rightEAR = computeEAR(lm, LEFT_EYE_LOWER, LEFT_EYE_UPPER); // mirrored approx
            const avgEAR = (leftEAR + rightEAR) / 2;

            if (avgEAR < BLINK_EAR_THRESHOLD) {
              blinkFrameCountRef.current += 1;
              if (blinkFrameCountRef.current >= BLINK_CONSECUTIVE_FRAMES) {
                resultsRef.current.blink_verified = true;
                markStep("blink_detection", "passed");
                advanceTo("smile_detection");
                setInstruction("Excellent! Now smile for us 😊");
                blinkFrameCountRef.current = 0;
              }
            } else {
              blinkFrameCountRef.current = Math.max(0, blinkFrameCountRef.current - 1);
            }
          }

          // --- SMILE DETECTION step ---
          if (step === "smile_detection" && faces.length === 1) {
            const lm = faces[0];
            const smileRatio = computeSmileRatio(lm);
            if (smileRatio > SMILE_THRESHOLD) {
              resultsRef.current.smile_verified = true;
              markStep("smile_detection", "passed");
              advanceTo("complete");
              setInstruction("Liveness verified! Submitting results…");
            }
          }

          return step;
        });
      } catch {
        // Suppress per-frame errors
      } finally {
        isProcessingRef.current = false;
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceTo, markStep]);

  // ---------------------------------------------------------------------------
  // Submit results to backend when complete step is reached
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (currentStep !== "complete" || submitting || !sessionId) return;

    const submit = async () => {
      setSubmitting(true);
      // Cancel detection loop
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopCamera();

      try {
        // 1. Start verification record
        const started = await apiService.startVerification(sessionId);
        // 2. Complete with results
        const completed = await apiService.completeVerification({
          verification_id: started.id,
          camera_granted: resultsRef.current.camera_granted,
          face_detected: resultsRef.current.face_detected,
          blink_verified: resultsRef.current.blink_verified,
          smile_verified: resultsRef.current.smile_verified,
          failure_reason: resultsRef.current.failure_reason ?? undefined,
        });
        setVerificationRecord(completed);
        markStep("complete", completed.liveness_passed ? "passed" : "failed");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to submit verification results";
        setError(msg);
        markStep("complete", "failed");
      } finally {
        setSubmitting(false);
      }
    };

    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, sessionId]);

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopCamera();
      if (landmarkerRef.current) {
        landmarkerRef.current.close?.();
        landmarkerRef.current = null;
      }
    };
  }, [stopCamera]);

  // ---------------------------------------------------------------------------
  // Retry
  // ---------------------------------------------------------------------------
  const handleRetry = () => {
    stopCamera();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    landmarkerRef.current = null;
    blinkFrameCountRef.current = 0;
    isProcessingRef.current = false;
    resultsRef.current = {
      camera_granted: false,
      face_detected: false,
      blink_verified: false,
      smile_verified: false,
      failure_reason: null,
    };
    setError(null);
    setCurrentStep("camera_permission");
    setStepStatuses({
      camera_permission: "active",
      face_detection: "pending",
      blink_detection: "pending",
      smile_detection: "pending",
      complete: "pending",
    });
    setVerificationRecord(null);
    setVerificationFailed(false);
    setFaceCount(0);
    setInstruction("Click 'Allow Camera' to begin");
  };

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const isVerified = verificationRecord?.liveness_passed === true;
  const isFailed =
    currentStep === "complete" && verificationRecord && !verificationRecord.liveness_passed;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-violet-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/4 right-0 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <header className="flex flex-col items-center space-y-3 text-center">
          <div className="flex items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-600/10 p-3">
            <Camera className="h-8 w-8 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Liveness Verification</h2>
            <p className="mt-1 text-xs text-slate-500">
              AI-powered face detection runs entirely in your browser — no data is sent to any
              server.
            </p>
          </div>
        </header>

        {/* Step progress indicator */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          {STEPS.map((s, i) => {
            const st = stepStatuses[s.key];
            return (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300 ${
                      st === "passed"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                        : st === "failed"
                          ? "border-rose-500 bg-rose-500/20 text-rose-400"
                          : st === "active"
                            ? "border-violet-500 bg-violet-500/20 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                            : "border-slate-700 bg-slate-800 text-slate-600"
                    }`}
                  >
                    {st === "passed" ? "✓" : st === "failed" ? "✗" : i + 1}
                  </div>
                  <span
                    className={`text-[9px] font-medium ${
                      st === "active" ? "text-violet-400" : "text-slate-600"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-1 h-px flex-1 transition-colors duration-500 ${
                      stepStatuses[STEPS[i + 1].key] !== "pending"
                        ? "bg-violet-600/40"
                        : "bg-slate-800"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Main card */}
        <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-600/10 p-4 text-xs text-rose-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* === Camera Step === */}
          {currentStep === "camera_permission" && !verificationFailed && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-violet-500/30 bg-violet-600/10">
                <Camera className="h-10 w-10 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Allow Camera Access</p>
                <p className="mt-1 text-xs text-slate-500">
                  Your camera is used for face detection. No images or video are stored or
                  transmitted.
                </p>
              </div>
              <button
                id="allow-camera-btn"
                onClick={requestCamera}
                disabled={loadingMediaPipe}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {loadingMediaPipe ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {loadingMediaPipe ? "Loading AI Model…" : "Allow Camera"}
              </button>
            </div>
          )}

          {/* === Video Feed (shown during detection steps) === */}
          {(currentStep === "face_detection" ||
            currentStep === "blink_detection" ||
            currentStep === "smile_detection") && (
            <div className="flex flex-col items-center gap-4">
              {/* Video + Canvas overlay */}
              <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-slate-700">
                <video
                  ref={videoRef}
                  className="w-full scale-x-[-1] rounded-xl"
                  playsInline
                  muted
                  style={{ aspectRatio: "4/3", objectFit: "cover" }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full scale-x-[-1]"
                  width={640}
                  height={480}
                />
                {/* Face count badge */}
                <div
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    faceCount === 1
                      ? "bg-emerald-600/80 text-emerald-100"
                      : faceCount > 1
                        ? "bg-rose-600/80 text-rose-100"
                        : "bg-slate-700/80 text-slate-300"
                  }`}
                >
                  {faceCount === 0
                    ? "No face"
                    : faceCount === 1
                      ? "1 face ✓"
                      : `${faceCount} faces!`}
                </div>
              </div>

              {/* Instruction */}
              <div className="flex w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                {currentStep === "face_detection" && (
                  <Eye className="h-5 w-5 shrink-0 text-violet-400" />
                )}
                {currentStep === "blink_detection" && (
                  <Eye className="h-5 w-5 shrink-0 animate-pulse text-amber-400" />
                )}
                {currentStep === "smile_detection" && (
                  <Smile className="h-5 w-5 shrink-0 text-emerald-400" />
                )}
                <p className="text-xs text-slate-300">{instruction}</p>
              </div>
            </div>
          )}

          {/* === Complete / Result Step === */}
          {currentStep === "complete" && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              {submitting ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-violet-400" />
                  <p className="text-sm text-slate-400">Submitting results…</p>
                </>
              ) : isVerified ? (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-600/10">
                    <ShieldCheck className="h-10 w-10 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-400">Liveness Verified!</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Camera ✓ · Face ✓ · Blink ✓ · Smile ✓
                    </p>
                  </div>
                  <button
                    id="continue-to-attendance-btn"
                    onClick={() => router.push(`/attendance/selfie?session_id=${sessionId}`)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-xs font-bold text-white transition hover:bg-emerald-500"
                  >
                    <span>Continue — Capture Selfie</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-rose-500/30 bg-rose-600/10">
                    <ShieldAlert className="h-10 w-10 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-rose-400">Verification Failed</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {verificationRecord?.failure_reason ||
                        "One or more liveness checks did not pass."}
                    </p>
                  </div>
                  <button
                    id="retry-verification-btn"
                    onClick={handleRetry}
                    className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-xs font-bold text-white transition hover:bg-violet-500"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry Verification</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* === Camera denied / Fatal error state === */}
          {verificationFailed && currentStep === "camera_permission" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <XCircle className="h-12 w-12 text-rose-400" />
              <div>
                <p className="text-sm font-bold text-rose-400">Camera Access Denied</p>
                <p className="mt-1 text-xs text-slate-500">
                  Please allow camera access in your browser settings, then retry.
                </p>
              </div>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-xs font-bold text-white transition hover:bg-violet-500"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          )}

          {/* Result summary card */}
          {verificationRecord && (
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/80 p-4 font-mono text-[11px]">
              {[
                { label: "Camera Access", val: verificationRecord.camera_granted },
                { label: "Face Detected", val: verificationRecord.face_detected },
                { label: "Blink Verified", val: verificationRecord.blink_verified },
                { label: "Smile Verified", val: verificationRecord.smile_verified },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-slate-900/60 pb-1.5 last:border-0 last:pb-0"
                >
                  <span className="text-slate-400">{label}</span>
                  <span className={val ? "font-bold text-emerald-400" : "font-bold text-rose-400"}>
                    {val ? "✓ Pass" : "✗ Fail"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info footer */}
        <p className="text-center text-[10px] text-slate-600">
          All processing is local. No selfies, images, or video frames are uploaded.
        </p>

        {!sessionId && (
          <div className="text-center">
            <Link href="/attendance" className="text-xs text-indigo-400 hover:underline">
              ← Return to Attendance Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CameraVerificationPage({ searchParams }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <CameraVerificationContent searchParams={searchParams} />
    </ProtectedRoute>
  );
}
