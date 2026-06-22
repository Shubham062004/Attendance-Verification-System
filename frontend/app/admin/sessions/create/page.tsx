"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";
import { apiService } from "../../../../services/api";
import { Shield, ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";

function CreateSessionContent() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim() || !subject.trim() || !className.trim()) {
      setError("Title, Subject, and Class Name are required.");
      return;
    }

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) {
        setError("End Time must be after Start Time.");
        return;
      }
    }

    setLoading(true);
    try {
      await apiService.createSession({
        title: title.trim(),
        subject: subject.trim(),
        class_name: className.trim(),
        description: description.trim() || undefined,
        start_time: startTime ? new Date(startTime).toISOString() : undefined,
        end_time: endTime ? new Date(endTime).toISOString() : undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/sessions");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />

      <div className="mx-auto max-w-xl space-y-6">
        {/* Breadcrumb Navigation */}
        <Link
          href="/admin/sessions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sessions</span>
        </Link>

        {/* Card */}
        <div className="glass-panel relative rounded-2xl border border-slate-800 bg-slate-950/60 p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-900 pb-4">
            <div className="glow-primary rounded-lg border border-blue-500/20 bg-blue-600/10 p-2">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-white">Create Session</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Initialize a new attendance tracking session
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="animate-fadeIn mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-600/10 p-4 text-xs text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="animate-fadeIn mb-6 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-600/10 p-4 text-xs text-emerald-400">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>Session created successfully! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Session Title
              </label>
              <input
                type="text"
                className="placeholder-slate-650 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. CSE-402 Lecture"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading || success}
                required
              />
            </div>

            {/* Subject & Class (Grid) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Subject
                </label>
                <input
                  type="text"
                  className="placeholder-slate-650 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Computer Architecture"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading || success}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Class Name
                </label>
                <input
                  type="text"
                  className="placeholder-slate-650 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. CSE-A"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  disabled={loading || success}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                className="placeholder-slate-650 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Topic details or student instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading || success}
              />
            </div>

            {/* Schedule Start & End times */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Start Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading || success}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  End Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading || success}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || success}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Save Session (As Draft)</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CreateSessionPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <CreateSessionContent />
    </ProtectedRoute>
  );
}
