"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TeacherShell } from "@/components/TeacherShell";
import {
  ExamRecord,
  ExamSectionRecord,
  QuestionRecord,
  QuestionType,
} from "@/lib/types";
import {
  Save,
  PlusCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Eye,
} from "lucide-react";

export default function TeacherExamDetailPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;

  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [exam, setExam] = useState<ExamRecord | null>(null);
  const [sections, setSections] = useState<ExamSectionRecord[]>([]);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Edit form states
  const [title, setTitle] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(150);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [status, setStatus] = useState("active");

  // Add Question modal state
  const [showAddQ, setShowAddQ] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [newQExercise, setNewQExercise] = useState("Exercise");
  const [newQType, setNewQType] = useState<QuestionType>("single_choice");
  const [newQText, setNewQText] = useState("");
  const [newQKeyword, setNewQKeyword] = useState("");
  const [newQOptions, setNewQOptions] = useState("");
  const [newQCorrect, setNewQCorrect] = useState("");
  const [newQAccepted, setNewQAccepted] = useState("");
  const [newQMarks, setNewQMarks] = useState(1);

  const loadExam = useCallback(async () => {
    const res = await fetch(`/api/teacher/exams?examId=${examId}`);
    if (res.ok) {
      const data = await res.json();
      setExam(data.exam);
      setSections(data.sections || []);
      setQuestions(data.questions || []);
      setTitle(data.exam.title);
      setAccessCode(data.exam.access_code_hint || "");
      setDurationMinutes(data.exam.duration_minutes);
      setMaxAttempts(data.exam.max_attempts);
      setStatus(data.exam.status);
      if (data.sections?.[0]) {
        setSelectedSectionId(data.sections[0].id);
      }
    }
  }, [examId]);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      loadExam(),
    ]).then(([meRes]) => {
      if (meRes.user) setUser(meRes.user);
      setLoading(false);
    });
  }, [loadExam]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/teacher/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        examId,
        title,
        access_code: accessCode,
        duration_minutes: durationMinutes,
        max_attempts: maxAttempts,
        status,
      }),
    });
    if (res.ok) {
      setToast("Examination settings saved.");
      await loadExam();
      setTimeout(() => setToast(""), 3500);
    }
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/teacher/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_question",
        section_id: selectedSectionId,
        exercise_title: newQExercise,
        question_type: newQType,
        question_text: newQText,
        prompt_keyword: newQKeyword || null,
        options: newQOptions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        correct_answers: [newQCorrect.trim()].filter(Boolean),
        accepted_answers: newQAccepted
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        marks: newQMarks,
        grading_method:
          newQType === "essay" || newQType === "bonus_words"
            ? "manual"
            : "auto",
      }),
    });
    if (res.ok) {
      setShowAddQ(false);
      setNewQText("");
      setToast("Question added to examination.");
      await loadExam();
      setTimeout(() => setToast(""), 3500);
    }
  }

  if (loading || !user || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0f234b]" />
      </div>
    );
  }

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/teacher/exams"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#0f234b]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Examinations
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-[#0f234b]">
              {exam.title}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/exam-instructions?examId=${exam.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="h-4 w-4" />
              <span>Preview Student View</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowAddQ(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f234b] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1e3a8a]"
            >
              <PlusCircle className="h-4 w-4 text-sky-300" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {toast && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
        )}

        {/* Settings Card */}
        <form
          onSubmit={handleSaveSettings}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
        >
          <h2 className="text-base font-bold text-[#0f234b]">
            Examination Configuration &amp; Access Controls
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Access Code
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-[#0f234b]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Duration (Min)
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f234b] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e3a8a]"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>

        {/* Sections & Seeded Questions */}
        <div className="space-y-6">
          {sections.map((sec) => {
            const secQuestions = questions.filter(
              (q) => q.section_id === sec.id
            );
            return (
              <div
                key={sec.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#0f234b]">
                      {sec.title} ({sec.max_marks} Marks)
                    </h3>
                    <p className="text-xs text-slate-500">{sec.description}</p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {secQuestions.length} Questions
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {secQuestions.map((q) => (
                    <div key={q.id} className="py-3.5 space-y-1.5 text-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="font-semibold text-slate-900">
                          <span className="text-xs font-bold text-sky-700 mr-2">
                            [{q.exercise_title}]
                          </span>
                          {q.question_text}
                        </div>
                        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-[#0f234b]">
                          {q.marks} pt(s) • {q.grading_method}
                        </span>
                      </div>

                      {q.prompt_keyword && (
                        <div className="text-xs font-semibold text-sky-800">
                          Keyword: {q.prompt_keyword}
                        </div>
                      )}

                      {q.correct_answers?.length > 0 && (
                        <div className="text-xs text-emerald-800 bg-emerald-50/70 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <strong>Answer Key:</strong>{" "}
                          {q.correct_answers.join(" | ")}
                          {q.accepted_answers?.length > 1 && (
                            <span className="text-slate-600 ml-2">
                              (+{q.accepted_answers.length} accepted variants)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Question Modal */}
        {showAddQ && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <form
              onSubmit={handleAddQuestion}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-[#0f234b]">
                Add Question to Examination
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Section
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Question Type
                  </label>
                  <select
                    value={newQType}
                    onChange={(e) =>
                      setNewQType(e.target.value as QuestionType)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="single_choice">Single Choice</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="sentence_transformation">
                      Sentence Transformation
                    </option>
                    <option value="error_correction">Error Correction</option>
                    <option value="fill_in_the_gap">Fill in the Gap</option>
                    <option value="true_false">True / False</option>
                    <option value="reading_comprehension">
                      Reading Comprehension
                    </option>
                    <option value="short_text">Short Text</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Exercise Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newQExercise}
                    onChange={(e) => setNewQExercise(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Marks
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newQMarks}
                    onChange={(e) => setNewQMarks(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Question Prompt *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Primary Correct Answer *
                </label>
                <input
                  type="text"
                  required
                  value={newQCorrect}
                  onChange={(e) => setNewQCorrect(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Accepted Alternatives (one per line)
                </label>
                <textarea
                  rows={2}
                  value={newQAccepted}
                  onChange={(e) => setNewQAccepted(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
                />
              </div>

              {newQType.includes("choice") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Options (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={newQOptions}
                    onChange={(e) => setNewQOptions(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddQ(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0f234b] px-4 py-2 text-xs font-bold text-white"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
