"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  BookOpen,
  ShieldCheck,
  LogOut,
  UserCheck,
  KeyRound,
  FileText,
} from "lucide-react";

interface BrandHeaderProps {
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: "teacher" | "student";
    student_number?: string;
    group_name?: string;
  } | null;
}

export function BrandHeader({ user }: BrandHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f234b] text-white shadow-sm transition group-hover:bg-[#1e3a8a]">
            <BookOpen className="h-5 w-5 text-sky-200" />
          </div>
          <div>
            <span className="block text-base font-bold tracking-tight text-[#0f234b] sm:text-lg">
              ADAM AMEYOUD
            </span>
            <span className="block text-xs font-medium tracking-wide text-slate-500">
              English Language Assessment
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link
            href="/"
            className={`transition hover:text-[#0f234b] ${
              pathname === "/" ? "text-[#0f234b] font-semibold" : ""
            }`}
          >
            Overview
          </Link>
          <Link
            href="/exam-access"
            className={`flex items-center gap-1.5 transition hover:text-[#0f234b] ${
              pathname === "/exam-access" ? "text-[#0f234b] font-semibold" : ""
            }`}
          >
            <KeyRound className="h-4 w-4 text-sky-600" />
            Exam Access
          </Link>
          <Link
            href="/exam-instructions"
            className={`flex items-center gap-1.5 transition hover:text-[#0f234b] ${
              pathname === "/exam-instructions"
                ? "text-[#0f234b] font-semibold"
                : ""
            }`}
          >
            <FileText className="h-4 w-4 text-sky-600" />
            Instructions
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href={
                  user.role === "teacher"
                    ? "/teacher/dashboard"
                    : "/student/dashboard"
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f234b] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e3a8a]"
              >
                {user.role === "teacher" ? (
                  <ShieldCheck className="h-4 w-4 text-sky-300" />
                ) : (
                  <UserCheck className="h-4 w-4 text-sky-300" />
                )}
                <span>
                  {user.role === "teacher"
                    ? "Teacher Console"
                    : "Student Portal"}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 text-slate-500" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-[#0f234b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e3a8a]"
              >
                Candidate Registration
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
