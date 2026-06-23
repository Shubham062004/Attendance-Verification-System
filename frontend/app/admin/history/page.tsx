"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService, StudentHistoryResponse } from "../../../services/api";
import {
  Calendar,
  Search,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingDown,
} from "lucide-react";

function AdminStudentHistoryContent() {
  const [students, setStudents] = useState<StudentHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [minPercentage, setMinPercentage] = useState<string>("ALL");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStudentsHistory();
      setStudents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load student history registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter student lists
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.registration_number && s.registration_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesPercentage = true;
    if (minPercentage === "LOW") {
      matchesPercentage = s.attendance_percentage < 75; // Low attendance alert
    } else if (minPercentage === "HIGH") {
      matchesPercentage = s.attendance_percentage >= 75;
    }

    return matchesSearch && matchesPercentage;
  });

  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Breadcrumb */}
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white">
          ← Back to Console Home
        </Link>

        {/* Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <Calendar className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Student History Portal</h1>
              <p className="text-xs text-slate-500">Search and audit students' cumulative attendance percentages</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <section className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name, Email, or Reg No..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none"
            />
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <TrendingDown className="h-4 w-4 text-slate-500" />
            </span>
            <select
              value={minPercentage}
              onChange={(e) => setMinPercentage(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none"
            >
              <option value="ALL">All Attendance Rates</option>
              <option value="LOW">Defaulters / Low Attendance ( &lt; 75% )</option>
              <option value="HIGH">Regular / High Attendance ( &ge; 75% )</option>
            </select>
          </div>
        </section>

        {/* Student History Table */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-xs text-slate-500">Loading student database...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-slate-700" />
              <p className="text-sm text-slate-400 font-bold">No Students Registered</p>
              <p className="text-xs text-slate-650 max-w-sm">No profiles found in the registry matching the search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/30 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Registration Number</th>
                    <th className="px-6 py-3.5 text-center">Attendance %</th>
                    <th className="px-6 py-3.5 text-center">Present</th>
                    <th className="px-6 py-3.5 text-center">Absent</th>
                    <th className="px-6 py-3.5">Last Attendance Active</th>
                    <th className="px-6 py-3.5 text-right">View Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-900/30 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-white">{student.name || "Unknown Profile"}</p>
                          <p className="text-[10px] text-slate-500">{student.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-semibold">{student.registration_number || "N/A"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-extrabold ${student.attendance_percentage < 75 ? "text-rose-400" : "text-emerald-400"}`}>
                          {Math.round(student.attendance_percentage)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-emerald-400 font-bold">{student.present_count}</td>
                      <td className="px-6 py-4 text-center text-rose-400 font-bold">{student.absent_count}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {student.last_attendance ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{new Date(student.last_attendance).toLocaleString()}</span>
                          </div>
                        ) : (
                          "Never Active"
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold"
                        >
                          <span>Profile</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminStudentHistoryPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AdminStudentHistoryContent />
    </ProtectedRoute>
  );
}
