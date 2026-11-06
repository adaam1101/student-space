import React from "react";
import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { StudentShell } from "@/components/StudentShell";
import {
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Award,
  KeyRound,
  ArrowRight,
  Lock,
  PlayCircle,
  BookOpen,
} from "lucide-react";

export default async function StudentDashboardPage() {
  const user = await requireStudent();
  const db = readDb();

  const activeExams = db.exams.filter((e) => e.status === "active");
  const myAttempts = db.exam_attempts.filter(
    (a) => a.student_id === user.student_id
  );
  const publishedResults = myAttempts.filter(
    (a) => a.results_status === "published"
  );

  return (
    <StudentShell user={user}>
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-[#0f234b] p-6 sm:p-8 text-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 px-3 py-1 text-xs font-semibold text-sky-200">
                Candidate Dashboard
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold">
                Welcome, {user.full_name}
              </h1>
              <p className="mt-1 text-sm text-sky-200">
                Student ID:{" "}
                <strong className="text-white">{user.student_number}</strong> •
                Assigned Group:{" "}
                <strong className="text-white">{user.group_name}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/exam-access"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0f234b] shadow-xs transition hover:bg-sky-50"
              >
                <KeyRound className="h-4 w-4 text-sky-600" />
                <span>Enter Access Code</span>
              </Link>
              <Link
                href="/student/results"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <Award className="h-4 w-4 text-sky-300" />
                <span>View Results</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Examinations
              </span>
              <FileSpreadsheet className="h-5 w-5 text-[#0f234b]" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">
              {activeExams.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Available for your group ({user.group_name})
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Submitted Attempts
              </span>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">
              {myAttempts.filter((a) => a.status !== "in_progress").length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Securely recorded on the platform
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Published Results
              </span>
              <Award className="h-5 w-5 text-sky-600" />
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900">
              {publishedResults.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {publishedResults.length > 0
                ? "Authorized by Adam Ameyoud"
                : "Awaiting teacher authorization"}
            </p>
          </div>
        </div>

        {/* Active Examinations List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f234b]">
                Assigned Examinations
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Enter your examination access code or resume an active session
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {activeExams.map((exam) => {
              const attempt = myAttempts.find((a) => a.exam_id === exam.id);
              const isSubmitted =
                attempt && attempt.status !== "in_progress";
              const isInProgress =
                attempt && attempt.status === "in_progress";

              return (
                <div
                  key={exam.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded-md bg-[#0f234b] px-2.5 py-0.5 text-xs font-bold text-white">
                        CEFR {exam.level}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {exam.title}
                      </h3>
                      {isInProgress && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          In Progress
                        </span>
                      )}
                      {isSubmitted && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          Submitted
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                      {exam.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Duration: {exam.duration_minutes} minutes
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                        Regular Marks: {exam.total_marks} (+{exam.bonus_marks}{" "}
                        Bonus)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isInProgress ? (
                      <Link
                        href={`/student/exam/${exam.id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-amber-500"
                      >
                        <PlayCircle className="h-4 w-4" />
                        <span>Resume Examination</span>
                      </Link>
                    ) : isSubmitted ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href="/student/submission"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Lock className="h-4 w-4 text-emerald-600" />
                          <span>Submission Confirmation</span>
                        </Link>
                        <Link
                          href="/student/results"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f234b] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#1e3a8a]"
                        >
                          <Award className="h-4 w-4 text-sky-300" />
                          <span>Check Results Status</span>
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href="/exam-access"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#1e3a8a]"
                      >
                        <KeyRound className="h-4 w-4 text-sky-300" />
                        <span>Unlock with Access Code</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
