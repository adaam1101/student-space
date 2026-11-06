"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/TeacherShell";
import {
  Users,
  PlayCircle,
  CheckCircle2,
  UserX,
  ClipboardCheck,
  PenTool,
  Sparkles,
  TrendingUp,
  Award,
  ShieldCheck,
  ArrowRight,
  Loader2,
  FileText,
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

interface OverviewData {
  stats: {
    totalStudents: number;
    studentsWhoStarted: number;
    studentsWhoSubmitted: number;
    studentsNotStarted: number;
    submissionsAwaitingCorrection: number;
    essaysAwaitingCorrection: number;
    bonusAwaitingCorrection: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    publishedCount: number;
    approvedCount: number;
    totalSubmitted: number;
  };
  submissions: {
    id: string;
    student_name: string;
    student_number: string;
    group_name: string;
    status: string;
    grammar_score: number;
    reading_score: number;
    writing_score: number;
    bonus_score: number;
    score: number;
    final_total: number;
    results_status: string;
    submitted_at: string | null;
  }[];
  auditLogs: {
    id: string;
    user_name?: string;
    action: string;
    created_at: string;
  }[];
}

export default function TeacherDashboardPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/teacher/overview").then((r) => r.json()),
    ])
      .then(([meRes, ovRes]) => {
        if (meRes.user) setUser(meRes.user);
        setData(ovRes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !user || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-[#0f234b]">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span className="font-semibold">Loading Examiner Console...</span>
      </div>
    );
  }

  const s = data.stats;

  const chartData = [
    { name: "Total Students", count: s.totalStudents },
    { name: "Started", count: s.studentsWhoStarted },
    { name: "Submitted", count: s.studentsWhoSubmitted },
    { name: "Not Started", count: s.studentsNotStarted },
    { name: "Published", count: s.publishedCount },
  ];

  return (
    <TeacherShell user={user}>
      <div className="space-y-8">
        {/* Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-[#0f234b] p-6 sm:p-8 text-white shadow-sm">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 px-3 py-1 text-xs font-semibold text-sky-200">
              Examiner Control Center
            </span>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-bold">
              Adam Ameyoud — Assessment Overview
            </h1>
            <p className="mt-1 text-sm text-sky-200">
              Complete control over examinations, candidate submissions, manual
              grading, and results publication.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/teacher/grading"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-[#0f234b] shadow-xs hover:bg-sky-50"
            >
              <PenTool className="h-4 w-4 text-sky-600" />
              <span>Grade Submissions</span>
            </Link>
            <Link
              href="/teacher/results"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/20"
            >
              <ShieldCheck className="h-4 w-4 text-sky-300" />
              <span>Results Publication</span>
            </Link>
            <Link
              href="/teacher/integrity"
              className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/20 px-4 py-2.5 text-xs sm:text-sm font-semibold text-sky-100 hover:bg-sky-500/30"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>Integrity &amp; Verification</span>
            </Link>
          </div>
        </div>

        {/* 12 Required Overview Metrics Grid (Section 11) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Total Students</span>
              <Users className="h-4 w-4 text-[#0f234b]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {s.totalStudents}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Registered candidates
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Students Who Started</span>
              <PlayCircle className="h-4 w-4 text-sky-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {s.studentsWhoStarted}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Entered examination session
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Students Who Submitted</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {s.studentsWhoSubmitted}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Completed &amp; locked attempts
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Not Started Yet</span>
              <UserX className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {s.studentsNotStarted}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Awaiting examination entry
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-amber-800">
              <span>Submissions Awaiting Correction</span>
              <ClipboardCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-950">
              {s.submissionsAwaitingCorrection}
            </div>
            <div className="mt-1 text-xs text-amber-700">
              Pending teacher review
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-amber-800">
              <span>Essays Awaiting Correction</span>
              <PenTool className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-950">
              {s.essaysAwaitingCorrection}
            </div>
            <div className="mt-1 text-xs text-amber-700">
              Part Three Writing rubric (/25)
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-sky-800">
              <span>Bonus Awaiting Correction</span>
              <Sparkles className="h-4 w-4 text-sky-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-sky-950">
              {s.bonusAwaitingCorrection}
            </div>
            <div className="mt-1 text-xs text-sky-700">
              Words for the Teacher (/2)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Publication Status</span>
              <ShieldCheck className="h-4 w-4 text-[#0f234b]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[#0f234b]">
              {s.publishedCount} / {s.totalSubmitted}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {s.approvedCount} approved &amp; ready to release
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Average Regular Score</span>
              <TrendingUp className="h-4 w-4 text-sky-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {s.averageScore}{" "}
              <span className="text-xs font-normal text-slate-500">/ 100</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Across submitted attempts
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Highest Score</span>
              <Award className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {s.highestScore}{" "}
              <span className="text-xs font-normal text-slate-500">/ 100</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Top regular performance
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Lowest Score</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {s.lowestScore}{" "}
              <span className="text-xs font-normal text-slate-500">/ 100</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Minimum recorded score
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Overall Pass Rate</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {s.passRate}%
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Threshold: 50 / 100 marks
            </div>
          </div>
        </div>

        {/* Chart + Recent Submissions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-[#0f234b]">
              Examination Participation Funnel
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Live breakdown of candidate progress and publication status
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f234b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#0f234b]">
                    Recent Submissions &amp; Grading Status
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click any submission to review answers, grade essays, or
                    approve marks
                  </p>
                </div>
                <Link
                  href="/teacher/submissions"
                  className="text-xs font-semibold text-[#0f234b] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {data.submissions.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No candidate submissions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="py-2.5 pr-3">Student</th>
                        <th className="py-2.5 px-2">Group</th>
                        <th className="py-2.5 px-2">Regular</th>
                        <th className="py-2.5 px-2">Final</th>
                        <th className="py-2.5 px-2">Publication</th>
                        <th className="py-2.5 pl-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.submissions.slice(0, 5).map((sub) => (
                        <tr key={sub.id}>
                          <td className="py-3 pr-3 font-semibold text-slate-900">
                            {sub.student_name}
                          </td>
                          <td className="py-3 px-2 text-slate-600">
                            {sub.group_name}
                          </td>
                          <td className="py-3 px-2 font-semibold text-[#0f234b]">
                            {sub.score} / 100
                          </td>
                          <td className="py-3 px-2 font-bold text-slate-900">
                            {sub.final_total} / 102
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                sub.results_status === "published"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : sub.results_status === "approved"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {sub.results_status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 pl-2 text-right">
                            <Link
                              href={`/teacher/submissions/${sub.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0f234b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3a8a]"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
