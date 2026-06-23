"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";
import { apiService, StudentDetailResponse } from "../../../../services/api";
import {
  ArrowLeft,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Percent,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function AdminStudentDetailContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const studentId = parseInt(resolvedParams.id, 10);

  const [student, setStudent] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStudentDetail(studentId);
      setStudent(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
        <AlertCircleWrapper />
        <p className="text-sm text-slate-400">{error || "Student details not found"}</p>
        <Link href="/admin/history" className="text-xs text-indigo-400 hover:underline">
          ← Back to Student History
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "text-emerald-400 bg-emerald-950/30 border-emerald-800/40";
      case "FLAGGED":
        return "text-amber-400 bg-amber-950/30 border-amber-800/40";
      case "REJECTED":
        return "text-rose-400 bg-rose-950/30 border-rose-800/40";
      case "ABSENT":
        return "text-slate-500 bg-slate-900 border-slate-805";
      default:
        return "text-slate-400 bg-slate-900 border-slate-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "FLAGGED":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-rose-400" />;
      case "ABSENT":
        return <XCircle className="h-4 w-4 text-slate-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <Link
          href="/admin/history"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to History Portal
        </Link>

        {/* Title */}
        <div className="flex flex-col gap-4 border-b border-slate-900 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <User className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{student.name || "Student Profile"}</h1>
              <p className="text-xs text-slate-500">
                {student.email} · Reg No: {student.registration_number || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Attendance %",
              value: `${Math.round(student.attendance_percentage)}%`,
              desc: "Required threshold: 75%",
              icon: <Percent className="h-4 w-4 text-indigo-400" />,
            },
            {
              label: "Present Sessions",
              value: student.present_sessions,
              desc: "Total marked present",
              icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,
            },
            {
              label: "Absent Sessions",
              value: student.absent_sessions,
              desc: "Missed / rejected lectures",
              icon: <XCircle className="h-4 w-4 text-rose-400" />,
            },
            {
              label: "Total Sessions",
              value: student.total_sessions,
              desc: "Lectures logged",
              icon: <Layers className="h-4 w-4 text-slate-500" />,
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-5"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                {stat.icon}
              </div>
              <h3 className="mt-4 text-2xl font-bold text-white">{stat.value}</h3>
              <p className="mt-1 text-[9px] text-slate-500">{stat.desc}</p>
            </div>
          ))}
        </section>

        {/* Timeline */}
        <section className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
          <h3 className="flex items-center gap-2 border-b border-slate-900 pb-3 text-sm font-bold uppercase tracking-wider text-white">
            <Calendar className="h-4 w-4 text-indigo-400" />
            Attendance Timeline
          </h3>

          <div className="relative ml-4 space-y-6 border-l border-slate-900 pl-6">
            {student.history.map((item, idx) => (
              <div key={idx} className="relative">
                {/* Timeline node */}
                <span className="border-slate-850 absolute -left-[33px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border bg-slate-950">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${item.status === "PRESENT" ? "bg-emerald-400" : item.status === "FLAGGED" ? "bg-amber-400" : "bg-rose-500"}`}
                  />
                </span>

                <div className="flex flex-col gap-4 rounded-xl border border-slate-900 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.session_title}</h4>
                    <p className="text-slate-550 mt-0.5 text-[10px]">{item.session_subject}</p>
                    {item.submitted_at ? (
                      <p className="mt-1 text-[9px] text-slate-500">
                        Submitted: {new Date(item.submitted_at).toLocaleString()}
                      </p>
                    ) : (
                      <p className="mt-1 text-[9px] text-slate-500">Status: Absent / No Record</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {item.risk_level && (
                      <span
                        className={`py-0.2 rounded px-1.5 text-[9px] font-bold ${
                          item.risk_level === "SAFE"
                            ? "border border-emerald-800/20 bg-emerald-950/20 text-emerald-400"
                            : "animate-pulse border border-rose-800/20 bg-rose-950/20 text-rose-400"
                        }`}
                      >
                        Risk: {item.risk_level} ({item.risk_score})
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusColor(item.status)} flex items-center gap-1`}
                    >
                      {getStatusIcon(item.status)}
                      {item.status}
                    </span>
                    {item.id && (
                      <Link
                        href={`/admin/risk/${item.id}`}
                        className="text-[10px] font-bold text-indigo-400 hover:underline"
                      >
                        Details
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// Simple placeholder error icon wrapper
function AlertCircleWrapper() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className="h-10 w-10 text-rose-400"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
      />
    </svg>
  );
}

export default function AdminStudentDetailPage({ params }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AdminStudentDetailContent params={params} />
    </ProtectedRoute>
  );
}
