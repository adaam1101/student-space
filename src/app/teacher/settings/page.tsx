"use client";

import React, { useEffect, useState } from "react";
import { TeacherShell } from "@/components/TeacherShell";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ShieldCheck,
  Database,
  Lock,
  Activity,
  Loader2,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  user_name?: string;
  user_role?: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function TeacherSettingsPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/teacher/overview").then((r) => r.json()),
    ]).then(([meRes, ovRes]) => {
      if (meRes.user) setUser(meRes.user);
      setAuditLogs(ovRes.auditLogs || []);
      setLoading(false);
    });
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0f234b]" />
      </div>
    );
  }

  const supabaseLive = isSupabaseConfigured();

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f234b]">
            Platform Security &amp; System Settings
          </h1>
          <p className="text-sm text-slate-600">
            Adam Ameyoud — English Language Assessment Architecture &amp;
            Security Audit Logs
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#0f234b]">
              <Database className="h-4 w-4 text-sky-600" />
              Database &amp; RLS Persistence
            </div>
            <div className="text-sm font-bold text-slate-900">
              {supabaseLive
                ? "Supabase PostgreSQL Cloud Connected"
                : "Transactional Server Store + Supabase Migrations Ready"}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full SQL schema and RLS policies are located in{" "}
              <code className="font-mono text-[#0f234b]">
                supabase/migrations/
              </code>
              . Add your project keys to <code className="font-mono">.env.local</code>{" "}
              to switch to cloud Supabase at any time.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#0f234b]">
              <Lock className="h-4 w-4 text-emerald-600" />
              Answer Key &amp; Score Isolation
            </div>
            <div className="text-sm font-bold text-slate-900">
              Server-Side Enforced
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Answer keys (<code className="font-mono">correct_answers</code>,{" "}
              <code className="font-mono">accepted_answers</code>) and
              unpublished marks are stripped on the server before any response
              reaches student clients.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#0f234b]">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Cryptographic Protections
            </div>
            <div className="text-sm font-bold text-slate-900">
              scrypt + HMAC-SHA256 Sessions
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              All passwords and examination access codes are hashed with salted
              scrypt and verified using constant-time comparison.
            </p>
          </div>
        </div>

        {/* Security Audit Logs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-base text-[#0f234b]">
            <Activity className="h-4 w-4 text-sky-600" />
            Platform Security &amp; Activity Audit Logs
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {log.user_name || "System"}
                    </td>
                    <td className="px-4 py-2.5 uppercase text-slate-500">
                      {log.user_role || "system"}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-[#0f234b]">
                      {log.action}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
