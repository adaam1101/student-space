import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  autosaveStudentWork,
  finalizeSubmissionInDb,
  readDb,
  writeDb,
} from "@/lib/db";

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
    const attemptId = String(body.attemptId || "");
    if (!attemptId) {
      return NextResponse.json(
        { error: "Attempt ID is required." },
        { status: 400 }
      );
    }

    // 1. Save any final answers/essay sent with the submit payload
    const dbCheck = readDb();
    const attemptCheck = dbCheck.exam_attempts.find((a) => a.id === attemptId);
    if (!attemptCheck) {
      return NextResponse.json(
        { error: "Examination attempt not found." },
        { status: 404 }
      );
    }
    if (attemptCheck.student_id !== user.student_id) {
      return NextResponse.json(
        { error: "Forbidden: Cannot submit another student's examination." },
        { status: 403 }
      );
    }
    if (attemptCheck.status !== "in_progress") {
      return NextResponse.json(
        {
          error: "This examination has already been submitted and locked.",
          alreadySubmitted: true,
          submittedAt: attemptCheck.submitted_at,
        },
        { status: 409 }
      );
    }

    if (body.answers || body.writing) {
      autosaveStudentWork({
        student: user,
        attemptId,
        answers: Array.isArray(body.answers) ? body.answers : undefined,
        writing: body.writing ? body.writing : undefined,
      });
    }

    // 2. Finalize submission & lock attempt in DB
    const db = readDb();
    const finalized = finalizeSubmissionInDb(
      db,
      attemptId,
      Boolean(body.isTimeout)
    );
    if (!finalized) {
      return NextResponse.json(
        { error: "Unable to finalize submission." },
        { status: 400 }
      );
    }
    writeDb(db);

    // CRITICAL REQUIREMENT (Section 8):
    // Never return marks, scores, correct answers, or preliminary grades!
    return NextResponse.json({
      success: true,
      attemptId: finalized.id,
      examId: finalized.exam_id,
      status: finalized.status,
      submittedAt: finalized.submitted_at,
      confirmationMessage:
        "Your examination has been successfully submitted.\n\nYour answers have been saved securely.\n\nYour results will become available once your teacher authorizes their publication.\n\nThank you for completing your examination.",
    });
  } catch (err) {
    console.error("Submit exam error:", err);
    return NextResponse.json(
      { error: "Failed to submit examination." },
      { status: 500 }
    );
  }
}
