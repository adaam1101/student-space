"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TeacherShell } from "@/components/TeacherShell";
import {
  ShieldAlert,
  ShieldCheck,
  EyeOff,
  RefreshCw,
  WifiOff,
  GitCompare,
  FileSearch,
  UserCheck,
  Clock,
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  MessageSquareLock,
  Shuffle,
} from "lucide-react";
import {
  IntegrityEventRecord,
  IntegrityReviewStatus,
  OralVerificationStatus,
} from "@/lib/types";

interface IntegrityAttemptSummary {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  student_id: string;
  student_name: string;
  student_username: string;
  student_number: string;
  group_name: string;
  variant_code: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  last_saved_at: string;
  tab_switches_count: number;
  total_hidden_seconds: number;
  refresh_count: number;
  disconnect_count: number;
  session_change_count: number;
  teacher_integrity_notes: string;
  integrity_review_status: IntegrityReviewStatus;
  oral_verification_status: OralVerificationStatus;
  oral_verification_scheduled_at: string | null;
  oral_verification_teacher_comments: string;
  oral_verification_student_notice: string;
  regular_score: number;
  bonus_score: number;
  final_total: number;
  results_status: string;
  essay_word_count: number;
  essay_text: string;
  essay_topic: string;
  similarity_flags_count: number;
  max_essay_similarity_pct: number;
  max_pattern_similarity_pct: number;
  events: IntegrityEventRecord[];
}

interface EnrichedSimilarityFlag {
  id: string;
  exam_id: string;
  attempt_a_id: string;
  attempt_b_id: string;
  student_a_id: string;
  student_b_id: string;
  student_a_name: string;
  student_a_number: string;
  student_b_name: string;
  student_b_number: string;
  essay_similarity_pct: number;
  answer_pattern_similarity_pct: number;
  identical_answers_count: number;
  identical_wrong_answers_count: number;
  total_compared_questions: number;
  is_flagged: boolean;
  flagged_reason: string;
  shared_details: string[];
  review_status: "pending_review" | "cleared" | "confirmed_concern";
  teacher_notes: string;
  essay_a_excerpt: string;
  essay_b_excerpt: string;
  updated_at: string;
}

export default function TeacherIntegrityDashboardPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState<
    "sessions" | "originality" | "oral_verification"
  >("sessions");

  const [attempts, setAttempts] = useState<IntegrityAttemptSummary[]>([]);
  const [similarityFlags, setSimilarityFlags] = useState<
    EnrichedSimilarityFlag[]
  >([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>("");

  // Editable states for the selected attempt
  const [reviewStatusInput, setReviewStatusInput] =
    useState<IntegrityReviewStatus>("clean");
  const [privateNotesInput, setPrivateNotesInput] = useState<string>("");
  const [eventNoteDrafts, setEventNoteDrafts] = useState<
    Record<string, string>
  >({});

  // Oral verification editable states
  const [oralStatusInput, setOralStatusInput] =
    useState<OralVerificationStatus>("not_required");
  const [oralScheduledInput, setOralScheduledInput] = useState<string>("");
  const [oralTeacherCommentsInput, setOralTeacherCommentsInput] =
    useState<string>("");
  const [oralStudentNoticeInput, setOralStudentNoticeInput] =
    useState<string>("");

  // Similarity flag notes state
  const [flagNoteDrafts, setFlagNoteDrafts] = useState<Record<string, string>>(
    {}
  );
  const [flagStatusDrafts, setFlagStatusDrafts] = useState<
    Record<string, "pending_review" | "cleared" | "confirmed_concern">
  >({});

  const selectAttempt = useCallback((att: IntegrityAttemptSummary) => {
    setSelectedAttemptId(att.attempt_id);
    setReviewStatusInput(att.integrity_review_status || "clean");
    setPrivateNotesInput(att.teacher_integrity_notes || "");
    setOralStatusInput(att.oral_verification_status || "not_required");
    setOralScheduledInput(
      att.oral_verification_scheduled_at
        ? att.oral_verification_scheduled_at.slice(0, 16)
        : ""
    );
    setOralTeacherCommentsInput(att.oral_verification_teacher_comments || "");
    setOralStudentNoticeInput(att.oral_verification_student_notice || "");

    const evNotes: Record<string, string> = {};
    for (const ev of att.events || []) {
      if (ev.teacher_note) {
        evNotes[ev.id] = ev.teacher_note;
      }
    }
    setEventNoteDrafts(evNotes);
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, res] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/teacher/integrity"),
      ]);
      const meData = await meRes.json();
      if (meData.user) setUser(meData.user);
      const data = await res.json();
      if (res.ok) {
        const list: IntegrityAttemptSummary[] = data.attempts || [];
        setAttempts(list);
        const flags: EnrichedSimilarityFlag[] = data.similarityFlags || [];
        setSimilarityFlags(flags);

        const fnMap: Record<string, string> = {};
        const fsMap: Record<
          string,
          "pending_review" | "cleared" | "confirmed_concern"
        > = {};
        flags.forEach((f) => {
          fnMap[f.id] = f.teacher_notes || "";
          fsMap[f.id] = f.review_status || "pending_review";
        });
        setFlagNoteDrafts(fnMap);
        setFlagStatusDrafts(fsMap);

        if (list.length > 0 && !selectedAttemptId) {
          selectAttempt(list[0]);
        } else if (selectedAttemptId) {
          const found = list.find((a) => a.attempt_id === selectedAttemptId);
          if (found) selectAttempt(found);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAttemptId, selectAttempt]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  function showNotification(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  async function handleSaveAttemptIntegrity() {
    if (!selectedAttemptId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: selectedAttemptId,
          integrityReviewStatus: reviewStatusInput,
          teacherIntegrityNotes: privateNotesInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttempts(data.attempts || []);
        showNotification(
          "Private integrity review notes saved. Candidate score remains untouched."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEventNote(eventId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          eventTeacherNote: eventNoteDrafts[eventId] || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttempts(data.attempts || []);
        showNotification("Private annotation saved on integrity event.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOralVerification() {
    if (!selectedAttemptId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: selectedAttemptId,
          oralVerification: {
            status: oralStatusInput,
            scheduledAt: oralScheduledInput
              ? new Date(oralScheduledInput).toISOString()
              : null,
            teacherComments: oralTeacherCommentsInput,
            studentNotice: oralStudentNoticeInput,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttempts(data.attempts || []);
        showNotification(
          "Post-examination oral verification updated (stored separately from written score)."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSimilarityReview(flagId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          similarityFlagId: flagId,
          similarityReviewStatus: flagStatusDrafts[flagId] || "pending_review",
          similarityTeacherNotes: flagNoteDrafts[flagId] || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimilarityFlags(data.similarityFlags || []);
        showNotification("Originality comparison review updated.");
      }
    } finally {
      setSaving(false);
    }
  }

  const selectedAttempt = attempts.find(
    (a) => a.attempt_id === selectedAttemptId
  );

  const totalTabSwitches = attempts.reduce(
    (sum, a) => sum + (a.tab_switches_count || 0),
    0
  );
  const totalRefreshesAndDisconnects = attempts.reduce(
    (sum, a) =>
      sum +
      (a.refresh_count || 0) +
      (a.disconnect_count || 0) +
      (a.session_change_count || 0),
    0
  );
  const activeFlagCount = similarityFlags.filter((f) => f.is_flagged).length;
  const oralCount = attempts.filter(
    (a) =>
      a.oral_verification_status &&
      a.oral_verification_status !== "not_required"
  ).length;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-[#0f234b]">
        <Loader2 className="mr-2.5 h-6 w-6 animate-spin" />
        <span className="font-semibold">
          Loading Examination Integrity &amp; Verification Center...
        </span>
      </div>
    );
  }

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Academic Integrity &amp; Fair Assessment Module
          </span>
          <h1 className="text-2xl font-bold text-[#0f234b]">
            Examination Integrity &amp; Verification Center
          </h1>
          <p className="text-sm text-slate-600">
            Monitor question randomization variants, tab visibility logs,
            session continuity, answer originality, and post-exam oral
            verification.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0f234b] shadow-2xs hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4 text-sky-600" />
          <span>Refresh Integrity Telemetry</span>
        </button>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Privacy & Fairness Policy Banner */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f234b] text-sky-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-xs sm:text-sm text-slate-700 space-y-0.5">
            <div className="font-bold text-[#0f234b]">
              Fairness &amp; Teacher-In-The-Loop Guarantee
            </div>
            <p className="text-xs text-slate-600">
              Browser events (tab switches, refreshes, Wi-Fi drops) and
              similarity flags <strong>never automatically penalize</strong> or
              fail candidates. All telemetry is presented for your personal
              review, and oral verification outcomes are recorded separately
              from examination scores.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Monitored Sessions &amp; Variants</span>
            <Shuffle className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#0f234b]">
            {attempts.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            MCQ options &amp; compatible exercises randomized
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Tab Visibility Changes</span>
            <EyeOff className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#0f234b]">
            {totalTabSwitches}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Leaving &amp; returning server timestamps logged
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Refreshes / Disconnects / Sessions</span>
            <WifiOff className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#0f234b]">
            {totalRefreshesAndDisconnects}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Individual session continuity tracked
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Similarity Flags &amp; Oral Checks</span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[#0f234b]">
            {activeFlagCount} Flags • {oralCount} Oral
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Essay &amp; answer-pattern originality review
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
            activeTab === "sessions"
              ? "bg-[#0f234b] text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>1. Session Monitoring &amp; Event Inspector</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("originality")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
            activeTab === "originality"
              ? "bg-[#0f234b] text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <GitCompare className="h-4 w-4" />
          <span>2. Answer Originality &amp; Similarity Review</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("oral_verification")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
            activeTab === "oral_verification"
              ? "bg-[#0f234b] text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>3. Post-Examination Oral Verification</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: SESSION MONITORING, TAB VISIBILITY & EVENT INSPECTOR         */}
      {/* =================================================================== */}
      {activeTab === "sessions" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#0f234b]">
                  Candidate Integrity Summary Table
                </h2>
                <p className="text-xs text-slate-500">
                  Click any candidate row to inspect individual timestamped
                  events and record private teacher notes.
                </p>
              </div>
            </div>

            {attempts.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No examination attempts have been started yet. Once{" "}
                <strong>hanine2026</strong> or <strong>ritedj2026</strong> begins
                their examination, live session and tab telemetry will appear
                here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Candidate</th>
                      <th className="px-4 py-3">Variant</th>
                      <th className="px-4 py-3">Tab Switches</th>
                      <th className="px-4 py-3">Refreshes</th>
                      <th className="px-4 py-3">Disconnects</th>
                      <th className="px-4 py-3">Session Changes</th>
                      <th className="px-4 py-3">Submission Timestamp</th>
                      <th className="px-4 py-3">Similarity Flag</th>
                      <th className="px-4 py-3">Review Status</th>
                      <th className="px-4 py-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {attempts.map((att) => {
                      const isSelected = att.attempt_id === selectedAttemptId;
                      return (
                        <tr
                          key={att.attempt_id}
                          onClick={() => selectAttempt(att)}
                          className={`cursor-pointer transition ${
                            isSelected ? "bg-sky-50/70" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">
                              {att.student_name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {att.student_username} • {att.student_number}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-md bg-[#0f234b] px-2.5 py-1 text-xs font-bold text-white">
                              Variant {att.variant_code}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                att.tab_switches_count > 0
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {att.tab_switches_count} switches (
                              {att.total_hidden_seconds}s away)
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700">
                            {att.refresh_count}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700">
                            {att.disconnect_count}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700">
                            {att.session_change_count}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">
                            {att.submitted_at ? (
                              <div>
                                <span className="font-semibold text-emerald-700 block">
                                  Submitted
                                </span>
                                {new Date(att.submitted_at).toLocaleString()}
                              </div>
                            ) : (
                              <div>
                                <span className="font-semibold text-sky-700 block">
                                  In Progress
                                </span>
                                Started{" "}
                                {new Date(att.started_at).toLocaleTimeString()}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {att.similarity_flags_count > 0 ? (
                              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
                                Flagged ({att.max_essay_similarity_pct}% /{" "}
                                {att.max_pattern_similarity_pct}%)
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                Normal ({att.max_essay_similarity_pct}% essay)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                                att.integrity_review_status ===
                                "reviewed_flagged"
                                  ? "bg-red-100 text-red-800"
                                  : att.integrity_review_status ===
                                    "under_review"
                                  ? "bg-amber-100 text-amber-800"
                                  : att.integrity_review_status ===
                                    "reviewed_cleared"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {att.integrity_review_status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAttempt(att);
                              }}
                              className="rounded-lg bg-[#0f234b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3a8a]"
                            >
                              Inspect Events
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detailed Event Log & Private Teacher Notes for Selected Candidate */}
          {selectedAttempt && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left 2 Columns: Chronological Event Timeline */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#0f234b]">
                      Timestamped Integrity Event Log —{" "}
                      {selectedAttempt.student_name} (Variant{" "}
                      {selectedAttempt.variant_code})
                    </h3>
                    <p className="text-xs text-slate-500">
                      All timestamps are server-authoritative. You can attach a
                      private note to any individual event.
                    </p>
                  </div>
                  <Link
                    href={`/teacher/submissions/${selectedAttempt.attempt_id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0f234b] hover:bg-slate-50"
                  >
                    <span>Open Full Submission</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {selectedAttempt.events.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    No integrity events logged for this attempt yet.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                    {selectedAttempt.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`rounded-md px-2.5 py-0.5 text-xs font-bold uppercase ${
                              ev.event_type === "tab_hidden" ||
                              ev.event_type === "concurrent_session_warning" ||
                              ev.event_type === "session_change"
                                ? "bg-amber-100 text-amber-900"
                                : ev.event_type === "network_disconnect" ||
                                  ev.event_type === "page_refresh"
                                ? "bg-indigo-100 text-indigo-900"
                                : "bg-emerald-100 text-emerald-900"
                            }`}
                          >
                            {ev.event_type.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            Server Time:{" "}
                            {new Date(ev.occurred_at).toLocaleString()}
                            {ev.duration_seconds !== null &&
                            ev.duration_seconds !== undefined
                              ? ` • Duration: ${ev.duration_seconds}s`
                              : ""}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-800 font-medium">
                          {ev.details}
                        </p>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={
                              eventNoteDrafts[ev.id] ?? ev.teacher_note ?? ""
                            }
                            onChange={(e) =>
                              setEventNoteDrafts((prev) => ({
                                ...prev,
                                [ev.id]: e.target.value,
                              }))
                            }
                            placeholder="Add private teacher annotation for this event..."
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-[#0f234b] focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSaveEventNote(ev.id)}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Private Integrity Review & Notes */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <MessageSquareLock className="h-5 w-5 text-[#0f234b]" />
                  <div>
                    <h3 className="text-base font-bold text-[#0f234b]">
                      Private Examiner Integrity Notes
                    </h3>
                    <p className="text-xs text-slate-500">
                      Visible only to Adam Ameyoud — never shown to students
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Integrity Review Status
                  </label>
                  <select
                    value={reviewStatusInput}
                    onChange={(e) =>
                      setReviewStatusInput(
                        e.target.value as IntegrityReviewStatus
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#0f234b] focus:outline-none"
                  >
                    <option value="clean">Clean — Normal Activity</option>
                    <option value="under_review">
                      Under Teacher Inspection
                    </option>
                    <option value="reviewed_cleared">
                      Reviewed &amp; Cleared (No Issue)
                    </option>
                    <option value="reviewed_flagged">
                      Reviewed — Follow-Up Required
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Confidential Integrity Notes
                  </label>
                  <textarea
                    rows={6}
                    value={privateNotesInput}
                    onChange={(e) => setPrivateNotesInput(e.target.value)}
                    placeholder="Record private observations regarding tab switches, connection drops, or session patterns..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs sm:text-sm text-slate-800 focus:border-[#0f234b] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAttemptIntegrity}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f234b] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1e3a8a] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Private Integrity Review</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: ANSWER ORIGINALITY & SIMILARITY REVIEW                       */}
      {/* =================================================================== */}
      {activeTab === "originality" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#0f234b] flex items-center gap-2">
                  <FileSearch className="h-5 w-5 text-sky-600" />
                  Cross-Candidate Essay &amp; Answer Pattern Originality Review
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compares essay submissions (3-gram shingle &amp; lexical
                  cosine similarity) and objective/written answer patterns across
                  candidates, even across different randomized variants.
                </p>
              </div>
              <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-900">
                Scores Never Auto-Penalized
              </span>
            </div>

            {similarityFlags.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center space-y-2">
                <GitCompare className="mx-auto h-8 w-8 text-slate-400" />
                <p className="text-sm font-semibold text-slate-800">
                  Originality Comparison Ready
                </p>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  As soon as at least two candidates (e.g.{" "}
                  <strong>hanine2026</strong> and <strong>ritedj2026</strong>)
                  have active or submitted attempts, their pairwise essay
                  similarity and answer-pattern overlap will be displayed here.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {similarityFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className={`rounded-2xl border p-5 space-y-4 ${
                      flag.is_flagged
                        ? "border-amber-300 bg-amber-50/40"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-[#0f234b]">
                            {flag.student_a_name} ({flag.student_a_number})
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            vs.
                          </span>
                          <span className="text-sm font-extrabold text-[#0f234b]">
                            {flag.student_b_name} ({flag.student_b_number})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {flag.flagged_reason}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${
                            flag.essay_similarity_pct >= 40
                              ? "bg-red-100 text-red-800"
                              : "bg-white border border-slate-200 text-[#0f234b]"
                          }`}
                        >
                          Essay Similarity: {flag.essay_similarity_pct}%
                        </span>
                        <span
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${
                            flag.identical_wrong_answers_count >= 3
                              ? "bg-amber-100 text-amber-900"
                              : "bg-white border border-slate-200 text-[#0f234b]"
                          }`}
                        >
                          Answer Pattern Match:{" "}
                          {flag.answer_pattern_similarity_pct}% (
                          {flag.identical_answers_count}/
                          {flag.total_compared_questions} identical •{" "}
                          {flag.identical_wrong_answers_count} shared wrong)
                        </span>
                      </div>
                    </div>

                    {flag.shared_details.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                        <div className="text-xs font-bold text-[#0f234b]">
                          Detected Pattern &amp; Phrase Matches:
                        </div>
                        <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                          {flag.shared_details.map((det, idx) => (
                            <li key={idx}>{det}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Side-by-Side Essay Excerpts */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <div className="text-xs font-bold text-slate-700 mb-1">
                          {flag.student_a_name} — Essay Excerpt:
                        </div>
                        <p className="text-xs text-slate-600 italic leading-relaxed">
                          {flag.essay_a_excerpt || "(No essay text submitted)"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                        <div className="text-xs font-bold text-slate-700 mb-1">
                          {flag.student_b_name} — Essay Excerpt:
                        </div>
                        <p className="text-xs text-slate-600 italic leading-relaxed">
                          {flag.essay_b_excerpt || "(No essay text submitted)"}
                        </p>
                      </div>
                    </div>

                    {/* Teacher Review Controls */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80">
                      <select
                        value={
                          flagStatusDrafts[flag.id] ||
                          flag.review_status ||
                          "pending_review"
                        }
                        onChange={(e) =>
                          setFlagStatusDrafts((prev) => ({
                            ...prev,
                            [flag.id]: e.target.value as
                              | "pending_review"
                              | "cleared"
                              | "confirmed_concern",
                          }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                      >
                        <option value="pending_review">
                          Pending Manual Review
                        </option>
                        <option value="cleared">
                          Reviewed — Cleared (Independent Work)
                        </option>
                        <option value="confirmed_concern">
                          Reviewed — Confirmed Similarity Concern
                        </option>
                      </select>

                      <input
                        type="text"
                        value={flagNoteDrafts[flag.id] ?? flag.teacher_notes ?? ""}
                        onChange={(e) =>
                          setFlagNoteDrafts((prev) => ({
                            ...prev,
                            [flag.id]: e.target.value,
                          }))
                        }
                        placeholder="Add private teacher review note on this comparison..."
                        className="flex-1 min-w-[220px] rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800"
                      />

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveSimilarityReview(flag.id)}
                        className="rounded-xl bg-[#0f234b] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e3a8a]"
                      >
                        Save Originality Decision
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: POST-EXAMINATION ORAL VERIFICATION (SEPARATE FROM SCORE)     */}
      {/* =================================================================== */}
      {activeTab === "oral_verification" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Candidate Selector List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#0f234b]">
              Select Candidate for Oral Verification
            </h2>
            <p className="text-xs text-slate-500">
              Select a student to schedule or record a short post-examination
              oral verification. Verification status and comments are stored{" "}
              <strong>separately from the examination score</strong>.
            </p>

            {attempts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                No candidate attempts available yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {attempts.map((att) => {
                  const active = att.attempt_id === selectedAttemptId;
                  return (
                    <button
                      key={att.attempt_id}
                      type="button"
                      onClick={() => selectAttempt(att)}
                      className={`w-full text-left rounded-xl border p-3.5 transition ${
                        active
                          ? "border-[#0f234b] bg-sky-50/70 ring-1 ring-[#0f234b]"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">
                          {att.student_name}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-[#0f234b] uppercase">
                          {att.oral_verification_status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 flex justify-between">
                        <span>{att.student_username}</span>
                        <span>
                          Written Score: {att.regular_score}/100 (+
                          {att.bonus_score})
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Oral Verification Record Form */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            {!selectedAttempt ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                Select a candidate on the left to manage their post-examination
                oral verification.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                      Post-Examination Verification Record
                    </span>
                    <h3 className="text-lg font-bold text-[#0f234b]">
                      {selectedAttempt.student_name} (
                      {selectedAttempt.student_username})
                    </h3>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-right">
                    <span className="text-[11px] text-slate-500 block">
                      Written Examination Score (Unchanged)
                    </span>
                    <span className="text-sm font-extrabold text-[#0f234b]">
                      {selectedAttempt.regular_score} / 100 • Final:{" "}
                      {selectedAttempt.final_total} / 102
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Oral Verification Status
                    </label>
                    <select
                      value={oralStatusInput}
                      onChange={(e) =>
                        setOralStatusInput(
                          e.target.value as OralVerificationStatus
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-[#0f234b] focus:outline-none"
                    >
                      <option value="not_required">Not Required</option>
                      <option value="selected">
                        Selected for Short Oral Verification
                      </option>
                      <option value="scheduled">
                        Oral Verification Scheduled
                      </option>
                      <option value="completed_verified">
                        Completed — Authorship &amp; Competence Verified
                      </option>
                      <option value="completed_concern">
                        Completed — Discrepancy Noted
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Scheduled Date &amp; Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={oralScheduledInput}
                      onChange={(e) => setOralScheduledInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-[#0f234b] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Candidate Notification Note (Visible to Student When
                    Selected/Scheduled)
                  </label>
                  <input
                    type="text"
                    value={oralStudentNoticeInput}
                    onChange={(e) => setOralStudentNoticeInput(e.target.value)}
                    placeholder="e.g., Please join a 5-minute oral check with Mr. Adam Ameyoud to discuss your essay topic."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#0f234b] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Confidential Teacher Verification Comments (Separate from
                    Score • Private to Teacher)
                  </label>
                  <textarea
                    rows={4}
                    value={oralTeacherCommentsInput}
                    onChange={(e) =>
                      setOralTeacherCommentsInput(e.target.value)
                    }
                    placeholder="Record your observations from the short oral verification (e.g., candidate explained grammar transformations and vocabulary choices fluently)..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs sm:text-sm text-slate-800 focus:border-[#0f234b] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveOralVerification}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1e3a8a] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Oral Verification Record</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </TeacherShell>
  );
}
