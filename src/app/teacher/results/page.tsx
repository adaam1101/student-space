"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/TeacherShell";
import {
  ShieldCheck,
  Lock,
  Unlock,
  CalendarClock,
  Users,
  CheckCircle2,
  AlertTriangle,
  History,
  Loader2,
} from "lucide-react";

interface SubmissionRow {
  id: string;
  student_name: string;
  student_number: string;
  group_name: string;
  exam_id: string;
  exam_title: string;
  status: string;
  grammar_score: number;
  reading_score: number;
  writing_score: number;
  bonus_score: number;
  score: number;
  final_total: number;
  results_status: string;
  results_published_at: string | null;
  scheduled_publish_at: string | null;
}

interface PublicationHistoryItem {
  id: string;
  exam_id: string;
  student_id: string;
  attempt_id: string;
  published_at: string;
  scheduled_for?: string | null;
  publication_status: string;
  notes: string;
}

export default function TeacherResultsManagementPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [publications, setPublications] = useState<PublicationHistoryItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [scheduleDateTime, setScheduleDateTime] = useState<string>("");

  // Confirmation Dialog State (Required by Section 8 & 12)
  const [confirmAction, setConfirmAction] = useState<{
    action: "publish" | "unpublish" | "schedule" | "approve";
    scope: "all" | "group" | "individual";
    attemptIds?: string[];
    groupName?: string;
    scheduledFor?: string;
    title: string;
    description: string;
  } | null>(null);

  async function refreshData() {
    const res = await fetch("/api/teacher/overview");
    if (res.ok) {
      const data = await res.json();
      const subs = (data.submissions || []).filter(
        (s: SubmissionRow) => s.status !== "in_progress"
      );
      setSubmissions(subs);
      setPublications(data.publications || []);
      if (!selectedGroup && subs[0]?.group_name) {
        setSelectedGroup(subs[0].group_name);
      }
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/teacher/overview").then((r) => r.json()),
    ]).then(([meRes, ovRes]) => {
      if (meRes.user) setUser(meRes.user);
      const subs = (ovRes.submissions || []).filter(
        (s: SubmissionRow) => s.status !== "in_progress"
      );
      setSubmissions(subs);
      setPublications(ovRes.publications || []);
      if (subs[0]?.group_name) {
        setSelectedGroup(subs[0].group_name);
      }
      setLoading(false);
    });
  }, []);

  async function executePublicationAction() {
    if (!confirmAction) return;
    setError("");
    const res = await fetch("/api/teacher/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: confirmAction.action,
        scope: confirmAction.scope,
        attemptIds: confirmAction.attemptIds,
        groupName: confirmAction.groupName,
        scheduledFor: confirmAction.scheduledFor,
      }),
    });
    const data = await res.json();
    setConfirmAction(null);

    if (!res.ok) {
      setError(data.error || "Publication operation failed.");
      return;
    }

    setToast(
      `Results Management: ${data.updatedCount} submission(s) updated (${confirmAction.action.toUpperCase()}).`
    );
    await refreshData();
    setTimeout(() => setToast(""), 4500);
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0f234b]" />
      </div>
    );
  }

  const groups = Array.from(new Set(submissions.map((s) => s.group_name)));

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0f234b]/10 px-3 py-1 text-xs font-bold text-[#0f234b]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Teacher-Controlled Release Gate
          </span>
          <h1 className="mt-2 text-2xl font-bold text-[#0f234b]">
            RESULTS MANAGEMENT
          </h1>
          <p className="text-sm text-slate-600">
            Students never receive marks automatically. Only explicitly approved
            results authorized here become visible to candidates.
          </p>
        </div>

        {toast && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Teacher Publication Controls (Section 12) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* 1. Global Controls: Approve All / Publish All / Unpublish All */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
              <Unlock className="h-4 w-4 text-emerald-600" />
              Global Publication Controls
            </div>
            <p className="text-xs text-slate-600">
              Approve or release all approved results across the examination, or
              immediately unpublish all results.
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    action: "approve",
                    scope: "all",
                    title: "Approve All Submitted Grades",
                    description:
                      "This will mark all submitted examinations as Approved so they are ready for publication.",
                  })
                }
                className="w-full rounded-xl border border-[#0f234b] bg-white px-4 py-2.5 text-xs font-bold text-[#0f234b] hover:bg-slate-50"
              >
                Approve All Submitted Grades
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    action: "publish",
                    scope: "all",
                    title: "Publish All Approved Results",
                    description:
                      "Are you sure you want to publish all approved results? Candidates will immediately gain access to their marks and breakdown.",
                  })
                }
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Publish All Approved Results
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    action: "unpublish",
                    scope: "all",
                    title: "Unpublish All Results",
                    description:
                      "This will immediately hide all results from students and revert them to Unpublished state.",
                  })
                }
                className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                Unpublish All Results
              </button>
            </div>
          </div>

          {/* 2. Publish by Group */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
              <Users className="h-4 w-4 text-sky-600" />
              Publish Results by Group
            </div>
            <p className="text-xs text-slate-600">
              Release approved results for an entire candidate group at once.
            </p>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            >
              {groups.length === 0 ? (
                <option value="Group B1-A">Group B1-A</option>
              ) : (
                groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))
              )}
            </select>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    action: "publish",
                    scope: "group",
                    groupName: selectedGroup || "Group B1-A",
                    title: `Publish Results for ${
                      selectedGroup || "Group B1-A"
                    }`,
                    description: `Only approved results in ${
                      selectedGroup || "Group B1-A"
                    } will be published to students.`,
                  })
                }
                className="rounded-xl bg-[#0f234b] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1e3a8a]"
              >
                Publish Group
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmAction({
                    action: "unpublish",
                    scope: "group",
                    groupName: selectedGroup || "Group B1-A",
                    title: `Unpublish Results for ${
                      selectedGroup || "Group B1-A"
                    }`,
                    description: `Hide results for all students in ${
                      selectedGroup || "Group B1-A"
                    }.`,
                  })
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Unpublish Group
              </button>
            </div>
          </div>

          {/* 3. Schedule Publication */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0f234b]">
              <CalendarClock className="h-4 w-4 text-indigo-600" />
              Schedule Publication
            </div>
            <p className="text-xs text-slate-600">
              Schedule automatic release of approved results at a specific date
              and time.
            </p>
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!scheduleDateTime}
              onClick={() =>
                setConfirmAction({
                  action: "schedule",
                  scope: "all",
                  scheduledFor: scheduleDateTime,
                  title: "Schedule Results Publication",
                  description: `All approved results will automatically transition to Published on ${new Date(
                    scheduleDateTime
                  ).toLocaleString()}.`,
                })
              }
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Schedule Release
            </button>
          </div>
        </div>

        {/* Individual Results Publication Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0f234b]">
              Individual Candidate Results &amp; Publication States
            </h2>
            <span className="text-xs text-slate-500">
              States: Not graded • Grading in progress • Awaiting approval •
              Approved • Published • Unpublished
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Group</th>
                  <th className="px-4 py-3.5">Regular (/100)</th>
                  <th className="px-4 py-3.5">Bonus (/2)</th>
                  <th className="px-4 py-3.5">Final (/102)</th>
                  <th className="px-4 py-3.5">Publication State</th>
                  <th className="px-4 py-3.5 text-right">
                    Individual Controls
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No submitted examinations yet.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/teacher/submissions/${sub.id}`}
                          className="font-bold text-[#0f234b] hover:underline block"
                        >
                          {sub.student_name}
                        </Link>
                        <span className="text-xs font-mono text-slate-500">
                          {sub.student_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {sub.group_name}
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        {sub.score} / 100
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-sky-700">
                        +{sub.bonus_score} / 2
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-[#0f234b]">
                        {sub.final_total} / 102
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            sub.results_status === "published"
                              ? "bg-emerald-100 text-emerald-800"
                              : sub.results_status === "approved"
                              ? "bg-sky-100 text-sky-800"
                              : sub.results_status === "unpublished"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {sub.results_status === "published" ? (
                            <Unlock className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          {sub.results_status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        {sub.results_status !== "approved" &&
                          sub.results_status !== "published" && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAction({
                                  action: "approve",
                                  scope: "individual",
                                  attemptIds: [sub.id],
                                  title: `Approve Grade for ${sub.student_name}`,
                                  description: `Approve final score (${sub.final_total}/102) so it can be published.`,
                                })
                              }
                              className="rounded-lg border border-[#0f234b] px-3 py-1.5 text-xs font-bold text-[#0f234b] hover:bg-slate-50"
                            >
                              Approve
                            </button>
                          )}

                        {sub.results_status !== "published" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                action: "publish",
                                scope: "individual",
                                attemptIds: [sub.id],
                                title: `Publish Result for ${sub.student_name}`,
                                description: `Authorize publication of ${sub.student_name}'s marks (${sub.final_total}/102).`,
                              })
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                action: "unpublish",
                                scope: "individual",
                                attemptIds: [sub.id],
                                title: `Unpublish Result for ${sub.student_name}`,
                                description: `Hide ${sub.student_name}'s marks from their student portal.`,
                              })
                            }
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            Unpublish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Publication Audit History */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-base text-[#0f234b]">
            <History className="h-4 w-4 text-sky-600" />
            Publication Audit History
          </div>
          {publications.length === 0 ? (
            <p className="text-xs text-slate-500">
              No publication events recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {publications.slice(0, 12).map((pub) => (
                <div
                  key={pub.id}
                  className="py-2.5 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold uppercase text-[#0f234b] mr-2">
                      [{pub.publication_status}]
                    </span>
                    <span className="text-slate-700">{pub.notes}</span>
                  </div>
                  <span className="text-slate-500">
                    {new Date(pub.published_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Dialog Modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-[#0f234b]" />
                <h3 className="text-lg font-bold text-slate-900">
                  {confirmAction.title}
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {confirmAction.description}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executePublicationAction}
                  className="rounded-lg bg-[#0f234b] px-5 py-2 text-xs font-bold text-white hover:bg-[#1e3a8a]"
                >
                  Confirm Authorization
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
