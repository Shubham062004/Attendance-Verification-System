"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService } from "../../../services/api";
import {
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  QrCode,
  ArrowRight,
  Camera,
  CameraOff,
  ScanLine,
  BookOpen,
  User as UserIcon,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────
type ScanPhase = "scanning" | "validating" | "success" | "error";

interface SessionInfo {
  session_id: number;
  session_title: string;
  subject: string;
  class_name: string;
  teacher_name: string;
}

// ── QR Scanner Component ──────────────────────────────────────────────────
function QRCamera({ onDecode, active }: { onDecode: (text: string) => void; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<any>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const startScanner = useCallback(async () => {
    setCamError(null);
    setReady(false);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      readerRef.current = new BrowserQRCodeReader();

      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      // Prefer back camera
      const backCam = devices.find(
        (d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment"),
      );
      const deviceId = backCam?.deviceId ?? devices[devices.length - 1]?.deviceId;

      if (!deviceId && devices.length === 0) {
        setCamError("No camera device detected on this device.");
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const result = await readerRef.current.decodeFromConstraints(
        constraints,
        videoRef.current!,
        (result: any, err: any) => {
          if (result) {
            onDecode(result.getText());
          }
        },
      );
      setReady(true);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setCamError(
          "Camera permission denied. Please allow camera access in your browser settings.",
        );
      } else if (err?.name === "NotFoundError") {
        setCamError("No camera found on this device. Use a device with a camera to scan QR codes.");
      } else {
        setCamError(err?.message ?? "Failed to start camera.");
      }
    }
  }, [onDecode]);

  const stopScanner = useCallback(() => {
    try {
      readerRef.current?.reset?.();
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (active) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [active, startScanner, stopScanner]);

  if (camError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-600/5 p-8 text-center">
        <CameraOff className="h-10 w-10 text-red-400" />
        <div>
          <p className="mb-1 text-sm font-bold text-red-400">Camera Error</p>
          <p className="text-xs leading-relaxed text-slate-400">{camError}</p>
        </div>
        <button
          onClick={startScanner}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-black">
      {/* Video */}
      <video ref={videoRef} className="w-full" muted playsInline autoPlay />

      {/* Overlay when not ready */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="mt-3 text-xs text-slate-400">Starting camera...</p>
        </div>
      )}

      {/* Scan frame overlay */}
      {ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-52 w-52">
            {/* Corner brackets */}
            <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-blue-400" />
            <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-blue-400" />
            <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-blue-400" />
            <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-blue-400" />
            {/* Scan line animation */}
            <div className="absolute left-1 right-1 top-2 h-0.5 animate-[scan_2s_ease-in-out_infinite] bg-blue-400/70 shadow-sm shadow-blue-400" />
          </div>
        </div>
      )}

      {/* Ready label */}
      {ready && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-slate-900/80 px-3 py-1 backdrop-blur-sm">
            <ScanLine className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[11px] font-semibold text-blue-400">Scanning for QR code…</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
function StudentScanContent() {
  const router = useRouter();
  const [phase, setPhase] = useState<ScanPhase>("scanning");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  const handleDecode = useCallback(
    async (text: string) => {
      // Debounce — only process once
      if (processedRef.current || phase !== "scanning") return;
      processedRef.current = true;

      setPhase("validating");
      setError(null);

      try {
        const response = await apiService.validateQr(text.trim());
        if (!response.valid || !response.session_id) {
          setError(
            "This QR code is invalid or has expired. Please wait for the session QR to refresh on the projector.",
          );
          setPhase("error");
          return;
        }
        setSessionInfo({
          session_id: response.session_id,
          session_title: response.session_title || "Unknown Session",
          subject: response.subject || "Unknown Subject",
          class_name: response.class_name || "Unknown Class",
          teacher_name: response.teacher_name || "Unknown Teacher",
        });
        setPhase("success");
      } catch (err: any) {
        setError(err?.message ?? "Failed to validate QR. Please try again.");
        setPhase("error");
      }
    },
    [phase],
  );

  const resetScan = () => {
    processedRef.current = false;
    setError(null);
    setSessionInfo(null);
    setPhase("scanning");
  };

  const handleContinue = () => {
    if (sessionInfo?.session_id) {
      router.push(`/attendance/location?session_id=${sessionInfo.session_id}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="bg-blue-600/6 absolute -top-32 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            href="/schedule"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400 transition hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Schedule
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/15">
              <Shield className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-sm font-bold text-white">Scan QR Code</p>
          </div>
          <div className="w-20" /> {/* spacer */}
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
            1
          </div>
          <span className="text-xs font-semibold text-white">Scan QR Code</span>
          <div className="mx-1 h-px flex-1 bg-slate-800" />
          {["2", "3", "4", "5", "6"].map((n) => (
            <div
              key={n}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-600"
            >
              {n}
            </div>
          ))}
        </div>

        {/* ── Phase: scanning ── */}
        {phase === "scanning" && (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="mb-1 text-xl font-bold text-white">Point Camera at QR Code</h1>
              <p className="text-xs text-slate-400">
                Scan the session QR displayed on the classroom projector.
              </p>
            </div>
            <QRCamera onDecode={handleDecode} active={phase === "scanning"} />
            <p className="text-center text-xs text-slate-600">
              Ensure good lighting. Hold steady with the QR fully in frame.
            </p>
          </div>
        )}

        {/* ── Phase: validating ── */}
        {phase === "validating" && (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10">
              <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
            </div>
            <div>
              <p className="mb-1 text-base font-bold text-white">Validating QR Code…</p>
              <p className="text-xs text-slate-400">Verifying session token with server.</p>
            </div>
          </div>
        )}

        {/* ── Phase: error ── */}
        {phase === "error" && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-600/5 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-600/10">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <p className="mb-2 text-base font-bold text-red-400">QR Validation Failed</p>
                <p className="text-xs leading-relaxed text-slate-400">{error}</p>
              </div>
              <button
                onClick={resetScan}
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ── Phase: success ── */}
        {phase === "success" && sessionInfo && (
          <div className="space-y-5">
            {/* Success header */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-600/10 shadow-lg shadow-emerald-500/15">
                <CheckCircle className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-600/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  QR Verified
                </div>
                <h1 className="text-xl font-bold text-white">Session Unlocked</h1>
              </div>
            </div>

            {/* Session info card */}
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Session
                </p>
                <p className="text-base font-bold text-white">{sessionInfo.session_title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Subject
                  </p>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                    <p className="text-sm font-semibold text-white">{sessionInfo.subject}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Class
                  </p>
                  <p className="text-sm font-semibold text-white">{sessionInfo.class_name}</p>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Teacher
                </p>
                <div className="flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 text-indigo-400" />
                  <p className="text-sm font-semibold text-slate-300">{sessionInfo.teacher_name}</p>
                </div>
              </div>
            </div>

            {/* Continue button */}
            <button
              onClick={handleContinue}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500"
            >
              Continue to Location Verification
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </main>

      {/* Scan line animation */}
      <style>{`
        @keyframes scan {
          0%   { top: 8px; opacity: 1; }
          50%  { top: calc(100% - 8px); opacity: 0.8; }
          100% { top: 8px; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function StudentScanPage() {
  return (
    <ProtectedRoute allowedRoles={["Student", "Developer"]}>
      <StudentScanContent />
    </ProtectedRoute>
  );
}
