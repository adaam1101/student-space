import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { isBonusAnswerPopulated } from "@/lib/grading";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Teacher authorization required." },
        { status: 403 }
      );
    }

    const db = readDb();
    const totalStudents = db.students.length;
    const startedStudentIds = new Set(
      db.exam_attempts.map((a) => a.student_id)
    );
    const submittedAttempts = db.exam_attempts.filter(
      (a) => a.status !== "in_progress"
    );
    const submittedStudentIds = new Set(
      submittedAttempts.map((a) => a.student_id)
    );

    const studentsWhoStarted = startedStudentIds.size;
    const studentsWhoSubmitted = submittedStudentIds.size;
    const studentsNotStarted = Math.max(0, totalStudents - studentsWhoStarted);

    const submissionsAwaitingCorrection = submittedAttempts.filter(
      (a) =>
        a.results_status === "not_graded" ||
        a.results_status === "grading_in_progress"
    ).length;

    const essaysAwaitingCorrection = submittedAttempts.filter((a) => {
      const w = db.writing_submissions.find((ws) => ws.attempt_id === a.id);
      return !w || w.grading_status === "pending" || w.grading_status === "draft";
    }).length;

    const bonusQuestions = db.questions.filter(
      (q) => q.question_type === "bonus_words"
    );
    const bonusQIds = new Set(bonusQuestions.map((q) => q.id));

    const bonusAwaitingCorrection = submittedAttempts.filter((a) => {
      const ans = db.student_answers.find(
        (sa) => sa.attempt_id === a.id && bonusQIds.has(sa.question_id)
      );
      if (!ans || !isBonusAnswerPopulated(ans.answer)) return false;
      return !ans.is_graded;
    }).length;

    const regularScores = submittedAttempts.map((a) => Number(a.score) || 0);
    const averageScore =
      regularScores.length > 0
        ? Number(
            (
              regularScores.reduce((acc, s) => acc + s, 0) /
              regularScores.length
            ).toFixed(1)
          )
        : 0;
    const highestScore =
      regularScores.length > 0 ? Math.max(...regularScores) : 0;
    const lowestScore =
      regularScores.length > 0 ? Math.min(...regularScores) : 0;
    const passedCount = regularScores.filter((s) => s >= 50).length;
    const passRate =
      regularScores.length > 0
        ? Number(((passedCount / regularScores.length) * 100).toFixed(1))
        : 0;

    const publishedCount = submittedAttempts.filter(
      (a) => a.results_status === "published"
    ).length;
    const approvedCount = submittedAttempts.filter(
      (a) => a.results_status === "approved"
    ).length;

    // Enrich students with profile & attempt history
    const studentsList = db.students.map((st) => {
      const prof = db.profiles.find((p) => p.id === st.profile_id);
      const stAttempts = db.exam_attempts.filter(
        (a) => a.student_id === st.id
      );
      const latestAttempt = stAttempts[stAttempts.length - 1] || null;
      return {
        ...st,
        full_name: prof?.full_name || "Unknown Student",
        email: prof?.email || "",
        attempts_count: stAttempts.length,
        latest_attempt: latestAttempt,
      };
    });

    // Enrich submissions
    const submissionsList = db.exam_attempts.map((att) => {
      const st = db.students.find((s) => s.id === att.student_id);
      const prof = st
        ? db.profiles.find((p) => p.id === st.profile_id)
        : undefined;
      const exam = db.exams.find((e) => e.id === att.exam_id);
      const writing = db.writing_submissions.find(
        (w) => w.attempt_id === att.id
      );
      return {
        ...att,
        student_name: prof?.full_name || "Unknown Student",
        student_email: prof?.email || "",
        student_number: st?.student_number || "N/A",
        group_name: st?.group_name || "Unassigned",
        exam_title: exam?.title || "English Examination",
        exam_level: exam?.level || "B1",
        writing_status: writing?.grading_status || "pending",
        essay_word_count: writing?.word_count || 0,
      };
    });

    return NextResponse.json({
      stats: {
        totalStudents,
        studentsWhoStarted,
        studentsWhoSubmitted,
        studentsNotStarted,
        submissionsAwaitingCorrection,
        essaysAwaitingCorrection,
        bonusAwaitingCorrection,
        averageScore,
        highestScore,
        lowestScore,
        passRate,
        publishedCount,
        approvedCount,
        totalSubmitted: submittedAttempts.length,
      },
      exams: db.exams,
      sections: db.exam_sections,
      questionsCountByExam: db.exams.reduce<Record<string, number>>((acc, ex) => {
        const secIds = new Set(
          db.exam_sections.filter((s) => s.exam_id === ex.id).map((s) => s.id)
        );
        acc[ex.id] = db.questions.filter((q) =>
          secIds.has(q.section_id)
        ).length;
        return acc;
      }, {}),
      students: studentsList,
      submissions: submissionsList,
      publications: db.results_publications.slice(0, 50),
      auditLogs: db.audit_logs.slice(0, 50),
    });
  } catch (err) {
    console.error("Teacher overview error:", err);
    return NextResponse.json(
      { error: "Failed to load teacher dashboard data." },
      { status: 500 }
    );
  }
}
