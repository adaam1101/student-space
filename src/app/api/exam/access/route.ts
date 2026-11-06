import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, setExamUnlockCookie } from "@/lib/auth";
import { verifyAndUnlockExamByAccessCode } from "@/lib/db";
import { checkRateLimit, stripExamForStudent } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "student" || !user.student_id) {
      return NextResponse.json(
        { error: "Please sign in with your student account before entering an access code." },
        { status: 401 }
      );
    }

    const rate = checkRateLimit(`exam_access:${user.id}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many access code attempts. Please wait a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const accessCode = String(body.accessCode || "").trim();
    const examId = body.examId ? String(body.examId) : undefined;

    const result = verifyAndUnlockExamByAccessCode({
      student: user,
      accessCode,
      examId,
    });

    if (result.error || !result.exam) {
      return NextResponse.json(
        { error: result.error || "Invalid access code." },
        { status: 403 }
      );
    }

    await setExamUnlockCookie(result.exam.id, user.student_id);

    return NextResponse.json({
      exam: stripExamForStudent(result.exam),
      hasInProgressAttempt: Boolean(result.attempt),
      redirectTo: `/exam-instructions?examId=${result.exam.id}`,
    });
  } catch (err) {
    console.error("Exam access error:", err);
    return NextResponse.json(
      { error: "Unable to verify examination access code." },
      { status: 500 }
    );
  }
}
