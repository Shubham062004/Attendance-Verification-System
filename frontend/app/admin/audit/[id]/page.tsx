"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";
import { apiService, AuditLog } from "../../../../services/api";
import {
  Shield,
  Clock,
  User,
  Activity,
  Server,
  Globe,
  Monitor,
  Database,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

function AuditDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const logId = parseInt(params.id as string, 10);

  const [log, setLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogDetail = async () => {
      try {
        setLoading(true);
        const data = await apiService.getAuditLog(logId);
        setLog(data);
      } catch (err: any) {
        setError(err.message || "Failed to load audit log details.");
      } finally {
        setLoading(false);
      }
    };
    if (logId) {
      fetchLogDetail();
    }
  }, [logId]);

  const getRoleBadge = (role: string | null) => {
    if (!role) {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-400">
          <Server className="h-3 w-3" />
          SYSTEM
        </span>
      );
    }

    switch (role.toUpperCase()) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
            <Shield className="h-3 w-3" />
            ADMIN
          </span>
        );
      case "DEVELOPER":
        return (
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            <Activity className="h-3 w-3" />
            DEV
          </span>
        );
      case "STUDENT":
        return (
          <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <User className="h-3 w-3" />
            STUDENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded border border-slate-500/20 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
            {role.toUpperCase()}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
        <AlertCircle className="h-10 w-10 animate-pulse text-rose-400" />
        <p className="text-sm text-slate-400">{error || "Failed to load audit entry details."}</p>
        <button
          onClick={() => router.push("/admin/audit")}
          className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
        >
          Back to Audit Trail
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Glows */}
      <div className="pointer-events-none absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-1/4 bottom-0 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back navigation */}
        <Link
          href="/admin/audit"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Audit Trail</span>
        </Link>

        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-900 pb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/10 p-2.5">
              <Shield className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Log Inspection Panel</h1>
              <p className="text-xs text-slate-500">Record ID: #{log.id}</p>
            </div>
          </div>
        </header>

        {/* Detailed Panels Grid */}
        <main className="space-y-6">
          {/* Main info card */}
          <div className="glass-panel space-y-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
            <h3 className="border-b border-slate-900/60 pb-2 text-xs font-bold uppercase tracking-wider text-white">
              Action Description
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Timestamp
                    </h4>
                    <p className="mt-1 font-mono text-xs text-slate-300">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-slate-500">
                      {new Date(log.created_at).toISOString()} (UTC)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Actor / Performed By
                    </h4>
                    <p className="mt-1 text-xs font-bold text-white">
                      {log.actor_name || "System automated event"}
                    </p>
                    <div className="mt-1.5">{getRoleBadge(log.actor_role)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Activity className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Action Type
                    </h4>
                    <span className="mt-1 inline-block rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-indigo-400">
                      {log.action_type}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Database className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Affected Entity
                    </h4>
                    {log.entity_type ? (
                      <p className="mt-1 text-xs text-slate-300">
                        Type:{" "}
                        <span className="py-0.2 rounded bg-slate-900 px-1 font-mono text-[10px] text-indigo-300">
                          {log.entity_type}
                        </span>
                        {log.entity_id !== null && (
                          <>
                            {" "}
                            ID:{" "}
                            <span className="py-0.2 rounded bg-slate-900 px-1 font-mono text-[10px] text-indigo-300">
                              #{log.entity_id}
                            </span>
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-900/60 pt-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Detailed Description
              </h4>
              <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-200">
                {log.description}
              </div>
            </div>
          </div>

          {/* Client Details Panel */}
          <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
            <h3 className="border-b border-slate-900/60 pb-2 text-xs font-bold uppercase tracking-wider text-white">
              Client & Network Metadata
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    IP Address
                  </h4>
                  <p className="text-slate-350 mt-1 font-mono text-xs">
                    {log.ip_address || "None recorded"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Monitor className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    User-Agent Header
                  </h4>
                  <p className="text-slate-355 mt-1 break-all font-mono text-[11px] text-xs leading-relaxed">
                    {log.user_agent || "None recorded"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata JSON Block */}
          <div className="glass-panel space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
            <h3 className="border-b border-slate-900/60 pb-2 text-xs font-bold uppercase tracking-wider text-white">
              Audit Payload Metadata (JSON)
            </h3>
            {log.metadata_json && Object.keys(log.metadata_json).length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-900 bg-slate-950 font-mono text-[10px] leading-relaxed">
                <div className="select-none border-b border-slate-900 bg-slate-900/60 px-4 py-2 text-[9px] font-bold uppercase text-slate-500">
                  Payload content
                </div>
                <pre className="overflow-x-auto p-4 text-indigo-300">
                  {JSON.stringify(log.metadata_json, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-xs italic text-slate-500">
                No additional payload metadata exists for this action.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AuditDetailsPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Developer"]}>
      <AuditDetailsContent />
    </ProtectedRoute>
  );
}
