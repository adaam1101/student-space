// ============================================================================
// ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
// Security, Cryptography, Rate Limiting & Sanitization Utilities
// ============================================================================

import crypto from "crypto";
import {
  AuthenticatedUser,
  ExamAttemptRecord,
  ExamRecord,
  QuestionRecord,
  StudentQuestionDTO,
} from "./types";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "adam-ameyoud-assessment-production-hmac-secret-2026-x99a8b7c6d5e";

// ----------------------------------------------------------------------------
// 1. Password & Access Code Hashing (scrypt + constant-time comparison)
// ----------------------------------------------------------------------------
export function hashSecret(plain: string): string {
  const normalized = plain.trim();
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(normalized, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifySecret(plain: string, storedHash: string): boolean {
  if (!plain || !storedHash) return false;
  const normalized = plain.trim();
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, hashHex] = parts;
  const derived = crypto.scryptSync(normalized, salt, 64);
  const storedBuf = Buffer.from(hashHex, "hex");
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

// Deterministic hash for initial seed records so restarts don't invalidate seed hashes
export function hashSeedSecret(plain: string, fixedSalt = "adamameyoud2026salt"): string {
  const normalized = plain.trim();
  const derived = crypto.scryptSync(normalized, fixedSalt, 64).toString("hex");
  return `scrypt$${fixedSalt}$${derived}`;
}

// ----------------------------------------------------------------------------
// 2. Signed Session Tokens (HMAC-SHA256)
// ----------------------------------------------------------------------------
export interface SessionPayload {
  user: AuthenticatedUser;
  iat: number;
  exp: number;
}

export function signSessionToken(
  user: AuthenticatedUser,
  ttlSeconds = 60 * 60 * 12 // 12 hours
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    user,
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadB64)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// 3. Input Sanitization & XSS Protection
// ----------------------------------------------------------------------------
export function sanitizeText(input: unknown, maxLength = 25000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .slice(0, maxLength);
}

// ----------------------------------------------------------------------------
// 4. Rate Limiting (Server-side protection against brute force)
// ----------------------------------------------------------------------------
interface RateBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateBucket>();

export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = rateLimitStore.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
  };
}

// ----------------------------------------------------------------------------
// 5. Server-Side Data Stripping (Protect Answer Keys & Unpublished Results)
// ----------------------------------------------------------------------------
export function stripQuestionForStudent(q: QuestionRecord): StudentQuestionDTO {
  return {
    id: q.id,
    section_id: q.section_id,
    exercise_title: q.exercise_title,
    exercise_instructions: q.exercise_instructions,
    question_type: q.question_type,
    question_text: q.question_text,
    prompt_keyword: q.prompt_keyword ?? null,
    options: q.options ?? [],
    marks: q.marks,
    question_order: q.question_order,
  };
}

export function stripExamForStudent(exam: ExamRecord) {
  return {
    id: exam.id,
    code: exam.code,
    title: exam.title,
    subtitle: exam.subtitle,
    description: exam.description,
    level: exam.level,
    duration_minutes: exam.duration_minutes,
    start_time: exam.start_time,
    end_time: exam.end_time,
    max_attempts: exam.max_attempts,
    status: exam.status,
    total_marks: exam.total_marks,
    bonus_marks: exam.bonus_marks,
    reading_passage_title: exam.reading_passage_title,
    reading_passage_text: exam.reading_passage_text,
    created_at: exam.created_at,
  };
}

/**
 * CRITICAL REQUIREMENT (Section 8 & 12):
 * Students must NEVER see marks, scores, preliminary grades, or feedback
 * unless results_status === 'published'.
 */
export function sanitizeAttemptForStudent(attempt: ExamAttemptRecord) {
  const isPublished = attempt.results_status === "published";

  return {
    id: attempt.id,
    exam_id: attempt.exam_id,
    student_id: attempt.student_id,
    attempt_number: attempt.attempt_number,
    variant_code: attempt.variant_code || "A",
    started_at: attempt.started_at,
    submitted_at: attempt.submitted_at,
    status: attempt.status,
    last_saved_at: attempt.last_saved_at,
    tab_switches_count: attempt.tab_switches_count || 0,
    oral_verification_status:
      attempt.oral_verification_status || "not_required",
    oral_verification_scheduled_at:
      attempt.oral_verification_scheduled_at || null,
    oral_verification_student_notice:
      attempt.oral_verification_student_notice || null,
    results_published: isPublished,
    results_published_at: isPublished ? attempt.results_published_at : null,
    // Strictly null out all marks and feedback until teacher explicitly publishes
    grammar_score: isPublished ? attempt.grammar_score : null,
    reading_score: isPublished ? attempt.reading_score : null,
    writing_score: isPublished ? attempt.writing_score : null,
    score: isPublished ? attempt.score : null,
    bonus_score: isPublished ? attempt.bonus_score : null,
    final_total: isPublished ? attempt.final_total : null,
    teacher_overall_feedback:
      isPublished && attempt.show_teacher_feedback
        ? attempt.teacher_overall_feedback
        : null,
  };
}
