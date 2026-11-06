import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateResultsPublication } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json(
        { error: "Forbidden: Only authorized teachers can publish results." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action as
      | "publish"
      | "unpublish"
      | "schedule"
      | "approve";
    const scope = body.scope as "individual" | "group" | "all";

    if (
      !["publish", "unpublish", "schedule", "approve"].includes(action) ||
      !["individual", "group", "all"].includes(scope)
    ) {
      return NextResponse.json(
        { error: "Invalid publication action or scope." },
        { status: 400 }
      );
    }

    const result = updateResultsPublication({
      teacher: user,
      action,
      scope,
      examId: body.examId ? String(body.examId) : undefined,
      attemptIds: Array.isArray(body.attemptIds) ? body.attemptIds : undefined,
      groupName: body.groupName ? String(body.groupName) : undefined,
      scheduledFor: body.scheduledFor ? String(body.scheduledFor) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
    });
  } catch (err) {
    console.error("Results publication error:", err);
    return NextResponse.json(
      { error: "Failed to process results publication." },
      { status: 500 }
    );
  }
}
