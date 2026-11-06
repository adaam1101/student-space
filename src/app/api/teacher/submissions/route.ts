import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readDb, saveTeacherGrading } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submissionId = req.nextUrl.searchParams.get("submissionId");
  const db = readDb();

  if (submissionId) {
    const attempt = db.exam_attempts.find((a) => a.id === submissionId);
    if (!attempt) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404 }
      );
    }

    const student = db.students.find((s) => s.id === attempt.student_id);
    const profile = student
      ? db.profiles.find((p) => p.id === student.profile_id)
      : undefined;
    const exam = db.exams.find((e) => e.id === attempt.exam_id);
    const sections = db.exam_sections
      .filter((s) => s.exam_id === attempt.exam_id)
      .sort((a, b) => a.section_order - b.section_order);
    const secIds = new Set(sections.map((s) => s.id));
    const questions = db.questions
      .filter((q) => secIds.has(q.section_id))
      .sort((a, b) => a.question_order - b.question_order);
    const answers = db.student_answers.filter(
      (a) => a.attempt_id === attempt.id
    );
    const writingSubmission =
      db.writing_submissions.find((w) => w.attempt_id === attempt.id) ?? null;

    return NextResponse.json({
      attempt,
      student: {
        id: student?.id,
        full_name: profile?.full_name || "Unknown Student",
        email: profile?.email || "",
        student_number: student?.student_number || "N/A",
        group_name: student?.group_name || "Unassigned",
      },
      exam,
      sections,
      questions,
      answers,
      writingSubmission,
    });
  }

  // Return all submissions
  const submissions = db.exam_attempts.map((att) => {
    const st = db.students.find((s) => s.id === att.student_id);
    const prof = st
      ? db.profiles.find((p) => p.id === st.profile_id)
      : undefined;
    const exam = db.exams.find((e) => e.id === att.exam_id);
    const writing = db.writing_submissions.find((w) => w.attempt_id === att.id);
    return {
      ...att,
      student_name: prof?.full_name || "Unknown Student",
      student_email: prof?.email || "",
      student_number: st?.student_number || "N/A",
      group_name: st?.group_name || "Unassigned",
      exam_title: exam?.title || "English Examination",
      writing_status: writing?.grading_status || "pending",
      essay_word_count: writing?.word_count || 0,
    };
  });

  return NextResponse.json({ submissions });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const attemptId = String(body.attemptId || "");
    if (!attemptId) {
      return NextResponse.json(
        { error: "Attempt ID is required." },
        { status: 400 }
      );
    }

    const res = saveTeacherGrading({
      teacher: user,
      attemptId,
      questionOverrides: body.questionOverrides,
      writingGrade: body.writingGrade,
      bonusGrade: body.bonusGrade,
      overallFeedback: body.overallFeedback,
      showTeacherFeedback: body.showTeacherFeedback,
      approveFinalGrade: body.approveFinalGrade,
    });

    if (res.error || !res.attempt) {
      return NextResponse.json(
        { error: res.error || "Failed to save grading." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      attempt: res.attempt,
    });
  } catch (err) {
    console.error("Save teacher grading error:", err);
    return NextResponse.json(
      { error: "Failed to save grading updates." },
      { status: 500 }
    );
  }
}
