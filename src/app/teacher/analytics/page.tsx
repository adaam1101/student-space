"use client";

import React, { useEffect, useState } from "react";
import { TeacherShell } from "@/components/TeacherShell";
import {
  downloadCSV,
  generateGroupResultsPDF,
  generateStudentResultPDF,
} from "@/lib/export-utils";
import {
  Download,
  FileText,
  BarChart3,
  Loader2,
  Users,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface SubmissionItem {
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
  submitted_at: string | null;
}

export default function TeacherAnalyticsPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/teacher/overview").then((r) => r.json()),
    ]).then(([meRes, ovRes]) => {
      if (meRes.user) setUser(meRes.user);
      setStats(ovRes.stats || {});
      setSubmissions(ovRes.submissions || []);
      setStudents(ovRes.students || []);
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

  const submitted = submissions.filter((s) => s.status !== "in_progress");

  const avgGrammar =
    submitted.length > 0
      ? Number(
          (
            submitted.reduce((a, b) => a + b.grammar_score, 0) /
            submitted.length
          ).toFixed(1)
        )
      : 0;
  const avgReading =
    submitted.length > 0
      ? Number(
          (
            submitted.reduce((a, b) => a + b.reading_score, 0) /
            submitted.length
          ).toFixed(1)
        )
      : 0;
  const avgWriting =
    submitted.length > 0
      ? Number(
          (
            submitted.reduce((a, b) => a + b.writing_score, 0) /
            submitted.length
          ).toFixed(1)
        )
      : 0;

  const sectionPerformanceData = [
    { section: "Grammar (/50)", average: avgGrammar, max: 50 },
    { section: "Reading (/25)", average: avgReading, max: 25 },
    { section: "Writing (/25)", average: avgWriting, max: 25 },
  ];

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f234b]">
            Analytics &amp; Export Reporting Center
          </h1>
          <p className="text-sm text-slate-600">
            Export student lists, examination submissions, group results,
            individual transcripts, and overall examination statistics in CSV,
            Excel-compatible CSV, and PDF.
          </p>
        </div>

        {/* Export Cards (Section 15) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
              <Users className="h-4 w-4 text-sky-600" />
              1. Student Directory
            </div>
            <p className="text-xs text-slate-500">
              Complete list of registered candidates, Student IDs, and groups.
            </p>
            <button
              type="button"
              onClick={() =>
                downloadCSV("Adam_Ameyoud_Student_List.csv", students, true)
              }
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f234b] px-4 py-2.5 text-xs font-bold text-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Excel CSV</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
              <FileText className="h-4 w-4 text-sky-600" />
              2. All Submissions CSV
            </div>
            <p className="text-xs text-slate-500">
              Section scores, regular totals, bonus marks, and publication
              status.
            </p>
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  "Adam_Ameyoud_Submissions_Full.csv",
                  submitted.map((s) => ({
                    Student: s.student_name,
                    Student_ID: s.student_number,
                    Group: s.group_name,
                    Grammar_50: s.grammar_score,
                    Reading_25: s.reading_score,
                    Writing_25: s.writing_score,
                    Regular_100: s.score,
                    Bonus_2: s.bonus_score,
                    Final_102: s.final_total,
                    Status: s.results_status,
                  })),
                  true
                )
              }
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f234b] px-4 py-2.5 text-xs font-bold text-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Submissions CSV</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
              <BarChart3 className="h-4 w-4 text-sky-600" />
              3. Overall Statistics CSV
            </div>
            <p className="text-xs text-slate-500">
              Summary metrics: averages, pass rates, highest/lowest scores.
            </p>
            <button
              type="button"
              onClick={() =>
                downloadCSV("Adam_Ameyoud_Exam_Statistics.csv", [stats], true)
              }
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f234b] px-4 py-2.5 text-xs font-bold text-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Statistics CSV</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
              <Award className="h-4 w-4 text-sky-600" />
              4. Official Summary PDF
            </div>
            <p className="text-xs text-slate-500">
              Printable official PDF summary table for all candidate groups.
            </p>
            <button
              type="button"
              onClick={() =>
                generateGroupResultsPDF({
                  examTitle: "B1 – FINAL ENGLISH EXAMINATION",
                  groupLabel: "All Candidate Groups",
                  rows: submitted.map((s) => ({
                    studentName: s.student_name,
                    studentNumber: s.student_number,
                    groupName: s.group_name,
                    grammarScore: s.grammar_score,
                    readingScore: s.reading_score,
                    writingScore: s.writing_score,
                    regularTotal: s.score,
                    bonusScore: s.bonus_score,
                    finalTotal: s.final_total,
                    resultsStatus: s.results_status,
                  })),
                })
              }
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Download Summary PDF</span>
            </button>
          </div>
        </div>

        {/* Section Performance Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-[#0f234b] mb-4">
            Average Marks by Examination Section
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="section" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="average" fill="#0f234b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Individual PDF Results Sheet Generator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#0f234b]">
            Individual Student PDF Transcripts
          </h2>
          {submitted.length === 0 ? (
            <p className="text-xs text-slate-500">
              No submitted attempts available for individual PDF generation yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {submitted.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {sub.student_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {sub.group_name} • {sub.final_total}/102
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      generateStudentResultPDF({
                        examTitle: sub.exam_title,
                        studentName: sub.student_name,
                        studentNumber: sub.student_number,
                        groupName: sub.group_name,
                        submittedAt: sub.submitted_at,
                        grammarScore: sub.grammar_score,
                        readingScore: sub.reading_score,
                        writingScore: sub.writing_score,
                        regularTotal: sub.score,
                        bonusScore: sub.bonus_score,
                        finalTotal: sub.final_total,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0f234b] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TeacherShell>
  );
}
