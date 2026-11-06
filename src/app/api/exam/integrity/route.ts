import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordStudentIntegrityEvent } from "@/lib/db";
import { IntegrityEventType } from "@/lib/types";

const ALLOWED_EVENTS = new Set<IntegrityEventType>([
  "tab_hidden",
  "tab_visible",
  "window_blur",
  "window_focus",
  "page_refresh",
  "network_disconnect",
  "network_reconnect",
  "session_started",
  "session_change",
  "concurrent_session_warning",
  "unusual_access_pattern",
  "privacy_acknowledged",
]);

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
    const eventType = String(body.eventType || "") as IntegrityEventType;

    if (!attemptId || !ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json(
        { error: "Valid attemptId and eventType are required." },
        { status: 400 }
      );
    }

    const result = recordStudentIntegrityEvent({
      student: user,
      attemptId,
      eventType,
      clientTimestamp: body.clientTimestamp
        ? String(body.clientTimestamp)
        : null,
      durationSeconds:
        typeof body.durationSeconds === "number" ? body.durationSeconds : null,
      clientSessionId: body.clientSessionId
        ? String(body.clientSessionId)
        : null,
      details: body.details ? String(body.details) : undefined,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? body.metadata
          : undefined,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({
      recorded: true,
      occurredAt: result.event?.occurred_at,
      counters: result.counters,
    });
  } catch (err) {
    console.error("Integrity event log error:", err);
    return NextResponse.json(
      { error: "Failed to log examination integrity event." },
      { status: 500 }
    );
  }
}
