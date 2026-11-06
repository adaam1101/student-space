import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { BrandHeader } from "@/components/BrandHeader";
import { INITIAL_B1_EXAM_ID } from "@/lib/seed-data";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Lock,
  Wifi,
} from "lucide-react";

export default async function ExamInstructionsPage({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const db = readDb();
  const targetExamId = params.examId || INITIAL_B1_EXAM_ID;
  const exam =
    db.exams.find((e) => e.id === targetExamId) || db.exams[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <BrandHeader user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#0f234b] px-6 py-7 sm:px-8 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                  Official Candidate Briefing & Regulations
                </span>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold">
                  {exam?.title || "B1 – FINAL ENGLISH EXAMINATION"}
                </h1>
                <p className="mt-1 text-sm text-sky-200">
                  Examiner: Adam Ameyoud • Level: {exam?.subtitle || "Strong B1, approaching B2"}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-right">
                <div className="text-xs text-sky-200">Time Allocation</div>
                <div className="text-lg font-bold text-white">
                  {exam?.duration_minutes || 150} Minutes
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Mark Distribution Table */}
            <div>
              <h2 className="text-base font-bold text-[#0f234b] mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sky-600" />
                Examination Structure & Mark Distribution
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Description & Exercises</th>
                      <th className="px-4 py-3 text-right">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    <tr>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        Part One: Grammar
                      </td>
                      <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600">
                        Multiple Choice (10), Sentence Transformation (20),
                        Error Correction (10), Complete the Sentences (10)
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[#0f234b]">
                        50
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        Part Two: Reading Comprehension
                      </td>
                      <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600">
                        Passage &ldquo;THE PRICE OF CONVENIENCE&rdquo; —
                        Comprehension (10), True/False with Justification (6),
                        Vocabulary (4), Reference &amp; Interpretation (5)
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[#0f234b]">
                        25
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        Part Three: Writing
                      </td>
                      <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600">
                        Choose ONE essay topic (180–220 words): Argumentative or
                        Reflective Essay
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-[#0f234b]">
                        25
                      </td>
                    </tr>
                    <tr className="bg-slate-50/70">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        Regular Total
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        Standard percentage base
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        100
                      </td>
                    </tr>
                    <tr className="bg-sky-50/50">
                      <td className="px-4 py-3 font-semibold text-sky-900">
                        Bonus Question
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm text-sky-800">
                        Words for the Teacher — Identify and explain two central
                        words from the reading passage
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-sky-700">
                        +2
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Examination Rules */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
                  <Clock className="h-4 w-4 text-sky-600" />
                  1. Server-Authoritative Timer
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your 150-minute timer begins only when you click{" "}
                  <strong>Start Examination</strong>. Refreshing the browser or
                  reconnecting does not reset the clock. Warnings appear at 15
                  minutes and 5 minutes remaining, and the system automatically
                  submits your examination at expiration.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
                  <Wifi className="h-4 w-4 text-emerald-600" />
                  2. Automatic Saving &amp; Recovery
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every answer and essay draft is saved automatically to the
                  server. If your internet connection briefly drops, your work
                  is preserved and synchronized automatically upon reconnection.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
                  <Lock className="h-4 w-4 text-amber-600" />
                  3. Final Submission Lock
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Once you submit your examination, your attempt is permanently
                  locked and no further edits can be made. Ensure you review all
                  four sections using the left navigation panel before
                  submitting.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  4. Results Publication Policy
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Marks and grades are <strong>never</strong> displayed
                  immediately after submission. Your official score breakdown
                  and feedback will become accessible on your Results page only
                  after Adam Ameyoud reviews and authorizes publication.
                </p>
              </div>
            </div>

            {/* Examination Integrity, Privacy & Fairness Disclosure (Requirement 7 & 8) */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
                <ShieldCheck className="h-4 w-4 text-sky-700" />
                5. Examination Integrity, Privacy &amp; Fairness Notice
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs text-slate-700 leading-relaxed">
                <div>
                  <strong className="text-[#0f234b] block mb-1">
                    What Activity Is Logged:
                  </strong>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>
                      Question and multiple-choice option order are randomized
                      across examination variants while preserving marking keys.
                    </li>
                    <li>
                      Tab visibility changes (leaving and returning timestamps),
                      page refreshes, connection interruptions, and session
                      continuity are logged with server-authoritative timestamps.
                    </li>
                    <li>
                      Submitted essays and answer patterns undergo originality
                      comparison for teacher review.
                    </li>
                  </ul>
                </div>
                <div>
                  <strong className="text-[#0f234b] block mb-1">
                    Privacy &amp; Fairness Protections:
                  </strong>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>
                      This platform <strong>never</strong> activates webcams or
                      microphones and does not monitor external devices.
                    </li>
                    <li>
                      Candidates are <strong>never automatically failed</strong>{" "}
                      or penalized based on browser events or similarity scores;
                      all records require personal review by Adam Ameyoud.
                    </li>
                    <li>
                      The examiner may optionally invite selected candidates for
                      a short post-examination oral verification recorded
                      separately from the written score.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Ensure you have a stable environment before starting your
                  timed attempt.
                </span>
              </div>

              {user?.role === "student" ? (
                <Link
                  href={`/student/exam/${exam?.id || INITIAL_B1_EXAM_ID}`}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#0f234b] px-7 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e3a8a]"
                >
                  <CheckCircle2 className="h-4 w-4 text-sky-300" />
                  <span>Start / Resume Examination</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/exam-access"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#0f234b] px-7 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#1e3a8a]"
                >
                  <span>Sign In &amp; Enter Access Code</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
