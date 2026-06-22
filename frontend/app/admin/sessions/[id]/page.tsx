"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";
import { apiService, AttendanceSession } from "../../../../services/api";
import {
  Shield,
  ArrowLeft,
  Loader2,
  Calendar,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Clock,
  Hash,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function SessionDetailsContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [description, setDescription] = useState("");

  const router = useRouter();

  const fetchSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getSession(sessionId);
      setSession(data);
      setTitle(data.title);
      setSubject(data.subject);
      setClassName(data.class_name);
      setDescription(data.description || "");
    } catch (err: any) {
      setError(err.message || "Failed to load session details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const handleStart = async () => {
    setIsSaving(true);
    try {
      await apiService.startSession(sessionId);
      setSuccessMsg("Session started successfully!");
      setTimeout(() => {
        router.push("/admin/sessions/active");
      }, 1000);
    } catch (err: any) {
      alert(err.message || "Failed to start session");
      setIsSaving(false);
    }
  };

  const handleEnd = async () => {
    setIsSaving(true);
    try {
      const data = await apiService.endSession(sessionId);
      setSession(data);
      setSuccessMsg("Session ended successfully!");
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      alert(err.message || "Failed to end session");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReopen = async () => {
    setIsSaving(true);
    try {
      const data = await apiService.reopenSession(sessionId);
      setSession(data);
      setSuccessMsg("Session reopened successfully!");
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      alert(err.message || "Failed to reopen session");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    setIsSaving(true);
    try {
      await apiService.deleteSession(sessionId);
      router.push("/admin/sessions");
    } catch (err: any) {
      alert(err.message || "Failed to delete session");
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!title.trim() || !subject.trim() || !className.trim()) {
      alert("Required fields must not be empty.");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await apiService.updateSession(sessionId, {
        title: title.trim(),
        subject: subject.trim(),
        class_name: className.trim(),
        description: description.trim() || undefined,
      });
      setSession(updated);
      setIsEditing(false);
      setSuccessMsg("Session updated successfully!");
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      alert(err.message || "Failed to update session");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: AttendanceSession["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-600/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Active
          </span>
        );
      case "REOPENED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-600/10 px-3 py-1 text-xs font-semibold text-purple-400">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            Reopened
          </span>
        );
      case "ENDED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
            Ended
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-400">
            Draft
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-4 text-xs text-slate-500">Querying session details...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="text-md mt-4 font-bold">Failed to load session</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">{error || "Record not found."}</p>
        <Link
          href="/admin/sessions"
          className="mt-6 text-xs font-semibold text-blue-400 hover:underline"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumb */}
        <Link
          href="/admin/sessions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Card */}
        <div className="glass-panel relative rounded-2xl border border-slate-800 bg-slate-950/60 p-8">
          {/* Success Banner */}
          {successMsg && (
            <div className="animate-fadeIn mb-6 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-600/10 p-4 text-xs text-emerald-400">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Heading */}
          <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-900 pb-5 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="glow-primary rounded-lg border border-indigo-500/20 bg-indigo-600/10 p-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight text-white">Session Parameters</h2>
                <p className="mt-0.5 text-xs text-slate-500">Session ID: #{session.id}</p>
              </div>
            </div>
            <div>{getStatusBadge(session.status)}</div>
          </div>

          {/* Body details / edit form */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                    Subject
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                    Class Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Save Updates</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setTitle(session.title);
                    setSubject(session.subject);
                    setClassName(session.class_name);
                    setDescription(session.description || "");
                  }}
                  disabled={isSaving}
                  className="flex-1 cursor-pointer rounded-lg border border-slate-800 bg-slate-900/60 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Session Title
                  </h4>
                  <p className="mt-1 text-sm font-semibold text-white">{session.title}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Subject & Class
                  </h4>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {session.subject}{" "}
                    <span className="font-normal text-slate-400">({session.class_name})</span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Description
                </h4>
                <p className="text-slate-350 mt-1 text-xs leading-relaxed">
                  {session.description || "No topic description provided."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 border-b border-t border-slate-900/60 py-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-500" />
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Scheduled Window
                    </h5>
                    <p className="mt-0.5 text-[11px] text-slate-300">
                      Start:{" "}
                      {session.start_time ? new Date(session.start_time).toLocaleString() : "TBD"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      End: {session.end_time ? new Date(session.end_time).toLocaleString() : "TBD"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-slate-500" />
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Security Access Code
                    </h5>
                    <p className="mt-0.5 font-mono text-sm font-bold text-blue-400">
                      {session.session_code || "Generated when session starts"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="pt-2">
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Management Commands
                </h4>

                {session.status === "DRAFT" && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={handleStart}
                      disabled={isSaving}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span>Launch Live Session</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      disabled={isSaving}
                      className="hover:bg-slate-850 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 py-3 text-xs font-bold text-slate-300 transition disabled:opacity-50"
                    >
                      <Edit2 className="h-4 w-4 text-slate-400" />
                      <span>Edit Parameters</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="text-red-450 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-600/10 py-3 text-xs font-bold transition hover:bg-red-600/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                      <span>Delete Record</span>
                    </button>
                  </div>
                )}

                {(session.status === "ACTIVE" || session.status === "REOPENED") && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleEnd}
                      disabled={isSaving}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 py-3 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      <span>Close Attendance Session</span>
                    </button>
                    <Link
                      href="/admin/sessions/active"
                      className="hover:bg-slate-850 flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 py-3 text-center text-xs font-bold text-slate-300 transition"
                    >
                      <span>Show Live Timer Console</span>
                    </Link>
                  </div>
                )}

                {session.status === "ENDED" && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleReopen}
                      disabled={isSaving}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 text-xs font-bold text-white transition hover:bg-purple-500 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      <span>Reopen Attendance Collection</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="text-red-450 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-600/10 py-3 text-xs font-bold transition hover:bg-red-600/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                      <span>Delete Record</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionDetailsPage({ params }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <SessionDetailsContent params={params} />
    </ProtectedRoute>
  );
}
