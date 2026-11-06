import React from "react";
import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { StudentShell } from "@/components/StudentShell";
import {
  Clock,
  BookOpen,
  KeyRound,
  PlayCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";

export default async function StudentExamsPage() {
  const user = await requireStudent();
  const db = readDb();

  const activeExams = db.exams.filter((e) => e.status === "active");
  const myAttempts = db.exam_attempts.filter(
    (a) => a.student_id === user.student_id
  );

  return (
    <StudentShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0f234b]">
              Examinations Directory
            </h1>
            <p className="text-sm text-slate-600">
              Official English Language Assessments by Adam Ameyoud
            </p>
          </div>
          <Link
            href="/exam-access"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3a8a]"
          >
            <KeyRound className="h-4 w-4 text-sky-300" />
            <span>Enter Examination Access Code</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {activeExams.map((exam) => {
            const attempt = myAttempts.find((a) => a.exam_id === exam.id);
            const sections = db.exam_sections
              .filter((s) => s.exam_id === exam.id)
              .sort((a, b) => a.section_order - b.section_order);

            return (
              <div
                key={exam.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#0f234b] px-2.5 py-0.5 text-xs font-bold text-white">
                        {exam.level}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        Code: {exam.code}
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-xl font-bold text-slate-900">
                      {exam.title}
                    </h2>
                    <p className="text-xs font-medium text-sky-700">
                      {exam.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/exam-instructions?examId=${exam.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span>Instructions</span>
                    </Link>

                    {attempt?.status === "in_progress" ? (
                      <Link
                        href={`/student/exam/${exam.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500"
                      >
                        <PlayCircle className="h-4 w-4" />
                        <span>Resume Active Attempt</span>
                      </Link>
                    ) : attempt ? (
                      <Link
                        href="/student/submission"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Submitted</span>
                      </Link>
                    ) : (
                      <Link
                        href="/exam-access"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f234b] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e3a8a]"
                      >
                        <KeyRound className="h-4 w-4 text-sky-300" />
                        <span>Unlock & Start</span>
                      </Link>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {exam.description}
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {sections.map((sec) => (
                    <div
                      key={sec.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0f234b]">
                          {sec.title}
                        </span>
                        <span className="rounded bg-white px-2 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
                          {sec.max_marks} pts
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {sec.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <Clock className="h-4 w-4 text-sky-600" />
                    Duration: {exam.duration_minutes} minutes
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    Regular Total: {exam.total_marks} marks (+{exam.bonus_marks}{" "}
                    Bonus)
                  </span>
                  <span>Maximum Attempts: {exam.max_attempts}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StudentShell>
  );
}
