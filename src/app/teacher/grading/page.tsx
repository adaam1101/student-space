"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/TeacherShell";
import {
  PenTool,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ClipboardCheck,
} from "lucide-react";

interface GradingItem {
  id: string;
  student_name: string;
  student_number: string;
  group_name: string;
  exam_title: string;
  status: string;
  grammar_score: number;
  reading_score: number;
  writing_score: number;
  bonus_score: number;
  score: number;
  final_total: number;
  results_status: string;
  writing_status: string;
  essay_word_count: number;
  submitted_at: string | null;
}

export default function TeacherManualGradingPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [submissions, setSubmissions] = useState<GradingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/teacher/submissions").then((r) => r.json()),
    ]).then(([meRes, subRes]) => {
      if (meRes.user) setUser(meRes.user);
      setSubmissions(
        (subRes.submissions || []).filter(
          (s: GradingItem) => s.status !== "in_progress"
        )
      );
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

  const displayed = submissions.filter((s) => {
    if (filter === "pending") {
      return (
        s.results_status === "not_graded" ||
        s.results_status === "grading_in_progress" ||
        s.results_status === "awaiting_approval"
      );
    }
    if (filter === "approved") {
      return (
        s.results_status === "approved" || s.results_status === "published"
      );
    }
    return true;
  });

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0f234b]">
              Manual Grading &amp; Writing Rubric Center
            </h1>
            <p className="text-sm text-slate-600">
              Dedicated queue for correcting Part Three Essays (/25), Bonus
              Questions (/2), and reviewing automatic grades
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 p-1">
            {(
              [
                { id: "all", label: "All Submissions" },
                { id: "pending", label: "Awaiting Correction / Approval" },
                { id: "approved", label: "Approved / Published" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === tab.id
                    ? "bg-[#0f234b] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rubric Reference Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f234b] mb-3">
            <PenTool className="h-4 w-4 text-sky-600" />
            Official Writing Assessment Rubric (25 Marks Total)
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="font-bold text-slate-900 block">
                Grammar Accuracy &amp; Range
              </span>
              <span className="text-sky-700 font-semibold">8 Marks</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="font-bold text-slate-900 block">Vocabulary</span>
              <span className="text-sky-700 font-semibold">5 Marks</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="font-bold text-slate-900 block">
                Organisation &amp; Coherence
              </span>
              <span className="text-sky-700 font-semibold">5 Marks</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="font-bold text-slate-900 block">
                Task Achievement &amp; Relevance
              </span>
              <span className="text-sky-700 font-semibold">5 Marks</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="font-bold text-slate-900 block">
                Mechanics &amp; Punctuation
              </span>
              <span className="text-sky-700 font-semibold">2 Marks</span>
            </div>
          </div>
        </div>

        {/* Queue Cards */}
        {displayed.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-2">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="text-base font-bold text-slate-900">
              No Submissions in Queue
            </h3>
            <p className="text-sm text-slate-500">
              Submitted examinations will appear here for manual essay and bonus
              grading.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayed.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-bold text-base text-slate-900">
                      {sub.student_name}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#0f234b] bg-slate-100 px-2 py-0.5 rounded">
                      {sub.student_number}
                    </span>
                    <span className="text-xs text-slate-500">
                      • {sub.group_name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        sub.results_status === "published" ||
                        sub.results_status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {sub.results_status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                    <span>
                      Grammar: <strong>{sub.grammar_score}/50</strong>
                    </span>
                    <span>
                      Reading: <strong>{sub.reading_score}/25</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#0f234b] font-semibold">
                      <PenTool className="h-3.5 w-3.5" />
                      Essay ({sub.essay_word_count} words):{" "}
                      <strong>{sub.writing_score}/25</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                      <Sparkles className="h-3.5 w-3.5" />
                      Bonus: <strong>+{sub.bonus_score}/2</strong>
                    </span>
                    <span className="font-bold text-slate-900">
                      Final Total: {sub.final_total}/102
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/teacher/submissions/${sub.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1e3a8a]"
                  >
                    <CheckCircle2 className="h-4 w-4 text-sky-300" />
                    <span>Open Grading Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
