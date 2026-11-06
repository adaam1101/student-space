import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  appendAuditLog,
  readDb,
  registerStudentAccount,
  writeDb,
} from "@/lib/db";
import { hashSecret, sanitizeText } from "@/lib/security";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = readDb();
  const students = db.students.map((st) => {
    const prof = db.profiles.find((p) => p.id === st.profile_id);
    const attempts = db.exam_attempts.filter((a) => a.student_id === st.id);
    return {
      ...st,
      full_name: prof?.full_name || "Unknown",
      email: prof?.email || "",
      attempts,
    };
  });

  return NextResponse.json({ students });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const action = String(body.action || "create");

    if (action === "create") {
      const res = registerStudentAccount({
        full_name: String(body.full_name || ""),
        email: String(body.email || ""),
        student_number: body.student_number
          ? String(body.student_number)
          : undefined,
        group_name: String(body.group_name || "Group B1-A"),
        password: String(body.password || "Student@2026!"),
        actor: user,
      });

      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ student: res.user });
    }

    if (action === "bulk_import") {
      const rows = Array.isArray(body.students) ? body.students : [];
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "No student rows found in CSV import." },
          { status: 400 }
        );
      }

      const imported: string[] = [];
      const errors: string[] = [];

      for (const r of rows) {
        const res = registerStudentAccount({
          full_name: String(r.full_name || r.name || ""),
          email: String(r.email || ""),
          student_number: r.student_number || r.student_id || undefined,
          group_name: String(r.group_name || r.group || "Group B1-A"),
          password: String(r.password || "Student@2026!"),
          actor: user,
        });
        if (res.user) {
          imported.push(res.user.full_name);
        } else if (res.error) {
          errors.push(`${r.email || r.full_name || "Row"}: ${res.error}`);
        }
      }

      return NextResponse.json({
        importedCount: imported.length,
        errors,
      });
    }

    if (action === "update") {
      const db = readDb();
      const studentId = String(body.studentId || "");
      const student = db.students.find((s) => s.id === studentId);
      if (!student) {
        return NextResponse.json(
          { error: "Student not found." },
          { status: 404 }
        );
      }
      const profile = db.profiles.find((p) => p.id === student.profile_id);

      if (body.full_name && profile) {
        profile.full_name = sanitizeText(body.full_name, 120).trim();
      }
      if (body.email && profile) {
        profile.email = sanitizeText(body.email, 160).trim().toLowerCase();
      }
      if (body.password && String(body.password).trim().length >= 6 && profile) {
        profile.password_hash = hashSecret(String(body.password).trim());
      }
      if (body.group_name) {
        student.group_name = sanitizeText(body.group_name, 80).trim();
      }
      if (body.student_number) {
        student.student_number = sanitizeText(body.student_number, 40)
          .trim()
          .toUpperCase();
      }
      if (body.is_active !== undefined) {
        student.is_active = Boolean(body.is_active);
      }

      appendAuditLog(db, user, "STUDENT_UPDATED", {
        student_id: student.id,
        student_number: student.student_number,
      });
      writeDb(db);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const db = readDb();
      const studentId = String(body.studentId || "");
      const student = db.students.find((s) => s.id === studentId);
      if (!student) {
        return NextResponse.json(
          { error: "Student not found." },
          { status: 404 }
        );
      }

      db.students = db.students.filter((s) => s.id !== studentId);
      db.profiles = db.profiles.filter((p) => p.id !== student.profile_id);
      const attemptIds = new Set(
        db.exam_attempts
          .filter((a) => a.student_id === studentId)
          .map((a) => a.id)
      );
      db.exam_attempts = db.exam_attempts.filter(
        (a) => a.student_id !== studentId
      );
      db.student_answers = db.student_answers.filter(
        (sa) => !attemptIds.has(sa.attempt_id)
      );
      db.writing_submissions = db.writing_submissions.filter(
        (ws) => !attemptIds.has(ws.attempt_id)
      );

      appendAuditLog(db, user, "STUDENT_DELETED", {
        student_id: studentId,
        student_number: student.student_number,
      });
      writeDb(db);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err) {
    console.error("Teacher student management error:", err);
    return NextResponse.json(
      { error: "Failed to process student operation." },
      { status: 500 }
    );
  }
}
