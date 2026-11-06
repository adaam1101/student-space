// ============================================================================
// ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
// Server-Side Session & Role Authorization Helpers
// ============================================================================

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSessionToken, verifySessionToken } from "./security";
import { AuthenticatedUser } from "./types";
import { readDb } from "./db";

export const SESSION_COOKIE_NAME = "aa_exam_session";
export const EXAM_UNLOCK_COOKIE_PREFIX = "aa_unlock_";

export async function setSessionCookie(user: AuthenticatedUser) {
  const token = signSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function setExamUnlockCookie(examId: string, studentId: string) {
  const cookieStore = await cookies();
  const token = signSessionToken(
    {
      id: studentId,
      full_name: examId,
      email: "unlock@exam",
      role: "student",
      student_id: studentId,
    },
    60 * 60 * 6
  );
  cookieStore.set(`${EXAM_UNLOCK_COOKIE_PREFIX}${examId}`, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6,
  });
}

export async function isExamUnlockedForStudent(
  examId: string,
  studentId: string
): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(`${EXAM_UNLOCK_COOKIE_PREFIX}${examId}`)?.value;
  const payload = verifySessionToken(raw);
  if (!payload) return false;
  return (
    payload.user.student_id === studentId && payload.user.full_name === examId
  );
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  // Verify user still exists and is active in DB
  const db = readDb();
  const profile = db.profiles.find((p) => p.id === payload.user.id);
  if (!profile) return null;

  if (profile.role === "student") {
    const student = db.students.find((s) => s.profile_id === profile.id);
    if (!student || !student.is_active) return null;
    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: "student",
      student_id: student.id,
      student_number: student.student_number,
      group_name: student.group_name,
    };
  }

  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: "teacher",
  };
}

export async function requireTeacher(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?role=teacher");
  }
  if (user.role !== "teacher") {
    redirect("/student/dashboard?error=unauthorized_teacher_route");
  }
  return user;
}

export async function requireStudent(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?role=student");
  }
  if (user.role !== "student") {
    redirect("/teacher/dashboard");
  }
  return user;
}
