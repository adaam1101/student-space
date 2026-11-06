"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/TeacherShell";
import { ExamRecord } from "@/lib/types";
import {
  PlusCircle,
  Copy,
  Edit3,
  Power,
  KeyRound,
  Clock,
  Loader2,
  Eye,
  CheckCircle2,
} from "lucide-react";

export default function TeacherExamsPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [questionsCount, setQuestionsCount] = useState<Record<string, number>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function refreshExams() {
    const res = await fetch("/api/teacher/overview");
    if (res.ok) {
      const data = await res.json();
      setExams(data.exams || []);
      setQuestionsCount(data.questionsCountByExam || {});
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/teacher/overview").then((r) => r.json()),
    ]).then(([meRes, ovRes]) => {
      if (meRes.user) setUser(meRes.user);
      setExams(ovRes.exams || []);
      setQuestionsCount(ovRes.questionsCountByExam || {});
      setLoading(false);
    });
  }, []);

  async function handleDuplicate(examId: string) {
    const res = await fetch("/api/teacher/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate", examId }),
    });
    if (res.ok) {
      setToast("Examination duplicated successfully.");
      await refreshExams();
      setTimeout(() => setToast(""), 3500);
    }
  }

  async function handleToggleStatus(exam: ExamRecord) {
    const nextStatus = exam.status === "active" ? "inactive" : "active";
    const res = await fetch("/api/teacher/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        examId: exam.id,
        status: nextStatus,
      }),
    });
    if (res.ok) {
      setToast(`Examination status changed to ${nextStatus.toUpperCase()}.`);
      await refreshExams();
      setTimeout(() => setToast(""), 3500);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-[#0f234b]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading examinations...
      </div>
    );
  }

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0f234b]">
              Examination Management
            </h1>
            <p className="text-sm text-slate-600">
              Manage A1, A2, B1, B2, and C1 examinations, access codes,
              durations, and status
            </p>
          </div>
          <Link
            href="/teacher/exams/create"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#1e3a8a]"
          >
            <PlusCircle className="h-4 w-4 text-sky-300" />
            <span>Create New Examination</span>
          </Link>
        </div>

        {toast && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-md bg-[#0f234b] px-2.5 py-0.5 text-xs font-bold text-white">
                      CEFR {exam.level}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        exam.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {exam.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ID: {exam.code}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {exam.title}
                  </h2>
                  <p className="text-xs font-medium text-sky-700">
                    {exam.subtitle}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/teacher/exams/${exam.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f234b] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1e3a8a]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit &amp; Configure Questions</span>
                  </Link>
                  <Link
                    href={`/exam-instructions?examId=${exam.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Preview Instructions</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(exam.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(exam)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      exam.status === "active"
                        ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>
                      {exam.status === "active" ? "Deactivate" : "Activate"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-slate-500 block">Access Code</span>
                  <span className="mt-1 font-mono text-sm font-bold text-[#0f234b] flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-sky-600" />
                    {exam.access_code_hint || "Protected"}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-slate-500 block">Duration</span>
                  <span className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sky-600" />
                    {exam.duration_minutes} Minutes
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-slate-500 block">Total Questions</span>
                  <span className="mt-1 text-sm font-bold text-slate-900 block">
                    {questionsCount[exam.id] || 0} Items
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-slate-500 block">Marks &amp; Bonus</span>
                  <span className="mt-1 text-sm font-bold text-slate-900 block">
                    {exam.total_marks} + {exam.bonus_marks} Bonus
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-slate-500 block">Max Attempts</span>
                  <span className="mt-1 text-sm font-bold text-slate-900 block">
                    {exam.max_attempts} Attempt(s)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TeacherShell>
  );
}
