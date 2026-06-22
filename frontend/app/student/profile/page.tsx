"use client";

import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { apiService } from "../../../services/api";
import {
  Shield,
  LogOut,
  User as UserIcon,
  Mail,
  Hash,
  Award,
  Edit3,
  Check,
  Loader2,
} from "lucide-react";

function StudentProfileContent() {
  const { user, logout, token } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localUser, setLocalUser] = useState(user);

  const handleUpdateName = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const updated = await apiService.updateProfile(name.trim());
      setLocalUser(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile name", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="glow-primary rounded-xl border border-blue-500/20 bg-blue-600/10 p-2.5">
              <Shield className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Student Dashboard</h1>
              <p className="text-xs text-slate-400">Attendance Verification Platform</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Profile Card */}
        <main className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Sidebar / Avatar */}
          <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-center">
            <div className="relative mb-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-xl shadow-blue-500/10">
                {localUser?.name ? localUser.name.charAt(0).toUpperCase() : "S"}
              </div>
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-slate-950 bg-emerald-500" />
            </div>
            <h3 className="text-lg font-bold leading-tight text-white">
              {localUser?.name || "Student User"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{localUser?.email}</p>
            <span className="mt-4 rounded-full border border-blue-500/20 bg-blue-600/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400">
              {localUser?.role}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-6 md:col-span-2">
            <div className="glass-panel space-y-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
              <h2 className="text-md border-b border-slate-900 pb-3 font-bold text-white">
                Personal Credentials
              </h2>

              {/* Field: Name */}
              <div className="flex flex-col justify-between gap-4 border-b border-slate-900/40 py-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Full Name
                    </p>
                    {isEditing ? (
                      <input
                        type="text"
                        className="mt-1 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSaving}
                      />
                    ) : (
                      <p className="mt-0.5 text-sm font-semibold text-white">
                        {localUser?.name || "Not Specified"}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  {isEditing ? (
                    <button
                      onClick={handleUpdateName}
                      disabled={isSaving}
                      className="flex cursor-pointer items-center gap-1 text-xs font-bold text-emerald-400 transition hover:text-emerald-300"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <span>Save</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex cursor-pointer items-center gap-1 text-xs font-bold text-slate-400 transition hover:text-white"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Field: Email */}
              <div className="flex items-center gap-3 border-b border-slate-900/40 py-2">
                <Mail className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Google Email
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{localUser?.email}</p>
                </div>
              </div>

              {/* Field: Registration Number */}
              <div className="flex items-center gap-3 border-b border-slate-900/40 py-2">
                <Hash className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Registration Identifier
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-blue-400">
                    {localUser?.registration_number || "Not Registered"}
                  </p>
                </div>
              </div>

              {/* Field: Role */}
              <div className="flex items-center gap-3 py-2">
                <Award className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Authorized Role
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{localUser?.role}</p>
                </div>
              </div>
            </div>

            {/* Mock Attendance Status Panel */}
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 py-8 text-center">
              <h4 className="mb-2 text-sm font-bold text-white">No Active Attendance Session</h4>
              <p className="mx-auto max-w-sm text-xs text-slate-500">
                Once a teacher starts a session, you will see it here and be able to verify your
                attendance.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <ProtectedRoute allowedRoles={["Student"]}>
      <StudentProfileContent />
    </ProtectedRoute>
  );
}
