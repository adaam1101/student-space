import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { autosaveStudentWork } from "@/lib/db";

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

    const result = autosaveStudentWork({
      student: user,
      attemptId,
      clientSessionId: body.clientSessionId
        ? String(body.clientSessionId)
        : undefined,
      answers: Array.isArray(body.answers) ? body.answers : undefined,
      writing: body.writing ? body.writing : undefined,
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          autoSubmitted: Boolean(result.autoSubmitted),
          remainingSeconds: result.remainingSeconds ?? 0,
        },
        { status: result.autoSubmitted ? 409 : 400 }
      );
    }

    return NextResponse.json({
      savedAt: result.savedAt,
      remainingSeconds: result.remainingSeconds,
      sessionWarning: Boolean(result.sessionWarning),
      status: "saved",
    });
  } catch (err) {
    console.error("Autosave error:", err);
    return NextResponse.json(
      { error: "Failed to autosave answers." },
      { status: 500 }
    );
  }
}
