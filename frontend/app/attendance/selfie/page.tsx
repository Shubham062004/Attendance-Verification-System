"use client";

import React, { useCallback, useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import {
  apiService,
  AttendanceEvidenceResponse,
  UploadSignatureResponse,
} from "../../../services/api";
import {
  Camera,
  CheckCircle,
  RefreshCw,
  Upload,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ImageIcon,
  Trash2,
  ZoomIn,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
type Step = "preview" | "capture" | "uploading" | "success";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_DIMENSION = 400; // px
const COMPRESS_QUALITY = 0.82;
const COMPRESS_MAX_PX = 1280; // resize longest side to this

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

// ---------------------------------------------------------------------------
// Image utilities
// ---------------------------------------------------------------------------

/**
 * Capture a still frame from a <video> element, optionally mirroring it
 * (front-camera is usually mirrored for preview but we un-mirror for the selfie).
 */
function captureFrame(video: HTMLVideoElement, mirror = false): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", COMPRESS_QUALITY);
}

/**
 * Compress + resize a data-URL image to within the max dimension limit.
 * Returns a Blob and metadata.
 */
async function compressImage(
  dataUrl: string,
): Promise<{ blob: Blob; width: number; height: number; size: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (Math.max(width, height) > COMPRESS_MAX_PX) {
        const ratio = COMPRESS_MAX_PX / Math.max(width, height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Failed to compress image"));
          resolve({ blob, width, height, size: blob.size });
        },
        "image/jpeg",
        COMPRESS_QUALITY,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

/**
 * Upload a Blob directly to Cloudinary using the signed parameters from the backend.
 */
async function uploadToCloudinary(
  blob: Blob,
  sig: UploadSignatureResponse,
): Promise<{
  secure_url: string;
  public_id: string;
  bytes: number;
  width: number;
  height: number;
}> {
  const fd = new FormData();
  fd.append("file", blob, "selfie.jpg");
  fd.append("api_key", sig.api_key);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("folder", sig.folder);
  fd.append("public_id", sig.public_id);

  const res = await fetch(sig.upload_url, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Cloudinary upload failed");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function SelfieCaptureContent({ searchParams }: PageProps) {
  const resolvedSearchParams = use(searchParams);
  const sessionIdStr = resolvedSearchParams.session_id;
  const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
  const router = useRouter();

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // State
  const [step, setStep] = useState<Step>("preview");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<AttendanceEvidenceResponse | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Developer sandbox mock toggle
  const [useMock, setUseMock] = useState(false);

  // ---------------------------------------------------------------------------
  // Camera lifecycle
  // ---------------------------------------------------------------------------
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera access denied. Allow camera permission in your browser and retry."
          : "Camera not available. Ensure a camera is connected and accessible.";
      setCameraError(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ---------------------------------------------------------------------------
  // Capture
  // ---------------------------------------------------------------------------
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !cameraReady) return;
    const dataUrl = captureFrame(videoRef.current, false);
    setCapturedDataUrl(dataUrl);
    setStep("capture");
    stopCamera();
  }, [cameraReady, stopCamera]);

  // ---------------------------------------------------------------------------
  // Mock selfie (developer sandbox)
  // ---------------------------------------------------------------------------
  const handleMockCapture = useCallback(async () => {
    // Generate a solid-color 400×400 canvas as mock selfie
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, "#6366f1");
    grad.addColorStop(1, "#8b5cf6");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = "white";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MOCK SELFIE", 200, 180);
    ctx.font = "14px sans-serif";
    ctx.fillText(`Session ${sessionId ?? "N/A"}`, 200, 220);
    ctx.fillText(new Date().toLocaleTimeString(), 200, 250);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedDataUrl(dataUrl);
    setStep("capture");
    stopCamera();
  }, [sessionId, stopCamera]);

  // ---------------------------------------------------------------------------
  // Retake
  // ---------------------------------------------------------------------------
  const handleRetake = useCallback(() => {
    setCapturedDataUrl(null);
    setUploadError(null);
    setStep("preview");
    startCamera();
  }, [startCamera]);

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------
  const handleUpload = useCallback(async () => {
    if (!capturedDataUrl || !sessionId) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress(10);
    setStep("uploading");

    try {
      // 1 — Compress
      setUploadProgress(20);
      const { blob, width, height, size } = await compressImage(capturedDataUrl);

      // Validate dimensions
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        throw new Error(
          `Image too small (${width}×${height}px). Minimum is ${MIN_DIMENSION}×${MIN_DIMENSION}px.`,
        );
      }
      // Validate size
      if (size > MAX_SIZE_BYTES) {
        throw new Error(
          `Image too large (${(size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`,
        );
      }

      setUploadProgress(35);

      // 2 — Get signed upload params from backend
      const sig = await apiService.getUploadSignature(sessionId);
      setUploadProgress(50);

      // 3 — Upload directly to Cloudinary
      const cloudResult = await uploadToCloudinary(blob, sig);
      setUploadProgress(80);

      // 4 — Store metadata in our backend
      const stored = await apiService.storeEvidence({
        session_id: sessionId,
        image_url: cloudResult.secure_url,
        image_public_id: cloudResult.public_id,
        image_size: cloudResult.bytes ?? size,
        image_width: cloudResult.width ?? width,
        image_height: cloudResult.height ?? height,
      });
      setUploadProgress(100);
      setEvidence(stored);
      setStep("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadError(msg);
      setStep("capture"); // go back to preview state
    } finally {
      setUploading(false);
    }
  }, [capturedDataUrl, sessionId]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const StepBadge = ({
    num,
    label,
    active,
    done,
  }: {
    num: number;
    label: string;
    active: boolean;
    done: boolean;
  }) => (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300 ${
          done
            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
            : active
              ? "border-rose-400 bg-rose-500/20 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
              : "border-slate-700 bg-slate-800 text-slate-600"
        }`}
      >
        {done ? "✓" : num}
      </div>
      <span className={`text-[9px] font-medium ${active ? "text-rose-400" : "text-slate-600"}`}>
        {label}
      </span>
    </div>
  );

  const steps = [
    { num: 1, label: "Camera", active: step === "preview", done: step !== "preview" },
    {
      num: 2,
      label: "Preview",
      active: step === "capture",
      done: step === "uploading" || step === "success",
    },
    {
      num: 3,
      label: "Upload",
      active: step === "uploading",
      done: step === "success",
    },
    { num: 4, label: "Done", active: false, done: step === "success" },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100">
      {/* Background glows */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-rose-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/4 right-0 h-96 w-96 rounded-full bg-pink-600/5 blur-3xl" />

      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <header className="flex flex-col items-center space-y-3 text-center">
          <div className="flex items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-600/10 p-3">
            <Camera className="h-8 w-8 text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Selfie Capture</h1>
            <p className="mt-1 text-xs text-slate-500">
              Take an attendance selfie. Image is securely uploaded as proof of presence.
            </p>
          </div>
        </header>

        {/* Step progress */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          {steps.map((s, i) => (
            <React.Fragment key={s.label}>
              <StepBadge {...s} />
              {i < steps.length - 1 && (
                <div
                  className={`mx-1 h-px flex-1 transition-colors duration-500 ${
                    s.done ? "bg-rose-600/40" : "bg-slate-800"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main card */}
        <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          {/* Error banners */}
          {cameraError && step === "preview" && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-600/10 p-4 text-xs text-rose-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Camera Error</p>
                <p className="mt-0.5">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-300 hover:text-white"
                >
                  <RefreshCw className="h-3 w-3" /> Retry Camera
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-600/10 p-4 text-xs text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Upload Failed</p>
                <p className="mt-0.5">{uploadError}</p>
              </div>
            </div>
          )}

          {/* ── STEP 1: Camera Preview ── */}
          {step === "preview" && (
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
                style={{ aspectRatio: "4/3" }}
              >
                <video
                  ref={videoRef}
                  className="h-full w-full scale-x-[-1] rounded-xl object-cover"
                  playsInline
                  muted
                />
                {!cameraReady && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
                    <p className="text-[11px] text-slate-500">Starting camera…</p>
                  </div>
                )}
                {/* Face guide overlay */}
                {cameraReady && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-48 w-36 rounded-full border-2 border-dashed border-rose-400/60" />
                  </div>
                )}
                {/* Ready badge */}
                {cameraReady && (
                  <div className="absolute right-2 top-2 rounded-full bg-emerald-600/80 px-2 py-0.5 text-[9px] font-bold text-emerald-100">
                    Live ●
                  </div>
                )}
              </div>

              <p className="text-center text-[11px] text-slate-500">
                Position your face within the oval guide, then click capture.
              </p>

              <button
                id="capture-selfie-btn"
                onClick={useMock ? handleMockCapture : handleCapture}
                disabled={!cameraReady && !useMock}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 py-3 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-40"
              >
                <Camera className="h-4 w-4" />
                {useMock ? "Capture Mock Selfie" : "Capture Selfie"}
              </button>
            </div>
          )}

          {/* ── STEP 2: Image Preview ── */}
          {step === "capture" && capturedDataUrl && (
            <div className="flex flex-col items-center gap-5">
              <div
                className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
                style={{ aspectRatio: "4/3" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedDataUrl}
                  alt="Captured selfie preview"
                  className="h-full w-full rounded-xl object-cover"
                />
                <div className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-slate-300">
                  <ZoomIn className="mr-0.5 inline h-3 w-3" />
                  Preview
                </div>
              </div>

              <p className="text-center text-[11px] text-slate-500">
                Ensure your face is clearly visible before uploading.
              </p>

              <div className="flex w-full gap-3">
                <button
                  id="retake-selfie-btn"
                  onClick={handleRetake}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-3 text-xs font-bold text-white transition hover:bg-slate-800"
                >
                  <Trash2 className="h-4 w-4 text-slate-400" />
                  Retake
                </button>
                <button
                  id="upload-selfie-btn"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 py-3 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  Upload Selfie
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Uploading ── */}
          {step === "uploading" && (
            <div className="flex flex-col items-center gap-6 py-6 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#1e293b" strokeWidth="4" />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="4"
                    strokeDasharray={`${(uploadProgress / 100) * 150.8} 150.8`}
                    className="transition-all duration-300"
                  />
                </svg>
                <Upload className="h-8 w-8 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Uploading Selfie…</p>
                <p className="mt-1 text-xs text-slate-500">{uploadProgress}% — Please wait</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 4: Success ── */}
          {step === "success" && evidence && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-600/10">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400">Selfie Uploaded!</p>
                <p className="mt-1 text-xs text-slate-500">
                  Your attendance selfie has been securely stored.
                </p>
              </div>

              {/* Evidence details */}
              <div className="w-full space-y-2 rounded-lg border border-slate-800 bg-slate-950/80 p-4 font-mono text-[11px]">
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400">Evidence ID</span>
                  <span className="text-white">#{evidence.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400">Dimensions</span>
                  <span className="text-white">
                    {evidence.image_width ?? "—"}×{evidence.image_height ?? "—"}px
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-400">File Size</span>
                  <span className="text-white">
                    {evidence.image_size ? `${(evidence.image_size / 1024).toFixed(0)} KB` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Uploaded</span>
                  <span className="font-bold text-emerald-400">✓ Stored</span>
                </div>
              </div>

              {/* Thumbnail */}
              {capturedDataUrl && (
                <div className="w-24 overflow-hidden rounded-lg border border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedDataUrl}
                    alt="Selfie thumbnail"
                    className="w-full object-cover"
                  />
                </div>
              )}

              <button
                id="continue-to-submission-btn"
                onClick={() => router.push(`/attendance/review?session_id=${sessionId}`)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                <span>Review &amp; Mark Attendance</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Developer Sandbox ── */}
          <div className="space-y-3 border-t border-slate-900/60 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Developer Sandbox
              </label>
              <button
                type="button"
                onClick={() => setUseMock((v) => !v)}
                className={`rounded px-2.5 py-1 text-[9px] font-bold transition ${
                  useMock ? "bg-amber-600 text-white" : "bg-slate-900 text-slate-400"
                }`}
              >
                {useMock ? "Mock ON" : "Mock OFF"}
              </button>
            </div>

            {useMock && (
              <div className="animate-pulse-once grid grid-cols-2 gap-2">
                <button
                  onClick={handleMockCapture}
                  disabled={step === "uploading" || step === "success"}
                  className="rounded border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-[10px] font-bold text-amber-400 hover:bg-amber-900/40 disabled:opacity-40"
                >
                  <ImageIcon className="mx-auto mb-1 h-3 w-3" />
                  Mock Capture
                </button>
                <button
                  onClick={() => {
                    setUploadError("Simulated upload failure: Network timeout");
                    setStep("capture");
                  }}
                  disabled={step === "uploading" || step === "success"}
                  className="rounded border border-rose-700/40 bg-rose-900/20 px-3 py-2 text-[10px] font-bold text-rose-400 hover:bg-rose-900/40 disabled:opacity-40"
                >
                  <AlertTriangle className="mx-auto mb-1 h-3 w-3" />
                  Fail Upload
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-600">
          Images are stored securely on Cloudinary. Only evidence metadata is retained on our
          servers.
        </p>

        {!sessionId && (
          <div className="text-center">
            <Link href="/attendance" className="text-xs text-rose-400 hover:underline">
              ← Return to Attendance Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SelfieCapturePage({ searchParams }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <SelfieCaptureContent searchParams={searchParams} />
    </ProtectedRoute>
  );
}
