import { NextRequest, NextResponse } from "next/server";
import { registerStudentAccount } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rate = checkRateLimit(`register:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = registerStudentAccount({
      full_name: String(body.full_name || ""),
      email: String(body.email || ""),
      student_number: body.student_number ? String(body.student_number) : undefined,
      group_name: String(body.group_name || "Group B1-A"),
      password: String(body.password || ""),
    });

    if (result.error || !result.user) {
      return NextResponse.json(
        { error: result.error || "Registration failed." },
        { status: 400 }
      );
    }

    await setSessionCookie(result.user);

    return NextResponse.json({
      user: result.user,
      redirectTo: "/student/dashboard",
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Unable to complete student registration." },
      { status: 500 }
    );
  }
}
