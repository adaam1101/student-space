import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isExamUnlockedForStudent, setExamUnlockCookie } from "@/lib/auth";
import { readDb, startOrResumeExamAttempt } from "@/lib/db";
import {
  sanitizeAttemptForStudent,
  stripExamForStudent,
  stripQuestionForStudent,
} from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "student" || !user.student_id) {
      return NextResponse.json(
        { error: "Unauthorized: Student login required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const examId = String(body.examId || "");
    const accessCode = body.accessCode ? String(body.accessCode) : undefined;
    const clientSessionId = body.clientSessionId
      ? String(body.clientSessionId)
      : undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    if (!examId) {
      return NextResponse.json(
        { error: "Examination ID is required." },
        { status: 400 }
      );
    }

    const db = readDb();
    const existingInProgress = db.exam_attempts.find(
      (a) =>
        a.exam_id === examId &&
        a.student_id === user.student_id &&
        a.status === "in_progress"
    );

    const unlocked = await isExamUnlockedForStudent(examId, user.student_id);

    if (!existingInProgress && !unlocked && !accessCode) {
      return NextResponse.json(
        {
          error: "ACCESS_CODE_REQUIRED",
          message:
            "Please enter your examination access code before starting the examination.",
        },
        { status: 403 }
      );
    }

    const res = startOrResumeExamAttempt({
      student: user,
      examId,
      accessCode,
      clientSessionId,
      userAgent,
    });

    if (res.error === "EXAM_ALREADY_SUBMITTED" && res.attempt) {
      return NextResponse.json(
        {
          error: "EXAM_ALREADY_SUBMITTED",
          attempt: sanitizeAttemptForStudent(res.attempt),
        },
        { status: 409 }
      );
    }

    if (res.error || !res.exam || !res.attempt) {
      return NextResponse.json(
        { error: res.error || "Could not start examination." },
        { status: 400 }
      );
    }

    if (accessCode) {
      await setExamUnlockCookie(examId, user.student_id);
    }

    return NextResponse.json({
      exam: stripExamForStudent(res.exam),
      attempt: sanitizeAttemptForStudent(res.attempt),
      sections: res.sections || [],
      // Deliver variant-randomized questions (or stripped questions fallback) — never answer keys
      questions:
        res.randomizedStudentQuestions ||
        (res.questions || []).map(stripQuestionForStudent),
      answers: (res.answers || []).map((a) => ({
        question_id: a.question_id,
        answer: a.answer,
        updated_at: a.updated_at,
      })),
      writingSubmission: res.writingSubmission
        ? {
            topic: res.writingSubmission.topic,
            essay_text: res.writingSubmission.essay_text,
            word_count: res.writingSubmission.word_count,
            char_count: res.writingSubmission.char_count,
            updated_at: res.writingSubmission.updated_at,
          }
        : null,
      serverNow: res.serverNow,
      deadlineAt: res.deadlineAt,
      remainingSeconds: res.remainingSeconds,
      sessionChanged: Boolean(res.sessionChanged),
    });
  } catch (err) {
    console.error("Attempt start/resume error:", err);
    return NextResponse.json(
      { error: "Failed to initialize examination session." },
      { status: 500 }
    );
  }
}
