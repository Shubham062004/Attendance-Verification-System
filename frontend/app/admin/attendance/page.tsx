"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import {
  apiService,
  AdminAttendanceRecordListItem,
  AttendanceSession,
  StudentHistoryResponse,
} from "../../../services/api";
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  Loader2,
  Trash2,
  Edit,
  AlertCircle,
  MessageSquare,
  Wrench,
  Check,
} from "lucide-react";

function AdminAttendanceManagementContent() {
  const [records, setRecords] = useState<AdminAttendanceRecordListItem[]>([]);
  const [students, setStudents] = useState<StudentHistoryResponse[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Modals state
  const [overrideTarget, setOverrideTarget] = useState<AdminAttendanceRecordListItem | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<"PRESENT" | "REJECTED">("PRESENT");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [isTechIssue, setIsTechIssue] = useState(false);
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Manual Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStudentId, setAddStudentId] = useState("");
  const [addSessionId, setAddSessionId] = useState("");
  const [addStatus, setAddStatus] = useState<"PRESENT" | "REJECTED">("PRESENT");
  const [addNotes, setAddNotes] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recs, studs, sess] = await Promise.all([
        apiService.getAllAttendanceRecords(),
        apiService.getStudentsHistory(),
        apiService.listSessions({ size: 100 }),
      ]);
      setRecords(recs);
      setStudents(studs);
      setSessions(sess);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load management console data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenOverride = (record: AdminAttendanceRecordListItem) => {
    setOverrideTarget(record);
    setOverrideStatus(record.status === "REJECTED" ? "REJECTED" : "PRESENT");
    setOverrideNotes("");
    setIsTechIssue(false);
  };

  const handleOverrideSubmit = async () => {
    if (!overrideTarget) return;
    try {
      setSubmittingOverride(true);
      await apiService.overrideAttendanceRecord(
        overrideTarget.id,
        overrideStatus,
        overrideNotes || "Overridden by admin",
        isTechIssue,
      );
      setOverrideTarget(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Override failed");
    } finally {
      setSubmittingOverride(false);
    }
  };

  const handleRemoveRecord = async (id: number) => {
    if (!window.confirm("Are you sure you want to completely remove this attendance record?"))
      return;
    try {
      setLoading(true);
      await apiService.removeAttendanceRecord(id);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Deletion failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async () => {
    if (!addStudentId || !addSessionId) {
      alert("Please select both a student and a session.");
      return;
    }
    try {
      setSubmittingAdd(true);
      await apiService.addAttendanceManually(
        parseInt(addStudentId, 10),
        parseInt(addSessionId, 10),
        addStatus,
        addNotes,
      );
      setShowAddModal(false);
      setAddStudentId("");
      setAddSessionId("");
      setAddNotes("");
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to manually add attendance");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Filtered List
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      !searchTerm ||
      (r.student_name && r.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.student_reg_number &&
        r.student_reg_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.session_title && r.session_title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLevel = filterLevel === "ALL" || r.risk_level === filterLevel;
    const matchesStatus = filterStatus === "ALL" || r.status === filterStatus;

    return matchesSearch && matchesLevel && matchesStatus;
  });

  const getRiskBadge = (level: string | null) => {
    switch (level) {
      case "SAFE":
        return (
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
            SAFE
          </span>
        );
      case "REVIEW":
        return (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
            REVIEW
          </span>
        );
      case "HIGH_RISK":
        return (
          <span className="animate-pulse rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
            HIGH RISK
          </span>
        );
      default:
        return <span className="font-semibold text-slate-600">—</span>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "text-emerald-400 bg-emerald-950/30 border-emerald-800/40";
      case "FLAGGED":
        return "text-amber-400 bg-amber-950/30 border-amber-800/40";
      case "REJECTED":
        return "text-rose-400 bg-rose-950/30 border-rose-800/40";
      default:
        return "text-slate-400 bg-slate-900 border-slate-800";
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          ← Back to Console Home
        </Link>

        {/* Title */}
        <div className="flex flex-col gap-4 border-b border-slate-900 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Attendance Management</h1>
              <p className="text-xs text-slate-500">
                Monitor active student states and perform manual overrides
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Attendance</span>
          </button>
        </div>

        {/* Filters */}
        <section className="glass-panel grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 md:grid-cols-3">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-500" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Student, Reg No or Session..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Filter className="h-4 w-4 text-slate-500" />
            </span>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-slate-100 focus:outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="SAFE">Safe</option>
              <option value="REVIEW">Review</option>
              <option value="HIGH_RISK">High Risk</option>
            </select>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Filter className="h-4 w-4 text-slate-500" />
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-slate-100 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="FLAGGED">Flagged</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </section>

        {/* Main Records Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-xs text-slate-500">Loading attendance data...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <AlertCircle className="h-10 w-10 text-slate-700" />
              <p className="text-sm font-bold text-slate-400">No Records Found</p>
              <p className="text-slate-650 max-w-sm text-xs">
                No student attendance matched the filtering criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/30 font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">S.No</th>
                    <th className="px-6 py-3.5">Student Name</th>
                    <th className="px-6 py-3.5">Registration Number</th>
                    <th className="px-6 py-3.5">Session</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-center">Risk Level</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {filteredRecords.map((item, index) => (
                    <tr key={item.id} className="transition hover:bg-slate-900/30">
                      <td className="px-6 py-4 font-mono text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4 font-bold text-white">
                        {item.student_name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {item.student_reg_number || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{item.session_title}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusColor(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">{getRiskBadge(item.risk_level)}</td>
                      <td className="space-x-2 px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenOverride(item)}
                          className="cursor-pointer rounded border border-slate-800 bg-slate-900 p-1.5 font-semibold text-slate-300 hover:bg-slate-800"
                          title="Override & Notes"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveRecord(item.id)}
                          className="cursor-pointer rounded border border-rose-500/20 bg-rose-500/10 p-1.5 font-semibold text-rose-400 hover:bg-rose-500/20"
                          title="Delete Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Override Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h3 className="text-sm font-bold text-white">Attendance Override Panel</h3>
              <button
                onClick={() => setOverrideTarget(null)}
                className="text-slate-450 cursor-pointer text-xs hover:text-white"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Modifying status for student **{overrideTarget.student_name}** in session **
              {overrideTarget.session_title}**.
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-slate-400">
                  Change Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOverrideStatus("PRESENT")}
                    className={`rounded-lg border py-2 text-xs font-bold transition ${
                      overrideStatus === "PRESENT"
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Mark Present
                  </button>
                  <button
                    onClick={() => setOverrideStatus("REJECTED")}
                    className={`rounded-lg border py-2 text-xs font-bold transition ${
                      overrideStatus === "REJECTED"
                        ? "border-rose-500 bg-rose-600 text-white"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Mark Absent / Reject
                  </button>
                </div>
              </div>

              {/* Technical Issue Toggle */}
              <button
                onClick={() => setIsTechIssue(!isTechIssue)}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-xs transition ${
                  isTechIssue
                    ? "border-amber-500/40 bg-amber-500/5 text-amber-400"
                    : "border-slate-800 bg-slate-900 text-slate-400"
                }`}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <Wrench className="h-4 w-4" />
                  Mark as Technical Issue
                </span>
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${isTechIssue ? "border-amber-400 bg-amber-400" : "border-slate-700"}`}
                >
                  {isTechIssue && <Check className="h-2.5 w-2.5 font-extrabold text-slate-950" />}
                </span>
              </button>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-slate-400">
                  Review Notes / Reason
                </label>
                <textarea
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="Enter override notes..."
                  className="min-h-[70px] w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-900 pt-3">
              <button
                onClick={() => setOverrideTarget(null)}
                className="hover:bg-slate-850 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                disabled={submittingOverride}
                className="cursor-pointer rounded bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {submittingOverride ? "Saving..." : "Apply Override"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h3 className="text-sm font-bold text-white">Add Manual Attendance</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-450 cursor-pointer text-xs hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold font-semibold text-slate-400">
                  Select Student
                </label>
                <select
                  value={addStudentId}
                  onChange={(e) => setAddStudentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 py-2 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="">Choose Student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.registration_number || s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold font-semibold text-slate-400">
                  Select Session
                </label>
                <select
                  value={addSessionId}
                  onChange={(e) => setAddSessionId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 py-2 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="">Choose Session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-slate-400">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAddStatus("PRESENT")}
                    className={`rounded-lg border py-2 text-xs font-bold transition ${
                      addStatus === "PRESENT"
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Present
                  </button>
                  <button
                    onClick={() => setAddStatus("REJECTED")}
                    className={`rounded-lg border py-2 text-xs font-bold transition ${
                      addStatus === "REJECTED"
                        ? "border-rose-500 bg-rose-600 text-white"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Absent / Rejected
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block flex items-center gap-1 text-[11px] font-bold text-slate-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Admin Notes
                </label>
                <textarea
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Enter manual override notes..."
                  className="min-h-[60px] w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-900 pt-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="hover:bg-slate-850 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubmit}
                disabled={submittingAdd}
                className="cursor-pointer rounded bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {submittingAdd ? "Submitting..." : "Add Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAttendanceManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AdminAttendanceManagementContent />
    </ProtectedRoute>
  );
}
