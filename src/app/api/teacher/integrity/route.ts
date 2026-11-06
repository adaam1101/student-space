import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getTeacherIntegrityDashboard,
  updateTeacherIntegrityReview,
} from "@/lib/db";
import { IntegrityReviewStatus, OralVerificationStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Teacher authorization required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId") || undefined;

    const data = getTeacherIntegrityDashboard({
      teacher: user,
      examId,
    });

    if ("error" in data && data.error) {
      return NextResponse.json({ error: data.error }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Teacher integrity GET error:", err);
    return NextResponse.json(
      { error: "Failed to load examination integrity dashboard." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Teacher authorization required." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const res = updateTeacherIntegrityReview({
      teacher: user,
      attemptId: body.attemptId ? String(body.attemptId) : undefined,
      integrityReviewStatus: body.integrityReviewStatus as
        | IntegrityReviewStatus
        | undefined,
      teacherIntegrityNotes:
        body.teacherIntegrityNotes !== undefined
          ? String(body.teacherIntegrityNotes)
          : undefined,
      eventId: body.eventId ? String(body.eventId) : undefined,
      eventTeacherNote:
        body.eventTeacherNote !== undefined
          ? String(body.eventTeacherNote)
          : undefined,
      similarityFlagId: body.similarityFlagId
        ? String(body.similarityFlagId)
        : undefined,
      similarityReviewStatus: body.similarityReviewStatus,
      similarityTeacherNotes:
        body.similarityTeacherNotes !== undefined
          ? String(body.similarityTeacherNotes)
          : undefined,
      oralVerification: body.oralVerification
        ? {
            status: body.oralVerification.status as OralVerificationStatus,
            scheduledAt: body.oralVerification.scheduledAt ?? null,
            teacherComments: body.oralVerification.teacherComments,
            studentNotice: body.oralVerification.studentNotice,
          }
        : undefined,
    });

    if (!res.success) {
      return NextResponse.json(
        { error: res.error || "Could not update integrity review." },
        { status: 400 }
      );
    }

    const updatedDashboard = getTeacherIntegrityDashboard({
      teacher: user,
      examId: body.examId ? String(body.examId) : undefined,
    });

    return NextResponse.json({
      success: true,
      ...updatedDashboard,
    });
  } catch (err) {
    console.error("Teacher integrity POST error:", err);
    return NextResponse.json(
      { error: "Failed to save teacher integrity review." },
      { status: 500 }
    );
  }
}
