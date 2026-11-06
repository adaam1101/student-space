"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { StudentShell } from "@/components/StudentShell";
import { generateStudentResultPDF } from "@/lib/export-utils";
import {
  Award,
  Lock,
  Download,
  CheckCircle2,
  Clock,
  MessageSquareQuote,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

interface ResultItem {
  attemptId: string;
  examId: string;
  examTitle: string;
  examSubtitle: string;
  examLevel: string;
  variantCode?: string;
  submittedAt: string | null;
  status: string;
  oralVerificationStatus?: string;
  oralVerificationScheduledAt?: string | null;
  oralVerificationNotice?: string | null;
  resultsPublished: boolean;
  resultsPublishedAt: string | null;
  message: string;
  breakdown: {
    grammar: number;
    grammarMax: number;
    reading: number;
    readingMax: number;
    writing: number;
    writingMax: number;
    regularTotal: number;
    regularMax: number;
    bonus: number;
    bonusMax: number;
    finalTotal: number;
    finalMax: number;
    teacherFeedback: string | null;
  } | null;
}

export default function StudentResultsPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
    student_number?: string;
    group_name?: string;
  } | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/student/results").then((r) => r.json()),
    ])
      .then(([meData, resData]) => {
        if (meData.user) setUser(meData.user);
        if (resData.results) setResults(resData.results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#0f234b]" />
        Loading candidate results...
      </div>
    );
  }

  return (
    <StudentShell user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f234b]">
            Official Examination Results
          </h1>
          <p className="text-sm text-slate-600">
            Results become visible only after explicit authorization and
            publication by Adam Ameyoud.
          </p>
        </div>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-4">
            <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                No Submitted Examinations Yet
              </h2>
              <p className="text-sm text-slate-500">
                Once you complete and submit your examination, its publication
                status will appear here.
              </p>
            </div>
            <Link
              href="/student/exams"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-5 py-2.5 text-sm font-semibold text-white"
            >
              View Active Examinations
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((item) => {
              if (!item.resultsPublished || !item.breakdown) {
                return (
                  <div
                    key={item.attemptId}
                    className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <span className="rounded-md bg-[#0f234b] px-2.5 py-0.5 text-xs font-bold text-white">
                          CEFR {item.examLevel}
                        </span>
                        <h2 className="mt-1.5 text-lg font-bold text-slate-900">
                          {item.examTitle}
                        </h2>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-semibold text-amber-800">
                        <Lock className="h-3.5 w-3.5" />
                        Awaiting Teacher Release
                      </span>
                    </div>

                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                      <Clock className="mx-auto h-8 w-8 text-[#0f234b]" />
                      <p className="text-sm sm:text-base font-semibold text-slate-800">
                        Your examination has been submitted successfully.
                        Results have not yet been released by your teacher.
                      </p>
                      <p className="text-xs text-slate-500">
                        Submitted at:{" "}
                        {item.submittedAt
                          ? new Date(item.submittedAt).toLocaleString()
                          : "Recorded"}
                      </p>
                    </div>

                    {item.oralVerificationStatus &&
                      item.oralVerificationStatus !== "not_required" && (
                        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-xs sm:text-sm text-sky-950 space-y-1">
                          <div className="font-bold text-[#0f234b]">
                            Post-Examination Oral Verification:{" "}
                            <span className="uppercase tracking-wider text-sky-800">
                              {item.oralVerificationStatus.replace(/_/g, " ")}
                            </span>
                          </div>
                          {item.oralVerificationScheduledAt && (
                            <p className="text-xs text-sky-800">
                              Scheduled Date/Time:{" "}
                              <strong>
                                {new Date(
                                  item.oralVerificationScheduledAt
                                ).toLocaleString()}
                              </strong>
                            </p>
                          )}
                          {item.oralVerificationNotice && (
                            <p className="text-xs text-slate-700">
                              {item.oralVerificationNotice}
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                );
              }

              const b = item.breakdown;

              return (
                <div
                  key={item.attemptId}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
                >
                  {/* Published Banner */}
                  <div className="bg-[#0f234b] px-6 py-5 sm:px-8 text-white flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Official Published Result
                        </span>
                        <span className="text-xs text-sky-200">
                          Released{" "}
                          {item.resultsPublishedAt
                            ? new Date(
                                item.resultsPublishedAt
                              ).toLocaleDateString()
                            : ""}
                        </span>
                      </div>
                      <h2 className="mt-1.5 text-xl font-bold text-white">
                        {item.examTitle}
                      </h2>
                      <p className="text-xs text-sky-200">
                        Candidate: {user.full_name} ({user.student_number}) •{" "}
                        {user.group_name}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        generateStudentResultPDF({
                          examTitle: item.examTitle,
                          examSubtitle: item.examSubtitle,
                          studentName: user.full_name,
                          studentNumber: user.student_number || "N/A",
                          groupName: user.group_name || "Group B1",
                          submittedAt: item.submittedAt,
                          grammarScore: b.grammar,
                          readingScore: b.reading,
                          writingScore: b.writing,
                          regularTotal: b.regularTotal,
                          bonusScore: b.bonus,
                          finalTotal: b.finalTotal,
                          teacherComments: b.teacherFeedback,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-[#0f234b] shadow-xs transition hover:bg-sky-50"
                    >
                      <Download className="h-4 w-4 text-sky-600" />
                      <span>Download PDF Results Sheet</span>
                    </button>
                  </div>

                  {/* Score Breakdown */}
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <span className="text-xs font-semibold text-slate-500 block">
                          Grammar
                        </span>
                        <span className="mt-1.5 block text-xl font-bold text-[#0f234b]">
                          {b.grammar}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            / 50
                          </span>
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <span className="text-xs font-semibold text-slate-500 block">
                          Reading
                        </span>
                        <span className="mt-1.5 block text-xl font-bold text-[#0f234b]">
                          {b.reading}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            / 25
                          </span>
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <span className="text-xs font-semibold text-slate-500 block">
                          Writing
                        </span>
                        <span className="mt-1.5 block text-xl font-bold text-[#0f234b]">
                          {b.writing}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            / 25
                          </span>
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-300 bg-white p-4">
                        <span className="text-xs font-bold text-slate-700 block">
                          Regular Total
                        </span>
                        <span className="mt-1.5 block text-xl font-extrabold text-slate-900">
                          {b.regularTotal}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            / 100
                          </span>
                        </span>
                      </div>

                      <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                        <span className="text-xs font-semibold text-sky-800 block">
                          Bonus
                        </span>
                        <span className="mt-1.5 block text-xl font-bold text-sky-700">
                          +{b.bonus}{" "}
                          <span className="text-xs font-normal text-sky-600">
                            / 2
                          </span>
                        </span>
                      </div>

                      <div className="rounded-xl border border-[#0f234b] bg-[#0f234b] p-4 text-white">
                        <span className="text-xs font-semibold text-sky-200 block">
                          Final Total
                        </span>
                        <span className="mt-1.5 block text-xl font-extrabold text-white">
                          {b.finalTotal}{" "}
                          <span className="text-xs font-normal text-sky-200">
                            / 102
                          </span>
                        </span>
                      </div>
                    </div>

                    {b.teacherFeedback && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f234b] mb-2">
                          <MessageSquareQuote className="h-4 w-4 text-sky-600" />
                          Examiner Feedback — Adam Ameyoud
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                          {b.teacherFeedback}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
