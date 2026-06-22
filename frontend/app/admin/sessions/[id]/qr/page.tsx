"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ProtectedRoute } from "../../../../../components/ProtectedRoute";
import { apiService, AttendanceSession, QRTokenResponse } from "../../../../../services/api";
import {
  Shield,
  ArrowLeft,
  Loader2,
  Clock,
  QrCode,
  BookOpen,
  History,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function LiveQRContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [tokenInfo, setTokenInfo] = useState<QRTokenResponse | null>(null);
  const [history, setHistory] = useState<QRTokenResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [isRotating, setIsRotating] = useState(false);

  const fetchSessionData = async () => {
    try {
      const sess = await apiService.getSession(sessionId);
      setSession(sess);
    } catch (err: any) {
      console.error("Failed to load session details", err);
      setError(err.message || "Failed to load session details.");
    }
  };

  const fetchToken = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRotating(true);
    try {
      const tokenData = await apiService.getCurrentQr(sessionId);
      setTokenInfo(tokenData);

      // Update history list
      const histData = await apiService.getQrHistory(sessionId);
      setHistory(histData.slice(0, 5)); // Keep top 5 latest
    } catch (err: any) {
      console.error("Failed to fetch QR token", err);
      setError(err.message || "Failed to load current QR code.");
    } finally {
      setLoading(false);
      setIsRotating(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
    fetchToken();
  }, [sessionId]);

  // Countdown timer based on token expiration
  useEffect(() => {
    if (!tokenInfo) return;

    const expiryTime = new Date(tokenInfo.expires_at).getTime();

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((expiryTime - now) / 1000));
      setSecondsLeft(diff);

      if (diff <= 0) {
        clearInterval(timer);
        // Token has expired, trigger rotation
        fetchToken(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenInfo]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-4 text-xs text-slate-500">Initializing secure live QR stream...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="text-md mt-4 font-bold">Failed to load QR Screen</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">{error || "Record not found."}</p>
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="mt-6 text-xs font-semibold text-blue-400 hover:underline"
        >
          Return to Session details
        </Link>
      </div>
    );
  }

  // QR Code Image URL using public QR Server API
  const qrCodeUrl = tokenInfo
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tokenInfo.token)}&color=0-0-0&bgcolor=255-255-255`
    : "";

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-slate-950 text-slate-100">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/4 -right-1/4 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Session Details</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Display Mode
          </span>
        </div>
      </header>

      {/* Main content grid */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-12 p-6 md:flex-row">
        {/* QR Display Card (Optimized for project screens) */}
        <div className="glass-panel relative flex w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center shadow-2xl">
          {isRotating && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-950/80">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="mt-2 text-[10px] text-slate-400">Rotating token...</p>
            </div>
          )}

          {/* QR Container */}
          <div className="flex h-64 w-64 items-center justify-center rounded-xl border border-slate-800 bg-white p-4 shadow-lg">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Verification QR Code"
                className="h-full w-full object-contain"
              />
            ) : (
              <QrCode className="h-24 w-24 text-slate-300" />
            )}
          </div>

          {/* Countdown & Rotation info */}
          <div className="mt-6 w-full space-y-3">
            <div className="border-slate-850 flex items-center justify-between rounded-xl border bg-slate-900/60 px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Next Refresh In
              </span>
              <span className="flex items-center gap-1.5 font-mono text-sm font-bold text-emerald-400">
                <Clock className="h-4 w-4 shrink-0 text-emerald-500" />
                {secondsLeft}s
              </span>
            </div>

            <div className="h-1 w-full rounded-full bg-slate-900">
              <div
                className="h-1 rounded-full bg-emerald-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsLeft / 30) * 100}%` }}
              />
            </div>

            <p className="text-slate-550 text-[10px] leading-relaxed">
              * Please display this screen clearly on the projector. Screenshot check is active.
            </p>
          </div>
        </div>

        {/* Session details sidebar */}
        <div className="w-full max-w-md space-y-6">
          <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
              <BookOpen className="h-3 w-3" />
              Active Session
            </span>
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-white">{session.title}</h2>
              <p className="text-xs text-slate-400">
                Course: <span className="font-semibold text-white">{session.subject}</span> |
                Section: <span className="font-semibold text-white">{session.class_name}</span>
              </p>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              {session.description || "No topic description provided."}
            </p>
          </div>

          {/* Token history status list */}
          <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
            <h3 className="flex items-center gap-2 border-b border-slate-900 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              <History className="h-4 w-4 text-indigo-400" />
              Token Rotation Log (Recent 5)
            </h3>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div
                  key={h.token}
                  className="flex items-center justify-between rounded border border-slate-900 bg-slate-900/60 p-2 font-mono text-[11px]"
                >
                  <span className="text-slate-450 max-w-[180px] truncate">{h.token}</span>
                  {h.is_active && new Date(h.expires_at).getTime() > Date.now() ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-400">
                      <CheckCircle className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="text-slate-550">Expired</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="text-slate-650 relative z-10 border-t border-slate-900 px-6 py-4 text-center text-[10px]">
        Smart Attendance Verification System © 2026. Cryptographically locked.
      </footer>
    </div>
  );
}

export default function LiveQRPage({ params }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <LiveQRContent params={params} />
    </ProtectedRoute>
  );
}
