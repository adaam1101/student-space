import { NextRequest, NextResponse } from "next/server";
import { authenticateCredentials } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rate = checkRateLimit(`login:${ip}`, 25, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${rate.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const identifier = String(body.identifier || body.email || "").trim();
    const password = String(body.password || "");
    const expectedRole =
      body.role === "teacher" || body.role === "student"
        ? body.role
        : undefined;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Please provide your Email / Student ID and Password." },
        { status: 400 }
      );
    }

    const user = authenticateCredentials(identifier, password, expectedRole);
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Invalid credentials or unauthorized role. Please check your Email / Student ID and Password.",
        },
        { status: 401 }
      );
    }

    await setSessionCookie(user);

    return NextResponse.json({
      user,
      redirectTo:
        user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard",
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Authentication service error." },
      { status: 500 }
    );
  }
}
