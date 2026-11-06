import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { BrandHeader } from "@/components/BrandHeader";
import {
  ShieldCheck,
  Clock,
  FileCheck2,
  Lock,
  ArrowRight,
  Award,
  CheckCircle2,
  BookOpen,
  PenTool,
  KeyRound,
} from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();
  const db = readDb();
  const activeExams = db.exams.filter((e) => e.status === "active");

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <BrandHeader user={user} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#0f234b] text-white border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-22">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-sky-200 uppercase">
                <ShieldCheck className="h-4 w-4 text-sky-300" />
                Official Examination Environment
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
                ADAM AMEYOUD
                <span className="mt-2 block text-xl sm:text-2xl font-medium text-sky-200">
                  English Language Assessment
                </span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-slate-200 leading-relaxed">
                A dedicated, high-integrity online examination platform for CEFR{" "}
                <strong className="font-semibold text-white">
                  A1, A2, B1, B2, and C1
                </strong>{" "}
                English proficiency assessments. Featuring real-time server
                autosave, authoritative timing, structured essay composition,
                and examiner-verified results publication.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                {user ? (
                  <Link
                    href={
                      user.role === "teacher"
                        ? "/teacher/dashboard"
                        : "/student/dashboard"
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-bold text-[#0f234b] shadow-md transition hover:bg-sky-50"
                  >
                    <span>
                      Enter{" "}
                      {user.role === "teacher"
                        ? "Examiner Dashboard"
                        : "Candidate Portal"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-bold text-[#0f234b] shadow-md transition hover:bg-sky-50"
                    >
                      <span>Candidate & Examiner Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-lg border border-sky-300/40 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      <span>Register Candidate Account</span>
                    </Link>
                  </>
                )}
                <Link
                  href="/exam-access"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-3.5 text-sm font-medium text-sky-200 transition hover:bg-white/10 hover:text-white"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Enter Access Code</span>
                </Link>
              </div>
            </div>

            {/* Active Session Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/15 bg-[#152d5e]/90 p-6 sm:p-7 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                      Current Assessment Session
                    </span>
                    <h2 className="mt-1 text-lg font-bold text-white">
                      {activeExams[0]?.title || "B1 – FINAL ENGLISH EXAMINATION"}
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Active
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3.5 text-sm">
                  <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                    <div className="text-xs text-sky-200">Examiner</div>
                    <div className="mt-1 font-semibold text-white">
                      Adam Ameyoud
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                    <div className="text-xs text-sky-200">Proficiency Level</div>
                    <div className="mt-1 font-semibold text-white">
                      Strong B1 → B2
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                    <div className="text-xs text-sky-200">Duration</div>
                    <div className="mt-1 font-semibold text-white">
                      150 Minutes
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                    <div className="text-xs text-sky-200">Total Marks</div>
                    <div className="mt-1 font-semibold text-white">
                      100 + 2 Bonus
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs text-sky-100">
                  <div className="flex items-center justify-between">
                    <span>Part One: Grammar</span>
                    <span className="font-semibold text-white">50 Marks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Part Two: Reading Comprehension</span>
                    <span className="font-semibold text-white">25 Marks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Part Three: Academic / Reflective Writing</span>
                    <span className="font-semibold text-white">25 Marks</span>
                  </div>
                  <div className="flex items-center justify-between text-sky-300">
                    <span>Bonus Question: Words for the Teacher</span>
                    <span className="font-semibold">+2 Marks</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/exam-access"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-400"
                  >
                    <span>Proceed to Examination Access</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CEFR Levels Scalability Bar */}
      <section className="border-b border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Supported CEFR Assessment Levels
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { level: "A1", desc: "Beginner" },
                { level: "A2", desc: "Elementary" },
                { level: "B1", desc: "Intermediate (Active Final)" },
                { level: "B2", desc: "Upper-Intermediate" },
                { level: "C1", desc: "Advanced Proficiency" },
              ].map((item) => (
                <div
                  key={item.level}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-medium ${
                    item.level === "B1"
                      ? "border-[#0f234b] bg-[#0f234b] text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="font-bold">{item.level}</span>
                  <span
                    className={
                      item.level === "B1" ? "text-sky-200" : "text-slate-500"
                    }
                  >
                    • {item.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0f234b]">
            Designed for Academic Rigor & Examination Integrity
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Every stage of the examination lifecycle is engineered for
            concentration, reliability, and complete teacher control.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f234b]/10 text-[#0f234b]">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Server-Controlled Timer
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              The 150-minute countdown uses authoritative server timestamps.
              Refreshing or reconnecting never resets the timer, with automatic
              submission at expiration.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f234b]/10 text-[#0f234b]">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Continuous Cloud Autosave
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Every multiple-choice selection, sentence transformation, and
              essay paragraph is saved to the server automatically with instant
              recovery after disconnection.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f234b]/10 text-[#0f234b]">
              <PenTool className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Hybrid & Rubric Grading
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Objective items are evaluated against configurable grammatical
              alternatives, while essays and bonus questions are graded by Adam
              Ameyoud using structured rubrics.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f234b]/10 text-[#0f234b]">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Controlled Results Release
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Marks and preliminary scores remain strictly hidden after
              submission. Candidates view their results only when the teacher
              explicitly authorizes publication.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-[#0f234b]">
            <BookOpen className="h-4 w-4" />
            <span>ADAM AMEYOUD — English Language Assessment</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#0f234b]">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-[#0f234b]">
              Register
            </Link>
            <Link href="/exam-access" className="hover:text-[#0f234b]">
              Exam Access
            </Link>
            <Link href="/exam-instructions" className="hover:text-[#0f234b]">
              Instructions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
