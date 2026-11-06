"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import {
  Lock,
  Mail,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole =
    searchParams.get("role") === "teacher" ? "teacher" : "student";

  const [roleTab, setRoleTab] = useState<"student" | "teacher">(initialRole);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          role: roleTab,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid login credentials.");
        setLoading(false);
        return;
      }
      router.push(data.redirectTo || "/");
      router.refresh();
    } catch {
      setError("Network error while signing in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <BrandHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#0f234b]">
              Sign In to Assessment Portal
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Adam Ameyoud — English Language Assessment
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {/* Role Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setRoleTab("student");
                  setError("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition ${
                  roleTab === "student"
                    ? "bg-[#0f234b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserCheck className="h-4 w-4" />
                <span>Student Candidate</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleTab("teacher");
                  setError("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition ${
                  roleTab === "teacher"
                    ? "bg-[#0f234b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Teacher / Examiner</span>
              </button>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  {roleTab === "student"
                    ? "Candidate Username / ID"
                    : "Examiner Username"}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      roleTab === "student"
                        ? "hanine2026 or ritedj2026"
                        : "adamameyoud"
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0f234b] focus:outline-none focus:ring-2 focus:ring-[#0f234b]/15"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0f234b] focus:outline-none focus:ring-2 focus:ring-[#0f234b]/15"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f234b] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e3a8a] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>
                      Sign In as{" "}
                      {roleTab === "teacher" ? "Examiner" : "Candidate"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {roleTab === "student" && (
              <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs sm:text-sm text-slate-600">
                Don&apos;t have a candidate account yet?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[#0f234b] hover:underline"
                >
                  Register here
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <LoginContent />
    </Suspense>
  );
}
