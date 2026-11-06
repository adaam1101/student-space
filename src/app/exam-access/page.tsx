"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Lock,
  Loader2,
  UserCheck,
} from "lucide-react";

export default function ExamAccessPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
    role: "teacher" | "student";
    student_number?: string;
    group_name?: string;
  } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        setUser(d.user || null);
        setCheckingAuth(false);
      })
      .catch(() => setCheckingAuth(false));
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/exam/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid access code.");
        setSubmitting(false);
        return;
      }
      router.push(data.redirectTo || `/exam-instructions?examId=${data.exam.id}`);
    } catch {
      setError("Network error while verifying examination access code.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <BrandHeader user={user} />

      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f234b] text-sky-300 shadow-sm">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#0f234b]">
              Examination Access Gateway
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Enter the official examination access code provided by Adam
              Ameyoud
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {checkingAuth ? (
              <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying candidate identity...
              </div>
            ) : !user ? (
              <div className="space-y-4 text-center">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs sm:text-sm text-amber-800">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <Lock className="h-4 w-4" />
                    Candidate Authentication Required
                  </div>
                  <p>
                    Students must sign in with their individual examination
                    account before entering an examination access code.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 pt-2">
                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f234b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1e3a8a]"
                  >
                    <span>Sign In to Student Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/register"
                    className="flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Create New Candidate Account
                  </Link>
                </div>
              </div>
            ) : user.role === "teacher" ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-slate-600">
                  You are signed in as Examiner{" "}
                  <strong className="text-slate-900">{user.full_name}</strong>.
                  To preview or manage examinations, open the Teacher Console.
                </p>
                <Link
                  href="/teacher/exams"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0f234b] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  <span>Go to Examination Management</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[#0f234b]" />
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {user.full_name}
                      </span>
                      <span>
                        {user.student_number} • {user.group_name}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Verified
                  </span>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label
                      htmlFor="accessCode"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Examination Access Code
                    </label>
                    <input
                      id="accessCode"
                      type="text"
                      required
                      value={accessCode}
                      onChange={(e) =>
                        setAccessCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter code (e.g. B1FINAL2026)"
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center font-mono text-base font-bold tracking-widest text-[#0f234b] uppercase placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#0f234b] focus:outline-none focus:ring-2 focus:ring-[#0f234b]/15"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f234b] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e3a8a] disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Validating Access Code...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Unlock Examination</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
