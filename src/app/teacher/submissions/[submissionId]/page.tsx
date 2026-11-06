"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TeacherShell } from "@/components/TeacherShell";
import { generateStudentResultPDF } from "@/lib/export-utils";
import {
  BonusWordsAnswerValue,
  ExamAttemptRecord,
  ExamRecord,
  ExamSectionRecord,
  QuestionRecord,
  StudentAnswerRecord,
  TrueFalseAnswerValue,
  WritingRubricBreakdown,
  WritingSubmissionRecord,
} from "@/lib/types";
import { sumWritingRubric } from "@/lib/grading";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  ShieldCheck,
  Download,
  Loader2,
  PenTool,
  Sparkles,
} from "lucide-react";

export default function TeacherSubmissionDetailPage() {
  const params = useParams<{ submissionId: string }>();
  const submissionId = params.submissionId;

  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [attempt, setAttempt] = useState<ExamAttemptRecord | null>(null);
  const [student, setStudent] = useState<{
    id: string;
    full_name: string;
    email: string;
    student_number: string;
    group_name: string;
  } | null>(null);
  const [exam, setExam] = useState<ExamRecord | null>(null);
  const [sections, setSections] = useState<ExamSectionRecord[]>([]);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answers, setAnswers] = useState<StudentAnswerRecord[]>([]);
  const [writingSubmission, setWritingSubmission] =
    useState<WritingSubmissionRecord | null>(null);

  // Local editable grading states
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [rubric, setRubric] = useState<WritingRubricBreakdown>({
    grammar_accuracy: 0,
    vocabulary: 0,
    organisation: 0,
    task_achievement: 0,
    mechanics: 0,
  });
  const [writingFeedback, setWritingFeedback] = useState("");
  const [bonusMarks, setBonusMarks] = useState(0);
  const [bonusFeedback, setBonusFeedback] = useState("");
  const [overallFeedback, setOverallFeedback] = useState("");
  const [showFeedbackToStudent, setShowFeedbackToStudent] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmPublishModal, setConfirmPublishModal] = useState(false);

  const loadSubmission = useCallback(async () => {
    const res = await fetch(
      `/api/teacher/submissions?submissionId=${submissionId}`
    );
    if (!res.ok) return;
    const data = await res.json();
    setAttempt(data.attempt);
    setStudent(data.student);
    setExam(data.exam);
    setSections(data.sections || []);
    setQuestions(data.questions || []);
    setAnswers(data.answers || []);
    setWritingSubmission(data.writingSubmission);

    const mMap: Record<string, number> = {};
    const fMap: Record<string, string> = {};
    for (const ans of data.answers || []) {
      mMap[ans.question_id] = Number(ans.awarded_marks) || 0;
      fMap[ans.question_id] = ans.teacher_feedback || "";
    }
    setMarksMap(mMap);
    setFeedbackMap(fMap);

    if (data.writingSubmission) {
      setRubric(
        data.writingSubmission.rubric_breakdown || {
          grammar_accuracy: 0,
          vocabulary: 0,
          organisation: 0,
          task_achievement: 0,
          mechanics: 0,
        }
      );
      setWritingFeedback(data.writingSubmission.feedback || "");
    }

    const bonusQ = (data.questions || []).find(
      (q: QuestionRecord) => q.question_type === "bonus_words"
    );
    if (bonusQ) {
      const bAns = (data.answers || []).find(
        (a: StudentAnswerRecord) => a.question_id === bonusQ.id
      );
      if (bAns) {
        setBonusMarks(Number(bAns.awarded_marks) || 0);
        setBonusFeedback(bAns.teacher_feedback || "");
      }
    }

    setOverallFeedback(data.attempt.teacher_overall_feedback || "");
    setShowFeedbackToStudent(data.attempt.show_teacher_feedback ?? true);
  }, [submissionId]);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      loadSubmission(),
    ]).then(([meRes]) => {
      if (meRes.user) setUser(meRes.user);
      setLoading(false);
    });
  }, [loadSubmission]);

  async function handleSaveGrading(approveFinalGrade: boolean) {
    if (!attempt) return;
    setSaving(true);
    const overrides = questions
      .filter(
        (q) => q.question_type !== "essay" && q.question_type !== "bonus_words"
      )
      .map((q) => ({
        questionId: q.id,
        awardedMarks: Number(marksMap[q.id]) || 0,
        feedback: feedbackMap[q.id] || "",
      }));

    const res = await fetch("/api/teacher/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId: attempt.id,
        questionOverrides: overrides,
        writingGrade: {
          rubric,
          feedback: writingFeedback,
          status: approveFinalGrade ? "approved" : "graded",
        },
        bonusGrade: {
          awardedMarks: bonusMarks,
          feedback: bonusFeedback,
        },
        overallFeedback,
        showTeacherFeedback: showFeedbackToStudent,
        approveFinalGrade,
      }),
    });

    if (res.ok) {
      await loadSubmission();
      setToast(
        approveFinalGrade
          ? "Final grade approved! Ready for publication."
          : "Grading draft saved."
      );
      setTimeout(() => setToast(""), 4000);
    }
    setSaving(false);
  }

  async function handlePublishNow() {
    if (!attempt) return;
    await handleSaveGrading(true);
    const res = await fetch("/api/teacher/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        scope: "individual",
        attemptIds: [attempt.id],
        notes: `Published individually from submission review`,
      }),
    });
    if (res.ok) {
      setConfirmPublishModal(false);
      await loadSubmission();
      setToast("Result officially published to student!");
      setTimeout(() => setToast(""), 4000);
    }
  }

  if (loading || !user || !attempt || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0f234b]" />
      </div>
    );
  }

  const writingTotal = sumWritingRubric(rubric);
  const bonusQuestion = questions.find(
    (q) => q.question_type === "bonus_words"
  );
  const bonusAnswerRec = bonusQuestion
    ? answers.find((a) => a.question_id === bonusQuestion.id)
    : undefined;
  const bonusVal: BonusWordsAnswerValue =
    bonusAnswerRec &&
    typeof bonusAnswerRec.answer === "object" &&
    bonusAnswerRec.answer !== null &&
    !Array.isArray(bonusAnswerRec.answer) &&
    "word1" in (bonusAnswerRec.answer as object)
      ? (bonusAnswerRec.answer as BonusWordsAnswerValue)
      : { word1: "", meaning1: "", word2: "", meaning2: "" };

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/teacher/submissions"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#0f234b]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to All Submissions
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-[#0f234b]">
              {student.full_name} ({student.student_number})
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {student.group_name} • {exam?.title} • Variant{" "}
              <strong className="text-[#0f234b]">
                {attempt.variant_code || "A"}
              </strong>{" "}
              • Tab Switches:{" "}
              <strong className="text-[#0f234b]">
                {attempt.tab_switches_count || 0}
              </strong>{" "}
              • Publication Status:{" "}
              <strong className="uppercase text-[#0f234b]">
                {attempt.results_status.replace(/_/g, " ")}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/teacher/integrity"
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-bold text-[#0f234b] hover:bg-sky-100"
            >
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span>Integrity &amp; Oral Check</span>
            </Link>
            <button
              type="button"
              onClick={() =>
                generateStudentResultPDF({
                  examTitle: exam?.title || "B1 – FINAL ENGLISH EXAMINATION",
                  examSubtitle: exam?.subtitle,
                  studentName: student.full_name,
                  studentNumber: student.student_number,
                  groupName: student.group_name,
                  submittedAt: attempt.submitted_at,
                  grammarScore: attempt.grammar_score,
                  readingScore: attempt.reading_score,
                  writingScore: attempt.writing_score,
                  regularTotal: attempt.score,
                  bonusScore: attempt.bonus_score,
                  finalTotal: attempt.final_total,
                  teacherComments: overallFeedback,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              <span>Export PDF Sheet</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveGrading(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#0f234b] bg-white px-4 py-2.5 text-xs font-bold text-[#0f234b] hover:bg-slate-50"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft Grades</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveGrading(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f234b] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1e3a8a]"
            >
              <CheckCircle2 className="h-4 w-4 text-sky-300" />
              <span>Approve Final Grade</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmPublishModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Publish Result</span>
            </button>
          </div>
        </div>

        {toast && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
        )}

        {/* Live Score Summary Bar */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6 rounded-2xl bg-[#0f234b] p-5 text-white shadow-xs">
          <div>
            <span className="text-xs text-sky-200 block">Grammar</span>
            <span className="text-xl font-bold">
              {attempt.grammar_score} / 50
            </span>
          </div>
          <div>
            <span className="text-xs text-sky-200 block">Reading</span>
            <span className="text-xl font-bold">
              {attempt.reading_score} / 25
            </span>
          </div>
          <div>
            <span className="text-xs text-sky-200 block">Writing (Rubric)</span>
            <span className="text-xl font-bold">{writingTotal} / 25</span>
          </div>
          <div>
            <span className="text-xs text-sky-200 block">Regular Total</span>
            <span className="text-xl font-extrabold text-sky-200">
              {attempt.score} / 100
            </span>
          </div>
          <div>
            <span className="text-xs text-sky-200 block">Bonus</span>
            <span className="text-xl font-bold text-emerald-300">
              +{bonusMarks} / 2
            </span>
          </div>
          <div>
            <span className="text-xs text-sky-200 block">Final Total</span>
            <span className="text-2xl font-extrabold text-white">
              {attempt.final_total} / 102
            </span>
          </div>
        </div>

        {/* PART ONE & PART TWO: GRAMMAR & READING ANSWERS + OVERRIDES */}
        {sections
          .filter((s) => s.section_order === 1 || s.section_order === 2)
          .map((sec) => {
            const secQuestions = questions.filter(
              (q) => q.section_id === sec.id
            );
            return (
              <div
                key={sec.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
              >
                <h2 className="text-lg font-bold text-[#0f234b] border-b border-slate-100 pb-3">
                  {sec.title} ({sec.max_marks} Marks)
                </h2>

                <div className="divide-y divide-slate-100">
                  {secQuestions.map((q) => {
                    const ans = answers.find((a) => a.question_id === q.id);
                    const rawVal = ans?.answer;
                    let displayAnswer = "No answer provided";
                    if (typeof rawVal === "string" && rawVal.trim()) {
                      displayAnswer = rawVal;
                    } else if (Array.isArray(rawVal) && rawVal.length > 0) {
                      displayAnswer = rawVal.join(", ");
                    } else if (
                      rawVal &&
                      typeof rawVal === "object" &&
                      !Array.isArray(rawVal) &&
                      "choice" in (rawVal as object)
                    ) {
                      const tf = rawVal as TrueFalseAnswerValue;
                      displayAnswer = `[${tf.choice || "Unselected"}] — Justification: ${
                        tf.justification || "None"
                      }`;
                    }

                    return (
                      <div
                        key={q.id}
                        className="py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
                      >
                        <div className="lg:col-span-8 space-y-1.5">
                          <div className="text-xs font-bold text-sky-700">
                            {q.exercise_title}
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                            {q.question_text}
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm text-slate-800">
                            <strong>Student Answer:</strong> {displayAnswer}
                          </div>
                          <div className="text-xs text-emerald-800">
                            <strong>Expected Key:</strong>{" "}
                            {q.correct_answers.join(" | ")}
                          </div>
                        </div>

                        <div className="lg:col-span-4 flex flex-col gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#0f234b]">
                              Awarded Marks (Max {q.marks}):
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              max={q.marks}
                              value={marksMap[q.id] ?? 0}
                              onChange={(e) =>
                                setMarksMap((prev) => ({
                                  ...prev,
                                  [q.id]: Number(e.target.value),
                                }))
                              }
                              className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-right text-sm font-bold text-[#0f234b]"
                            />
                          </div>
                          <input
                            type="text"
                            value={feedbackMap[q.id] ?? ""}
                            onChange={(e) =>
                              setFeedbackMap((prev) => ({
                                ...prev,
                                [q.id]: e.target.value,
                              }))
                            }
                            placeholder="Optional note on this question..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {/* PART THREE: WRITING ASSESSMENT & RUBRIC (/25 MARKS) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <PenTool className="h-5 w-5 text-[#0f234b]" />
              <div>
                <h2 className="text-lg font-bold text-[#0f234b]">
                  Part Three: Writing Assessment &amp; Rubric (/25 Marks)
                </h2>
                <p className="text-xs text-slate-500">
                  Manual evaluation by Adam Ameyoud using the official 5-point
                  marking rubric
                </p>
              </div>
            </div>
            <span className="rounded-xl bg-[#0f234b] px-3.5 py-1.5 text-sm font-bold text-white">
              Writing Total: {writingTotal} / 25
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Student Essay Text */}
            <div className="lg:col-span-7 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-700">
                <span className="text-[#0f234b] font-bold block mb-1">
                  Selected Topic:
                </span>
                {writingSubmission?.topic || "No topic selected"}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 min-h-[260px] whitespace-pre-wrap text-sm sm:text-base text-slate-800 leading-relaxed">
                {writingSubmission?.essay_text ||
                  "No essay text submitted by candidate."}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Word Count:{" "}
                  <strong className="text-slate-800">
                    {writingSubmission?.word_count || 0} words
                  </strong>{" "}
                  (Guideline: 180–220 words)
                </span>
                <span>
                  Character Count: {writingSubmission?.char_count || 0}
                </span>
              </div>
            </div>

            {/* Official 5-Criterion Rubric (Section 10) */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#0f234b]">
                Official Writing Rubric
              </h3>

              {[
                {
                  key: "grammar_accuracy" as const,
                  label: "Grammar accuracy and range",
                  max: 8,
                },
                {
                  key: "vocabulary" as const,
                  label: "Vocabulary",
                  max: 5,
                },
                {
                  key: "organisation" as const,
                  label: "Organisation and coherence",
                  max: 5,
                },
                {
                  key: "task_achievement" as const,
                  label: "Task achievement and relevance",
                  max: 5,
                },
                {
                  key: "mechanics" as const,
                  label: "Mechanics and punctuation",
                  max: 2,
                },
              ].map((crit) => (
                <div
                  key={crit.key}
                  className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-200"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      {crit.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Max: {crit.max} marks
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={crit.max}
                    value={rubric[crit.key]}
                    onChange={(e) =>
                      setRubric((prev) => ({
                        ...prev,
                        [crit.key]: Number(e.target.value),
                      }))
                    }
                    className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-sm font-bold text-[#0f234b]"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Writing Correction Feedback
                </label>
                <textarea
                  rows={3}
                  value={writingFeedback}
                  onChange={(e) => setWritingFeedback(e.target.value)}
                  placeholder="Provide detailed feedback on the candidate's essay..."
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BONUS QUESTION GRADING (/2 MARKS) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-sky-600" />
              <div>
                <h2 className="text-lg font-bold text-[#0f234b]">
                  Bonus Question: Words for the Teacher (/2 Marks)
                </h2>
                <p className="text-xs text-slate-500">
                  Each selected word and its explanation is worth 1 mark
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">
                Bonus Marks (/2):
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={2}
                value={bonusMarks}
                onChange={(e) => setBonusMarks(Number(e.target.value))}
                className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-right text-sm font-bold text-sky-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-sm">
              <div className="text-xs font-bold uppercase text-[#0f234b]">
                Word 1 (1 Mark)
              </div>
              <div>
                <strong>Selected Word:</strong>{" "}
                {bonusVal.word1 || "Not provided"}
              </div>
              <div>
                <strong>Student Explanation:</strong>{" "}
                {bonusVal.meaning1 || "Not provided"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-sm">
              <div className="text-xs font-bold uppercase text-[#0f234b]">
                Word 2 (1 Mark)
              </div>
              <div>
                <strong>Selected Word:</strong>{" "}
                {bonusVal.word2 || "Not provided"}
              </div>
              <div>
                <strong>Student Explanation:</strong>{" "}
                {bonusVal.meaning2 || "Not provided"}
              </div>
            </div>
          </div>
        </div>

        {/* OVERALL TEACHER FEEDBACK FOR STUDENT */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0f234b]">
              Overall Examiner Comments &amp; Transcript Feedback
            </h2>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showFeedbackToStudent}
                onChange={(e) => setShowFeedbackToStudent(e.target.checked)}
                className="h-4 w-4 rounded text-[#0f234b]"
              />
              <span>Display feedback to student once published</span>
            </label>
          </div>
          <textarea
            rows={3}
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            placeholder="Write overall examiner feedback for the student's published result card and PDF transcript..."
            className="w-full rounded-xl border border-slate-300 p-3.5 text-sm"
          />
        </div>

        {/* Confirmation Dialog before Publishing */}
        {confirmPublishModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-[#0f234b]">
                Authorize &amp; Publish Student Result
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                You are about to approve and publish the official examination
                marks for <strong>{student.full_name}</strong>. Once published,
                the student will be able to view their section marks and final
                score on their Results page.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmPublishModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePublishNow}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white"
                >
                  Confirm &amp; Publish Result
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
