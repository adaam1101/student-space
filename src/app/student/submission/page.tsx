import React from "react";
import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { StudentShell } from "@/components/StudentShell";
import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  Lock,
  Award,
  ArrowLeft,
} from "lucide-react";

export default async function StudentSubmissionPage() {
  const user = await requireStudent();
  const db = readDb();

  const submittedAttempts = db.exam_attempts
    .filter(
      (a) => a.student_id === user.student_id && a.status !== "in_progress"
    )
    .sort(
      (a, b) =>
        new Date(b.submitted_at || b.started_at).getTime() -
        new Date(a.submitted_at || a.started_at).getTime()
    );

  const latest = submittedAttempts[0] || null;
  const latestExam = latest
    ? db.exams.find((e) => e.id === latest.exam_id)
    : null;

  return (
    <StudentShell user={user}>
      <div className="mx-auto max-w-2xl py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#0f234b]">
              <Lock className="h-3.5 w-3.5" />
              Official Submission Receipt
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0f234b]">
              Examination Submitted
            </h1>
            {latestExam && (
              <p className="text-sm font-medium text-slate-600">
                {latestExam.title}
              </p>
            )}
          </div>

          {/* Exact Confirmation Text Required by Section 8 */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-slate-800 space-y-3 text-sm sm:text-base leading-relaxed">
            <p className="font-semibold text-emerald-950">
              Your examination has been successfully submitted.
            </p>
            <p>Your answers have been saved securely.</p>
            <p>
              Your results will become available once your teacher authorizes
              their publication.
            </p>
            <p className="font-medium text-emerald-900">
              Thank you for completing your examination.
            </p>
          </div>

          {latest && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-left rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div>
                <span className="text-slate-500 block">Candidate</span>
                <span className="font-semibold text-slate-900">
                  {user.full_name} ({user.student_number})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Submission Time</span>
                <span className="font-semibold text-slate-900">
                  {latest.submitted_at
                    ? new Date(latest.submitted_at).toLocaleString()
                    : "Recorded"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Attempt Status</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Locked &amp; Verified
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/student/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </Link>
            <Link
              href="/student/results"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3a8a]"
            >
              <Award className="h-4 w-4 text-sky-300" />
              <span>Results Status Page</span>
            </Link>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
