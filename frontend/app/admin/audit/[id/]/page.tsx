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
        <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-800">
          <Server className="h-3 w-3" />
          SYSTEM
        </span>
      );
    }

    switch (role.toUpperCase()) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
            <Shield className="h-3 w-3" />
            ADMIN
          </span>
        );
      case "DEVELOPER":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
            <Activity className="h-3 w-3" />
            DEV
          </span>
        );
      case "STUDENT":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
            <User className="h-3 w-3" />
            STUDENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-500/20">
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
        <AlertCircle className="h-10 w-10 text-rose-400 animate-pulse" />
        <p className="text-sm text-slate-400">{error || "Failed to load audit entry details."}</p>
        <button
          onClick={() => router.push("/admin/audit")}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 cursor-pointer"
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
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900/60">
              Action Description
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <Clock className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</h4>
                    <p className="mt-1 text-xs font-mono text-slate-300">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                      {new Date(log.created_at).toISOString()} (UTC)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <User className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actor / Performed By</h4>
                    <p className="mt-1 text-xs font-bold text-white">
                      {log.actor_name || "System automated event"}
                    </p>
                    <div className="mt-1.5">{getRoleBadge(log.actor_role)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <Activity className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action Type</h4>
                    <span className="inline-block mt-1 rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-indigo-400">
                      {log.action_type}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Database className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Affected Entity</h4>
                    {log.entity_type ? (
                      <p className="mt-1 text-xs text-slate-300">
                        Type: <span className="font-mono text-indigo-300 bg-slate-900 px-1 py-0.2 rounded text-[10px]">{log.entity_type}</span>
                        {log.entity_id !== null && (
                          <>
                            {" "}
                            ID: <span className="font-mono text-indigo-300 bg-slate-900 px-1 py-0.2 rounded text-[10px]">#{log.entity_id}</span>
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

            <div className="pt-2 border-t border-slate-900/60">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detailed Description</h4>
              <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-200">
                {log.description}
              </div>
            </div>
          </div>

          {/* Client Details Panel */}
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900/60">
              Client & Network Metadata
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3 items-start">
                <Globe className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">IP Address</h4>
                  <p className="mt-1 text-xs font-mono text-slate-350">
                    {log.ip_address || "None recorded"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <Monitor className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">User-Agent Header</h4>
                  <p className="mt-1 text-xs text-slate-350 leading-relaxed text-[11px] break-all font-mono">
                    {log.user_agent || "None recorded"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata JSON Block */}
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900/60">
              Audit Payload Metadata (JSON)
            </h3>
            {log.metadata_json && Object.keys(log.metadata_json).length > 0 ? (
              <div className="rounded-xl border border-slate-900 bg-slate-950 overflow-hidden font-mono text-[10px] leading-relaxed">
                <div className="bg-slate-900/60 border-b border-slate-900 px-4 py-2 text-slate-500 text-[9px] font-bold uppercase select-none">
                  Payload content
                </div>
                <pre className="p-4 overflow-x-auto text-indigo-300">
                  {JSON.stringify(log.metadata_json, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No additional payload metadata exists for this action.</p>
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
