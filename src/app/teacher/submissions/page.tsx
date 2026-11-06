"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/TeacherShell";
import { downloadCSV, generateGroupResultsPDF } from "@/lib/export-utils";
import {
  Search,
  Download,
  FileText,
  ArrowUpDown,
  Loader2,
  ExternalLink,
} from "lucide-react";

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

export default function TeacherSubmissionsPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"name" | "total" | "status">("total");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/teacher/submissions").then((r) => r.json()),
    ]).then(([meRes, subRes]) => {
      if (meRes.user) setUser(meRes.user);
      setSubmissions(subRes.submissions || []);
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

  const groups = Array.from(new Set(submissions.map((s) => s.group_name)));

  const filtered = submissions
    .filter((s) => {
      const matchGroup =
        groupFilter === "ALL" || s.group_name === groupFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.student_name.toLowerCase().includes(q) ||
        s.student_number.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.student_name.localeCompare(b.student_name);
      } else if (sortBy === "status") {
        cmp = a.results_status.localeCompare(b.results_status);
      } else {
        cmp = a.final_total - b.final_total;
      }
      return sortAsc ? cmp : -cmp;
    });

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0f234b]">
              Examination Submissions
            </h1>
            <p className="text-sm text-slate-600">
              Sortable and searchable candidate submissions table
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  "Adam_Ameyoud_Submissions.csv",
                  filtered.map((s) => ({
                    Student: s.student_name,
                    Student_ID: s.student_number,
                    Group: s.group_name,
                    Attempt_Status: s.status,
                    Publication_Status: s.results_status,
                    Grammar_50: s.grammar_score,
                    Reading_25: s.reading_score,
                    Writing_25: s.writing_score,
                    Regular_100: s.score,
                    Bonus_2: s.bonus_score,
                    Final_Total_102: s.final_total,
                  }))
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() =>
                generateGroupResultsPDF({
                  examTitle:
                    filtered[0]?.exam_title || "B1 – FINAL ENGLISH EXAMINATION",
                  groupLabel: groupFilter === "ALL" ? "All Groups" : groupFilter,
                  rows: filtered.map((s) => ({
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f234b] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1e3a8a]"
            >
              <FileText className="h-4 w-4 text-sky-300" />
              <span>Export Summary PDF</span>
            </button>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or ID..."
              className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
          >
            <option value="ALL">All Groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              if (sortBy === "total") setSortAsc(!sortAsc);
              else {
                setSortBy("total");
                setSortAsc(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Sort by Score</span>
          </button>
        </div>

        {/* Required Table Structure (Section 11): Student | Group | Status | Grammar | Reading | Writing | Bonus | Total */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Group</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Grammar (/50)</th>
                  <th className="px-4 py-3.5">Reading (/25)</th>
                  <th className="px-4 py-3.5">Writing (/25)</th>
                  <th className="px-4 py-3.5">Bonus (/2)</th>
                  <th className="px-4 py-3.5">Total (/102)</th>
                  <th className="px-4 py-3.5 text-right">Inspect / Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No submissions match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {sub.student_name}
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                          {sub.student_number}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {sub.group_name}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {sub.grammar_score}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {sub.reading_score}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {sub.writing_score}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-sky-700">
                        +{sub.bonus_score}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-[#0f234b]">
                        {sub.final_total}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          ({sub.score}/100)
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/teacher/submissions/${sub.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f234b] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1e3a8a]"
                        >
                          <span>Open &amp; Grade</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
