"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService, QRValidateResponse } from "../../../services/api";
import {
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  QrCode,
  ArrowRight,
  BookOpen,
  User as UserIcon,
  Hash,
} from "lucide-react";

function StudentScanContent() {
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation outcome
  const [validationResult, setValidationResult] = useState<QRValidateResponse | null>(null);
  const [successMode, setSuccessMode] = useState(false);
  const [workflowSuccess, setWorkflowSuccess] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationResult(null);

    const formattedToken = tokenInput.trim();
    if (!formattedToken) {
      setError("Please enter the scanned token value.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.validateQr(formattedToken);
      if (!response.valid) {
        setError(
          "This QR code token is invalid or has expired. Please scan the refreshed projector QR.",
        );
        return;
      }
      setValidationResult(response);
      setSuccessMode(true);
    } catch (err: any) {
      setError(err.message || "Failed to validate QR token. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    setWorkflowSuccess(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />

      <div className="w-full max-w-md space-y-6">
        {/* Header logo */}
        <header className="mb-4 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="glow-primary flex items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10 p-3">
            <QrCode className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Attendance Verification</h2>
            <p className="mt-1 text-xs text-slate-500">
              Scan projector QR to unlock attendance checks
            </p>
          </div>
        </header>

        {/* Success complete screen */}
        {workflowSuccess ? (
          <div className="glass-panel animate-fadeIn relative space-y-6 rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-8 text-center">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl" />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-600/10">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-md font-bold text-white">QR Code Verified Successfully</h3>
              <p className="mx-auto max-w-xs text-xs leading-relaxed text-slate-400">
                QR signature validation complete! Next verification step: **Classroom Location
                Geofencing** and **Biometric Facial scan** will launch here in the next branch.
              </p>
            </div>
            <button
              onClick={() => {
                setWorkflowSuccess(false);
                setSuccessMode(false);
                setTokenInput("");
                setValidationResult(null);
              }}
              className="cursor-pointer text-xs font-bold text-blue-400 hover:text-blue-300"
            >
              Verify Another Class
            </button>
          </div>
        ) : successMode && validationResult ? (
          /* Confirmation details card */
          <div className="glass-panel animate-fadeIn space-y-6 rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-8">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-600/10 p-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <span>Token Unlocked</span>
            </div>

            <div className="space-y-4">
              <div className="border-b border-slate-900 pb-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Session Name
                </span>
                <h4 className="text-md mt-0.5 font-bold text-white">
                  {validationResult.session_title}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-900 pb-3">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Subject
                  </span>
                  <p className="mt-0.5 text-xs font-semibold text-white">
                    {validationResult.subject}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Class Name
                  </span>
                  <p className="mt-0.5 text-xs font-semibold text-white">
                    {validationResult.class_name}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Teacher
                </span>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <UserIcon className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{validationResult.teacher_name}</span>
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleContinue}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-xs font-bold text-white transition hover:bg-blue-500"
              >
                <span>Continue Attendance</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Form QR entry simulation input */
          <div className="glass-panel space-y-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-8">
            {error && (
              <div className="animate-fadeIn flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-600/10 p-4 text-xs text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleValidate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Enter QR Token (Simulation)
                </label>
                <input
                  type="text"
                  required
                  className="placeholder-slate-650 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. qr_session_id_token_value"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  disabled={loading}
                />
                <p className="text-slate-550 text-[10px] leading-relaxed">
                  * Note: In a production environment, this is scanned automatically via device
                  camera. Enter/paste the rotated token from the teacher's screen to test.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Validate Token</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentScanPage() {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <StudentScanContent />
    </ProtectedRoute>
  );
}
