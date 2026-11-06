import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { sanitizeAttemptForStudent } from "@/lib/security";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "student" || !user.student_id) {
      return NextResponse.json(
        { error: "Unauthorized: Student account required." },
        { status: 401 }
      );
    }

    const db = readDb();
    const myAttempts = db.exam_attempts
      .filter(
        (a) => a.student_id === user.student_id && a.status !== "in_progress"
      )
      .sort(
        (a, b) =>
          new Date(b.submitted_at || b.started_at).getTime() -
          new Date(a.submitted_at || a.started_at).getTime()
      );

    const results = myAttempts.map((attempt) => {
      const exam = db.exams.find((e) => e.id === attempt.exam_id);
      const sanitized = sanitizeAttemptForStudent(attempt);
      const isPublished = sanitized.results_published;

      return {
        attemptId: sanitized.id,
        examId: sanitized.exam_id,
        examTitle: exam?.title || "English Examination",
        examSubtitle: exam?.subtitle || "English Language Assessment",
        examLevel: exam?.level || "B1",
        variantCode: sanitized.variant_code || "A",
        submittedAt: sanitized.submitted_at,
        status: sanitized.status,
        oralVerificationStatus:
          sanitized.oral_verification_status || "not_required",
        oralVerificationScheduledAt:
          sanitized.oral_verification_scheduled_at || null,
        oralVerificationNotice:
          sanitized.oral_verification_student_notice || null,
        resultsPublished: isPublished,
        resultsPublishedAt: sanitized.results_published_at,
        message: isPublished
          ? "Official results authorized and published by Adam Ameyoud."
          : "Your examination has been submitted successfully. Results have not yet been released by your teacher.",
        // Strictly null before teacher authorization
        breakdown: isPublished
          ? {
              grammar: sanitized.grammar_score,
              grammarMax: 50,
              reading: sanitized.reading_score,
              readingMax: 25,
              writing: sanitized.writing_score,
              writingMax: 25,
              regularTotal: sanitized.score,
              regularMax: 100,
              bonus: sanitized.bonus_score,
              bonusMax: 2,
              finalTotal: sanitized.final_total,
              finalMax: 102,
              teacherFeedback: sanitized.teacher_overall_feedback,
            }
          : null,
      };
    });

    return NextResponse.json({
      student: {
        full_name: user.full_name,
        student_number: user.student_number,
        group_name: user.group_name,
      },
      results,
    });
  } catch (err) {
    console.error("Student results error:", err);
    return NextResponse.json(
      { error: "Failed to load student results." },
      { status: 500 }
    );
  }
}
