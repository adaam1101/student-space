// ============================================================================
// ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
// Server-Side Database Engine (Supabase PostgreSQL + Local Persistent Store)
// ============================================================================

import "server-only";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { buildInitialDatabase } from "./seed-data";
import {
  AnswerValue,
  AuthenticatedUser,
  DatabaseSchema,
  ExamAttemptRecord,
  ExamRecord,
  ExamSectionRecord,
  GradingRecord,
  IntegrityEventRecord,
  IntegrityEventType,
  IntegrityReviewStatus,
  OralVerificationStatus,
  ProfileRecord,
  QuestionRecord,
  ResultsPublicationRecord,
  ResultsStatus,
  SimilarityFlagRecord,
  StudentAnswerRecord,
  StudentQuestionDTO,
  StudentRecord,
  WritingRubricBreakdown,
  WritingSubmissionRecord,
} from "./types";
import {
  calculateAttemptTotals,
  countWords,
  evaluateQuestionAnswer,
  sumWritingRubric,
} from "./grading";
import { hashSecret, sanitizeText, verifySecret } from "./security";
import {
  buildRandomizedStudentQuestions,
  ensureAttemptRandomization,
  runOriginalityAnalysis,
} from "./integrity";

function resolveDataDir(): string {
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), "adam-ameyoud-exams-data");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

const DATA_DIR = resolveDataDir();
const DB_FILE = path.join(DATA_DIR, "database.json");

function ensureDatabaseFile(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = buildInitialDatabase();
    initial.integrity_events = initial.integrity_events || [];
    initial.similarity_flags = initial.similarity_flags || [];
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.profiles || !parsed.exams) {
      const initial = buildInitialDatabase();
      initial.integrity_events = initial.integrity_events || [];
      initial.similarity_flags = initial.similarity_flags || [];
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    parsed.integrity_events = parsed.integrity_events || [];
    parsed.similarity_flags = parsed.similarity_flags || [];
    return parsed;
  } catch {
    const initial = buildInitialDatabase();
    initial.integrity_events = initial.integrity_events || [];
    initial.similarity_flags = initial.similarity_flags || [];
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

export function readDb(): DatabaseSchema {
  const db = ensureDatabaseFile();
  let mutated = false;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // 1. Check scheduled publications
  for (const attempt of db.exam_attempts) {
    if (
      attempt.scheduled_publish_at &&
      attempt.results_status === "approved" &&
      new Date(attempt.scheduled_publish_at).getTime() <= now
    ) {
      attempt.results_status = "published";
      attempt.results_published_at = nowIso;
      attempt.scheduled_publish_at = null;
      mutated = true;
    }
  }

  // 2. Check server-authoritative timer expirations for in_progress attempts
  for (const attempt of db.exam_attempts) {
    if (attempt.status === "in_progress") {
      const exam = db.exams.find((e) => e.id === attempt.exam_id);
      if (exam) {
        const startedMs = new Date(attempt.started_at).getTime();
        const deadlineMs = startedMs + exam.duration_minutes * 60 * 1000;
        if (now >= deadlineMs) {
          finalizeSubmissionInDb(
            db,
            attempt.id,
            true,
            new Date(deadlineMs).toISOString()
          );
          mutated = true;
        }
      }
    }
  }

  if (mutated) {
    writeDb(db);
  }
  return db;
}

export function writeDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmpFile, DB_FILE);
}

export function appendAuditLog(
  db: DatabaseSchema,
  user: AuthenticatedUser | null,
  action: string,
  metadata: Record<string, unknown> = {}
) {
  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    user_id: user?.id ?? null,
    user_name: user?.full_name ?? "System",
    user_role: user?.role ?? "system",
    action,
    metadata,
    created_at: new Date().toISOString(),
  });
  if (db.audit_logs.length > 1000) {
    db.audit_logs = db.audit_logs.slice(0, 1000);
  }
}

// ----------------------------------------------------------------------------
// Internal helper: Run automatic grading and lock an attempt upon submission
// ----------------------------------------------------------------------------
export function finalizeSubmissionInDb(
  db: DatabaseSchema,
  attemptId: string,
  isAutoTimeout = false,
  customSubmittedAt?: string
): ExamAttemptRecord | null {
  const attempt = db.exam_attempts.find((a) => a.id === attemptId);
  if (!attempt) return null;
  if (attempt.status !== "in_progress") {
    return attempt;
  }

  const nowIso = customSubmittedAt || new Date().toISOString();
  const sections = db.exam_sections.filter(
    (s) => s.exam_id === attempt.exam_id
  );
  const sectionIds = new Set(sections.map((s) => s.id));
  const questions = db.questions.filter((q) => sectionIds.has(q.section_id));

  // Ensure every question has a student_answers record and run automatic grading
  for (const q of questions) {
    let ansRec = db.student_answers.find(
      (a) => a.attempt_id === attempt.id && a.question_id === q.id
    );
    if (!ansRec) {
      ansRec = {
        id: crypto.randomUUID(),
        attempt_id: attempt.id,
        question_id: q.id,
        answer: "",
        awarded_marks: 0,
        auto_awarded_marks: 0,
        is_graded: q.grading_method === "auto",
        is_manual_override: false,
        teacher_feedback: "",
        updated_at: nowIso,
      };
      db.student_answers.push(ansRec);
    } else if (!ansRec.is_manual_override) {
      const gradeResult = evaluateQuestionAnswer(q, ansRec.answer);
      ansRec.auto_awarded_marks = gradeResult.awardedMarks;
      ansRec.awarded_marks = gradeResult.awardedMarks;
      ansRec.true_false_choice_marks = gradeResult.tfChoiceMarks ?? null;
      ansRec.true_false_justification_marks =
        gradeResult.tfJustificationMarks ?? null;
      ansRec.is_graded = gradeResult.isGraded;
      ansRec.updated_at = nowIso;
    }
  }

  const attemptAnswers = db.student_answers.filter(
    (a) => a.attempt_id === attempt.id
  );
  const writingSub = db.writing_submissions.find(
    (w) => w.attempt_id === attempt.id
  );

  const totals = calculateAttemptTotals({
    sections,
    questions,
    answers: attemptAnswers,
    writingSubmission: writingSub,
  });

  attempt.status = isAutoTimeout ? "auto_submitted" : "submitted";
  attempt.submitted_at = nowIso;
  attempt.grammar_score = totals.grammar_score;
  attempt.reading_score = totals.reading_score;
  attempt.writing_score = totals.writing_score;
  attempt.score = totals.score;
  attempt.bonus_score = totals.bonus_score;
  attempt.final_total = totals.final_total;
  // IMPORTANT: Results remain strictly 'not_graded' / 'grading_in_progress' (NEVER published automatically)
  if (
    attempt.results_status !== "approved" &&
    attempt.results_status !== "published"
  ) {
    attempt.results_status = "grading_in_progress";
  }

  // Run cross-candidate originality & answer-pattern similarity check upon submission
  // (Flags suspicious similarity for teacher review; NEVER modifies scores)
  runOriginalityAnalysis(db, attempt.exam_id);

  appendAuditLog(
    db,
    null,
    isAutoTimeout ? "EXAM_AUTO_SUBMITTED_TIMEOUT" : "EXAM_SUBMITTED",
    {
      attempt_id: attempt.id,
      exam_id: attempt.exam_id,
      student_id: attempt.student_id,
      submitted_at: nowIso,
      variant_code: attempt.variant_code || "A",
    }
  );

  return attempt;
}

// ----------------------------------------------------------------------------
// Authentication & User Lookup Operations
// ----------------------------------------------------------------------------
export function authenticateCredentials(
  identifier: string,
  passwordPlain: string,
  _expectedRole?: "teacher" | "student"
): AuthenticatedUser | null {
  const db = readDb();
  const cleanId = identifier.trim().toLowerCase();

  // Match by username/email, student_number, or normalized full_name
  let profile = db.profiles.find(
    (p) =>
      p.email.toLowerCase() === cleanId ||
      p.full_name.toLowerCase().replace(/\s+/g, "") ===
        cleanId.replace(/\s+/g, "")
  );
  let student = profile
    ? db.students.find((s) => s.profile_id === profile!.id)
    : undefined;

  if (!profile) {
    student = db.students.find(
      (s) => s.student_number.toLowerCase() === cleanId
    );
    if (student) {
      profile = db.profiles.find((p) => p.id === student!.profile_id);
    }
  }

  if (!profile) return null;
  if (profile.role === "student" && student && !student.is_active) return null;

  const valid = verifySecret(passwordPlain, profile.password_hash);
  if (!valid) return null;

  const authUser: AuthenticatedUser = {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    student_id: student?.id,
    student_number: student?.student_number,
    group_name: student?.group_name,
  };

  appendAuditLog(db, authUser, "USER_LOGIN_SUCCESS", {
    role: authUser.role,
    email: authUser.email,
  });
  writeDb(db);

  return authUser;
}

export function registerStudentAccount(params: {
  full_name: string;
  email: string;
  student_number?: string;
  group_name: string;
  password: string;
  actor?: AuthenticatedUser | null;
}): { user?: AuthenticatedUser; error?: string } {
  const db = readDb();
  const fullName = sanitizeText(params.full_name, 120).trim();
  const email = sanitizeText(params.email, 160).trim().toLowerCase();
  const groupName = sanitizeText(params.group_name || "Group B1-A", 80).trim();

  if (!fullName || !email || !params.password || params.password.length < 6) {
    return {
      error:
        "Full name, valid email, and password (minimum 6 characters) are required.",
    };
  }

  if (db.profiles.some((p) => p.email.toLowerCase() === email)) {
    return { error: "An account with this email address already exists." };
  }

  const nextNum = db.students.length + 1;
  const studentNumber =
    sanitizeText(params.student_number, 40).trim().toUpperCase() ||
    `STU-2026-${String(nextNum).padStart(3, "0")}`;

  if (
    db.students.some(
      (s) => s.student_number.toLowerCase() === studentNumber.toLowerCase()
    )
  ) {
    return { error: `Student ID "${studentNumber}" is already assigned.` };
  }

  const nowIso = new Date().toISOString();
  const profileId = crypto.randomUUID();
  const studentId = crypto.randomUUID();

  const newProfile: ProfileRecord = {
    id: profileId,
    full_name: fullName,
    email,
    password_hash: hashSecret(params.password),
    role: "student",
    created_at: nowIso,
  };

  const newStudent: StudentRecord = {
    id: studentId,
    profile_id: profileId,
    student_number: studentNumber,
    group_name: groupName,
    is_active: true,
    created_at: nowIso,
  };

  db.profiles.push(newProfile);
  db.students.push(newStudent);

  const authUser: AuthenticatedUser = {
    id: profileId,
    full_name: fullName,
    email,
    role: "student",
    student_id: studentId,
    student_number: studentNumber,
    group_name: groupName,
  };

  appendAuditLog(db, params.actor ?? authUser, "STUDENT_REGISTERED", {
    student_id: studentId,
    student_number: studentNumber,
    group_name: groupName,
  });

  writeDb(db);
  return { user: authUser };
}

// ----------------------------------------------------------------------------
// Examination Access & Attempt Management
// ----------------------------------------------------------------------------
export function verifyAndUnlockExamByAccessCode(params: {
  student: AuthenticatedUser;
  accessCode: string;
  examId?: string;
}): { exam?: ExamRecord; attempt?: ExamAttemptRecord; error?: string } {
  const db = readDb();
  if (params.student.role !== "student" || !params.student.student_id) {
    return { error: "Only authenticated students can access examinations." };
  }

  const cleanCode = params.accessCode.trim();
  if (!cleanCode) {
    return { error: "Please enter a valid examination access code." };
  }

  const candidateExams = params.examId
    ? db.exams.filter((e) => e.id === params.examId)
    : db.exams.filter((e) => e.status === "active");

  const matchedExam = candidateExams.find((e) =>
    verifySecret(cleanCode, e.access_code_hash)
  );

  if (!matchedExam) {
    appendAuditLog(db, params.student, "EXAM_ACCESS_CODE_FAILED", {
      exam_id: params.examId ?? "any",
    });
    writeDb(db);
    return {
      error: "Invalid examination access code. Please verify with your teacher.",
    };
  }

  if (matchedExam.status !== "active") {
    return { error: "This examination is currently inactive." };
  }

  const now = Date.now();
  if (new Date(matchedExam.start_time).getTime() > now) {
    return { error: "This examination has not opened yet." };
  }
  if (new Date(matchedExam.end_time).getTime() < now) {
    return { error: "This examination window has closed." };
  }

  const existingAttempts = db.exam_attempts.filter(
    (a) =>
      a.exam_id === matchedExam.id && a.student_id === params.student.student_id
  );

  const inProgress = existingAttempts.find((a) => a.status === "in_progress");
  if (inProgress) {
    return { exam: matchedExam, attempt: inProgress };
  }

  if (existingAttempts.length >= matchedExam.max_attempts) {
    return {
      error:
        "You have already completed and submitted the maximum allowed attempts for this examination.",
    };
  }

  appendAuditLog(db, params.student, "EXAM_ACCESS_CODE_VERIFIED", {
    exam_id: matchedExam.id,
    exam_title: matchedExam.title,
  });
  writeDb(db);

  return { exam: matchedExam };
}

export function startOrResumeExamAttempt(params: {
  student: AuthenticatedUser;
  examId: string;
  accessCode?: string;
  clientSessionId?: string;
  userAgent?: string;
}): {
  exam?: ExamRecord;
  attempt?: ExamAttemptRecord;
  sections?: ExamSectionRecord[];
  questions?: QuestionRecord[];
  randomizedStudentQuestions?: StudentQuestionDTO[];
  answers?: StudentAnswerRecord[];
  writingSubmission?: WritingSubmissionRecord | null;
  serverNow?: string;
  deadlineAt?: string;
  remainingSeconds?: number;
  sessionChanged?: boolean;
  error?: string;
} {
  const db = readDb();
  if (params.student.role !== "student" || !params.student.student_id) {
    return { error: "Unauthorized: Student account required." };
  }

  const exam = db.exams.find((e) => e.id === params.examId);
  if (!exam) {
    return { error: "Examination not found." };
  }
  if (exam.status !== "active") {
    return { error: "This examination is not currently active." };
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  if (new Date(exam.start_time).getTime() > now) {
    return { error: "This examination has not opened yet." };
  }
  if (new Date(exam.end_time).getTime() < now) {
    return { error: "This examination has closed." };
  }

  const sections = db.exam_sections
    .filter((s) => s.exam_id === exam.id)
    .sort((a, b) => a.section_order - b.section_order);
  const sectionIds = new Set(sections.map((s) => s.id));
  const questions = db.questions
    .filter((q) => sectionIds.has(q.section_id))
    .sort((a, b) => a.question_order - b.question_order);

  const existingAttempts = db.exam_attempts.filter(
    (a) => a.exam_id === exam.id && a.student_id === params.student.student_id
  );

  let attempt = existingAttempts.find((a) => a.status === "in_progress");
  let sessionChanged = false;
  let dbMutated = false;

  if (!attempt) {
    if (existingAttempts.length >= exam.max_attempts) {
      const latest = existingAttempts[existingAttempts.length - 1];
      return {
        exam,
        attempt: latest,
        error: "EXAM_ALREADY_SUBMITTED",
      };
    }

    // If starting a brand new attempt, verify accessCode if provided or require it
    if (params.accessCode !== undefined) {
      if (!verifySecret(params.accessCode, exam.access_code_hash)) {
        return { error: "Invalid examination access code." };
      }
    }

    attempt = {
      id: crypto.randomUUID(),
      exam_id: exam.id,
      student_id: params.student.student_id,
      attempt_number: existingAttempts.length + 1,
      started_at: nowIso,
      submitted_at: null,
      status: "in_progress",
      grammar_score: 0,
      reading_score: 0,
      writing_score: 0,
      score: 0,
      bonus_score: 0,
      final_total: 0,
      results_status: "not_graded",
      results_published_at: null,
      results_published_by: null,
      scheduled_publish_at: null,
      teacher_overall_feedback: "",
      show_teacher_feedback: true,
      last_saved_at: nowIso,
      active_client_session_id: params.clientSessionId || null,
      active_user_agent: params.userAgent
        ? sanitizeText(params.userAgent, 250)
        : null,
      tab_switches_count: 0,
      total_hidden_seconds: 0,
      refresh_count: 0,
      disconnect_count: 0,
      session_change_count: 0,
      teacher_integrity_notes: "",
      integrity_review_status: "clean",
      oral_verification_status: "not_required",
      oral_verification_scheduled_at: null,
      oral_verification_teacher_comments: "",
      oral_verification_student_notice: "",
      privacy_notice_acknowledged_at: nowIso,
    };

    ensureAttemptRandomization(attempt, sections, questions);
    db.exam_attempts.push(attempt);

    db.integrity_events = db.integrity_events || [];
    db.integrity_events.unshift({
      id: crypto.randomUUID(),
      attempt_id: attempt.id,
      exam_id: exam.id,
      student_id: params.student.student_id,
      event_type: "session_started",
      occurred_at: nowIso,
      client_timestamp: nowIso,
      duration_seconds: null,
      client_session_id: params.clientSessionId || null,
      details: `Examination session initialized (Variant ${attempt.variant_code || "A"}).`,
      metadata: {
        variant_code: attempt.variant_code || "A",
        user_agent: attempt.active_user_agent,
      },
    });

    appendAuditLog(db, params.student, "EXAM_ATTEMPT_STARTED", {
      exam_id: exam.id,
      attempt_id: attempt.id,
      variant_code: attempt.variant_code || "A",
      started_at: nowIso,
      duration_minutes: exam.duration_minutes,
    });
    dbMutated = true;
  } else {
    // Resuming an active attempt: ensure randomization exists & check session continuity
    const randRes = ensureAttemptRandomization(attempt, sections, questions);
    if (randRes.mutated) dbMutated = true;

    if (params.clientSessionId) {
      if (
        attempt.active_client_session_id &&
        attempt.active_client_session_id !== params.clientSessionId
      ) {
        sessionChanged = true;
        attempt.session_change_count = (attempt.session_change_count || 0) + 1;
        const prevSession = attempt.active_client_session_id;
        attempt.active_client_session_id = params.clientSessionId;
        if (params.userAgent) {
          attempt.active_user_agent = sanitizeText(params.userAgent, 250);
        }

        db.integrity_events = db.integrity_events || [];
        db.integrity_events.unshift({
          id: crypto.randomUUID(),
          attempt_id: attempt.id,
          exam_id: exam.id,
          student_id: params.student.student_id,
          event_type: "session_change",
          occurred_at: nowIso,
          client_timestamp: nowIso,
          duration_seconds: null,
          client_session_id: params.clientSessionId,
          details:
            "Active examination resumed from a different browser tab or session context.",
          metadata: {
            previous_session_id: prevSession,
            new_session_id: params.clientSessionId,
            user_agent: attempt.active_user_agent,
          },
        });
        dbMutated = true;
      } else if (!attempt.active_client_session_id) {
        attempt.active_client_session_id = params.clientSessionId;
        dbMutated = true;
      }
    }
  }

  if (dbMutated) {
    writeDb(db);
  }

  const startedMs = new Date(attempt.started_at).getTime();
  const deadlineMs = startedMs + exam.duration_minutes * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.floor((deadlineMs - now) / 1000));

  const randomizedStudentQuestions = buildRandomizedStudentQuestions(
    attempt,
    sections,
    questions
  );

  const answers = db.student_answers.filter(
    (a) => a.attempt_id === attempt!.id
  );
  const writingSubmission =
    db.writing_submissions.find((w) => w.attempt_id === attempt!.id) ?? null;

  return {
    exam,
    attempt,
    sections,
    questions,
    randomizedStudentQuestions,
    answers,
    writingSubmission,
    serverNow: nowIso,
    deadlineAt: new Date(deadlineMs).toISOString(),
    remainingSeconds,
    sessionChanged,
  };
}

// ----------------------------------------------------------------------------
// Autosave Student Answers & Essay
// ----------------------------------------------------------------------------
export function autosaveStudentWork(params: {
  student: AuthenticatedUser;
  attemptId: string;
  clientSessionId?: string;
  answers?: { questionId: string; answer: AnswerValue }[];
  writing?: { topic: string; essayText: string };
}): {
  savedAt?: string;
  remainingSeconds?: number;
  autoSubmitted?: boolean;
  sessionWarning?: boolean;
  error?: string;
} {
  const db = readDb();
  const attempt = db.exam_attempts.find((a) => a.id === params.attemptId);
  if (!attempt) {
    return { error: "Examination attempt not found." };
  }
  if (attempt.student_id !== params.student.student_id) {
    return { error: "Forbidden: You cannot modify another student's attempt." };
  }

  const exam = db.exams.find((e) => e.id === attempt.exam_id);
  if (!exam) {
    return { error: "Examination not found." };
  }

  const now = Date.now();
  const startedMs = new Date(attempt.started_at).getTime();
  const deadlineMs = startedMs + exam.duration_minutes * 60 * 1000;

  if (attempt.status !== "in_progress") {
    return {
      error: "This examination has already been submitted and locked.",
      autoSubmitted: attempt.status === "auto_submitted",
      remainingSeconds: 0,
    };
  }

  if (now >= deadlineMs) {
    finalizeSubmissionInDb(
      db,
      attempt.id,
      true,
      new Date(deadlineMs).toISOString()
    );
    writeDb(db);
    return {
      error: "Examination time has expired. Your answers have been automatically submitted.",
      autoSubmitted: true,
      remainingSeconds: 0,
    };
  }

  const nowIso = new Date(now).toISOString();
  let sessionWarning = false;

  // Detect simultaneous/changed client session during autosave
  if (params.clientSessionId) {
    if (
      attempt.active_client_session_id &&
      attempt.active_client_session_id !== params.clientSessionId
    ) {
      sessionWarning = true;
      attempt.session_change_count = (attempt.session_change_count || 0) + 1;
      const prevSession = attempt.active_client_session_id;
      attempt.active_client_session_id = params.clientSessionId;

      db.integrity_events = db.integrity_events || [];
      db.integrity_events.unshift({
        id: crypto.randomUUID(),
        attempt_id: attempt.id,
        exam_id: exam.id,
        student_id: attempt.student_id,
        event_type: "concurrent_session_warning",
        occurred_at: nowIso,
        client_timestamp: nowIso,
        duration_seconds: null,
        client_session_id: params.clientSessionId,
        details:
          "Autosave received from a different session token than the previously active tab.",
        metadata: {
          previous_session_id: prevSession,
          new_session_id: params.clientSessionId,
        },
      });
    } else if (!attempt.active_client_session_id) {
      attempt.active_client_session_id = params.clientSessionId;
    }
  }

  // Save objective/short answers
  if (Array.isArray(params.answers)) {
    for (const item of params.answers) {
      const question = db.questions.find((q) => q.id === item.questionId);
      if (!question) continue;

      let sanitizedAnswer: AnswerValue = "";
      if (typeof item.answer === "string") {
        sanitizedAnswer = sanitizeText(item.answer, 5000);
      } else if (Array.isArray(item.answer)) {
        sanitizedAnswer = item.answer.map((v) => sanitizeText(v, 1000));
      } else if (item.answer && typeof item.answer === "object") {
        if ("choice" in item.answer) {
          sanitizedAnswer = {
            choice:
              item.answer.choice === "True" || item.answer.choice === "False"
                ? item.answer.choice
                : "",
            justification: sanitizeText(item.answer.justification, 2000),
          };
        } else if ("word1" in item.answer) {
          sanitizedAnswer = {
            word1: sanitizeText(item.answer.word1, 200),
            meaning1: sanitizeText(item.answer.meaning1, 2000),
            word2: sanitizeText(item.answer.word2, 200),
            meaning2: sanitizeText(item.answer.meaning2, 2000),
          };
        }
      }

      const existing = db.student_answers.find(
        (a) => a.attempt_id === attempt.id && a.question_id === question.id
      );

      // Compute preliminary server-side grade (never returned to student!)
      const preliminary = evaluateQuestionAnswer(question, sanitizedAnswer);

      if (existing) {
        existing.answer = sanitizedAnswer;
        existing.auto_awarded_marks = preliminary.awardedMarks;
        if (!existing.is_manual_override) {
          existing.awarded_marks = preliminary.awardedMarks;
          existing.true_false_choice_marks = preliminary.tfChoiceMarks ?? null;
          existing.true_false_justification_marks =
            preliminary.tfJustificationMarks ?? null;
          existing.is_graded = preliminary.isGraded;
        }
        existing.updated_at = nowIso;
      } else {
        db.student_answers.push({
          id: crypto.randomUUID(),
          attempt_id: attempt.id,
          question_id: question.id,
          answer: sanitizedAnswer,
          awarded_marks: preliminary.awardedMarks,
          auto_awarded_marks: preliminary.awardedMarks,
          true_false_choice_marks: preliminary.tfChoiceMarks ?? null,
          true_false_justification_marks:
            preliminary.tfJustificationMarks ?? null,
          is_graded: preliminary.isGraded,
          is_manual_override: false,
          teacher_feedback: "",
          updated_at: nowIso,
        });
      }
    }
  }

  // Save essay submission
  if (params.writing) {
    const cleanTopic = sanitizeText(params.writing.topic, 500);
    const cleanEssay = sanitizeText(params.writing.essayText, 25000);
    const words = countWords(cleanEssay);
    const chars = cleanEssay.length;

    const existingWriting = db.writing_submissions.find(
      (w) => w.attempt_id === attempt.id
    );
    if (existingWriting) {
      existingWriting.topic = cleanTopic;
      existingWriting.essay_text = cleanEssay;
      existingWriting.word_count = words;
      existingWriting.char_count = chars;
      existingWriting.updated_at = nowIso;
    } else {
      db.writing_submissions.push({
        id: crypto.randomUUID(),
        attempt_id: attempt.id,
        topic: cleanTopic,
        essay_text: cleanEssay,
        word_count: words,
        char_count: chars,
        awarded_marks: null,
        rubric_breakdown: {
          grammar_accuracy: 0,
          vocabulary: 0,
          organisation: 0,
          task_achievement: 0,
          mechanics: 0,
        },
        feedback: "",
        grading_status: "pending",
        updated_at: nowIso,
      });
    }
  }

  attempt.last_saved_at = nowIso;
  writeDb(db);

  return {
    savedAt: nowIso,
    remainingSeconds: Math.max(0, Math.floor((deadlineMs - now) / 1000)),
    sessionWarning,
  };
}

// ----------------------------------------------------------------------------
// Teacher Grading & Results Publication Operations
// ----------------------------------------------------------------------------
export function saveTeacherGrading(params: {
  teacher: AuthenticatedUser;
  attemptId: string;
  questionOverrides?: {
    questionId: string;
    awardedMarks: number;
    feedback?: string;
    tfChoiceMarks?: number;
    tfJustificationMarks?: number;
  }[];
  writingGrade?: {
    rubric: WritingRubricBreakdown;
    feedback: string;
    status: "draft" | "graded" | "approved";
  };
  bonusGrade?: {
    awardedMarks: number;
    feedback: string;
  };
  overallFeedback?: string;
  showTeacherFeedback?: boolean;
  approveFinalGrade?: boolean;
}): { attempt?: ExamAttemptRecord; error?: string } {
  if (params.teacher.role !== "teacher") {
    return { error: "Forbidden: Teacher authorization required." };
  }

  const db = readDb();
  const attempt = db.exam_attempts.find((a) => a.id === params.attemptId);
  if (!attempt) {
    return { error: "Submission not found." };
  }

  const nowIso = new Date().toISOString();
  const sections = db.exam_sections.filter(
    (s) => s.exam_id === attempt.exam_id
  );
  const sectionIds = new Set(sections.map((s) => s.id));
  const questions = db.questions.filter((q) => sectionIds.has(q.section_id));

  // 1. Apply question overrides (Grammar, Reading, etc.)
  if (Array.isArray(params.questionOverrides)) {
    for (const ov of params.questionOverrides) {
      const q = questions.find((item) => item.id === ov.questionId);
      if (!q) continue;
      const clamped = Math.min(
        q.marks,
        Math.max(0, Number(ov.awardedMarks) || 0)
      );

      let ans = db.student_answers.find(
        (a) => a.attempt_id === attempt.id && a.question_id === q.id
      );
      if (!ans) {
        ans = {
          id: crypto.randomUUID(),
          attempt_id: attempt.id,
          question_id: q.id,
          answer: "",
          awarded_marks: clamped,
          auto_awarded_marks: 0,
          is_graded: true,
          is_manual_override: true,
          teacher_feedback: sanitizeText(ov.feedback ?? "", 2000),
          updated_at: nowIso,
        };
        db.student_answers.push(ans);
      } else {
        ans.awarded_marks = clamped;
        ans.is_graded = true;
        ans.is_manual_override = true;
        if (ov.feedback !== undefined) {
          ans.teacher_feedback = sanitizeText(ov.feedback, 2000);
        }
        if (ov.tfChoiceMarks !== undefined) {
          ans.true_false_choice_marks = ov.tfChoiceMarks;
        }
        if (ov.tfJustificationMarks !== undefined) {
          ans.true_false_justification_marks = ov.tfJustificationMarks;
        }
        ans.updated_at = nowIso;
      }
    }
  }

  // 2. Apply Writing Rubric Grade
  if (params.writingGrade) {
    const totalWriting = sumWritingRubric(params.writingGrade.rubric);
    let writingSub = db.writing_submissions.find(
      (w) => w.attempt_id === attempt.id
    );
    if (!writingSub) {
      writingSub = {
        id: crypto.randomUUID(),
        attempt_id: attempt.id,
        topic: "No topic selected",
        essay_text: "",
        word_count: 0,
        char_count: 0,
        awarded_marks: totalWriting,
        rubric_breakdown: params.writingGrade.rubric,
        feedback: sanitizeText(params.writingGrade.feedback, 5000),
        grading_status: params.writingGrade.status,
        updated_at: nowIso,
      };
      db.writing_submissions.push(writingSub);
    } else {
      writingSub.rubric_breakdown = params.writingGrade.rubric;
      writingSub.awarded_marks = totalWriting;
      writingSub.feedback = sanitizeText(params.writingGrade.feedback, 5000);
      writingSub.grading_status = params.writingGrade.status;
      writingSub.updated_at = nowIso;
    }

    // Record in grading_records
    const existingRecord = db.grading_records.find(
      (g) => g.attempt_id === attempt.id && g.section === "Writing"
    );
    if (existingRecord) {
      existingRecord.awarded_marks = totalWriting;
      existingRecord.feedback = writingSub.feedback;
      existingRecord.updated_at = nowIso;
    } else {
      db.grading_records.push({
        id: crypto.randomUUID(),
        attempt_id: attempt.id,
        teacher_id: params.teacher.id,
        section: "Writing",
        criterion: "Rubric Evaluation (/25)",
        awarded_marks: totalWriting,
        feedback: writingSub.feedback,
        updated_at: nowIso,
      });
    }
  }

  // 3. Apply Bonus Question Grade (/2)
  if (params.bonusGrade) {
    const bonusQ = questions.find((q) => q.question_type === "bonus_words");
    const clampedBonus = Math.min(
      2,
      Math.max(0, Number(params.bonusGrade.awardedMarks) || 0)
    );
    if (bonusQ) {
      let bonusAns = db.student_answers.find(
        (a) => a.attempt_id === attempt.id && a.question_id === bonusQ.id
      );
      if (!bonusAns) {
        bonusAns = {
          id: crypto.randomUUID(),
          attempt_id: attempt.id,
          question_id: bonusQ.id,
          answer: { word1: "", meaning1: "", word2: "", meaning2: "" },
          awarded_marks: clampedBonus,
          auto_awarded_marks: 0,
          is_graded: true,
          is_manual_override: true,
          teacher_feedback: sanitizeText(params.bonusGrade.feedback, 2000),
          updated_at: nowIso,
        };
        db.student_answers.push(bonusAns);
      } else {
        bonusAns.awarded_marks = clampedBonus;
        bonusAns.is_graded = true;
        bonusAns.is_manual_override = true;
        bonusAns.teacher_feedback = sanitizeText(
          params.bonusGrade.feedback,
          2000
        );
        bonusAns.updated_at = nowIso;
      }
    }
  }

  // 4. Overall teacher feedback & visibility
  if (params.overallFeedback !== undefined) {
    attempt.teacher_overall_feedback = sanitizeText(
      params.overallFeedback,
      5000
    );
  }
  if (params.showTeacherFeedback !== undefined) {
    attempt.show_teacher_feedback = Boolean(params.showTeacherFeedback);
  }

  // 5. Recalculate totals
  const attemptAnswers = db.student_answers.filter(
    (a) => a.attempt_id === attempt.id
  );
  const writingSub = db.writing_submissions.find(
    (w) => w.attempt_id === attempt.id
  );

  const totals = calculateAttemptTotals({
    sections,
    questions,
    answers: attemptAnswers,
    writingSubmission: writingSub,
  });

  attempt.grammar_score = totals.grammar_score;
  attempt.reading_score = totals.reading_score;
  attempt.writing_score = totals.writing_score;
  attempt.score = totals.score;
  attempt.bonus_score = totals.bonus_score;
  attempt.final_total = totals.final_total;

  if (params.approveFinalGrade) {
    if (attempt.results_status !== "published") {
      attempt.results_status = "approved";
    }
  } else if (
    attempt.results_status === "not_graded" ||
    attempt.results_status === "grading_in_progress"
  ) {
    attempt.results_status = "awaiting_approval";
  }

  appendAuditLog(
    db,
    params.teacher,
    params.approveFinalGrade ? "GRADE_APPROVED" : "GRADE_DRAFT_SAVED",
    {
      attempt_id: attempt.id,
      student_id: attempt.student_id,
      regular_score: attempt.score,
      bonus_score: attempt.bonus_score,
      final_total: attempt.final_total,
      results_status: attempt.results_status,
    }
  );

  writeDb(db);
  return { attempt };
}

// ----------------------------------------------------------------------------
// Results Publication Controls (Publish Individual, Group, All, Schedule, Unpublish)
// ----------------------------------------------------------------------------
export function updateResultsPublication(params: {
  teacher: AuthenticatedUser;
  action: "publish" | "unpublish" | "schedule" | "approve";
  scope: "individual" | "group" | "all";
  examId?: string;
  attemptIds?: string[];
  groupName?: string;
  scheduledFor?: string;
  notes?: string;
}): { updatedCount: number; error?: string } {
  if (params.teacher.role !== "teacher") {
    return {
      updatedCount: 0,
      error: "Forbidden: Only authorized teachers can manage results publication.",
    };
  }

  const db = readDb();
  const nowIso = new Date().toISOString();

  let targetAttempts = db.exam_attempts.filter(
    (a) => a.status !== "in_progress"
  );

  if (params.examId) {
    targetAttempts = targetAttempts.filter((a) => a.exam_id === params.examId);
  }

  if (params.scope === "individual" && Array.isArray(params.attemptIds)) {
    const idSet = new Set(params.attemptIds);
    targetAttempts = targetAttempts.filter((a) => idSet.has(a.id));
  } else if (params.scope === "group" && params.groupName) {
    const groupStudentIds = new Set(
      db.students
        .filter((s) => s.group_name === params.groupName)
        .map((s) => s.id)
    );
    targetAttempts = targetAttempts.filter((a) =>
      groupStudentIds.has(a.student_id)
    );
  }

  if (targetAttempts.length === 0) {
    return {
      updatedCount: 0,
      error: "No matching submitted attempts found for the selected criteria.",
    };
  }

  // Requirement 12: "Only explicitly approved results may be published."
  if (params.action === "publish" || params.action === "schedule") {
    const unapproved = targetAttempts.filter(
      (a) =>
        a.results_status !== "approved" &&
        a.results_status !== "published" &&
        a.results_status !== "unpublished"
    );
    if (unapproved.length > 0 && params.scope === "individual") {
      return {
        updatedCount: 0,
        error:
          "Cannot publish unapproved grades. Please approve the final grade before publishing.",
      };
    }
    // For bulk/group operations, filter to approved/unpublished attempts
    targetAttempts = targetAttempts.filter(
      (a) =>
        a.results_status === "approved" ||
        a.results_status === "published" ||
        a.results_status === "unpublished"
    );
    if (targetAttempts.length === 0) {
      return {
        updatedCount: 0,
        error:
          "No approved submissions are ready for publication in the selected scope. Approve grades first.",
      };
    }
  }

  let updatedCount = 0;

  for (const attempt of targetAttempts) {
    if (params.action === "approve") {
      attempt.results_status = "approved";
      updatedCount++;
    } else if (params.action === "publish") {
      attempt.results_status = "published";
      attempt.results_published_at = nowIso;
      attempt.results_published_by = params.teacher.id;
      attempt.scheduled_publish_at = null;
      updatedCount++;

      db.results_publications.unshift({
        id: crypto.randomUUID(),
        exam_id: attempt.exam_id,
        student_id: attempt.student_id,
        attempt_id: attempt.id,
        published_by: params.teacher.id,
        published_at: nowIso,
        scheduled_for: null,
        publication_status: "published",
        notes: sanitizeText(
          params.notes || `Published (${params.scope})`,
          500
        ),
      });
    } else if (params.action === "unpublish") {
      attempt.results_status = "unpublished";
      attempt.results_published_at = null;
      attempt.scheduled_publish_at = null;
      updatedCount++;

      db.results_publications.unshift({
        id: crypto.randomUUID(),
        exam_id: attempt.exam_id,
        student_id: attempt.student_id,
        attempt_id: attempt.id,
        published_by: params.teacher.id,
        published_at: nowIso,
        scheduled_for: null,
        publication_status: "unpublished",
        notes: sanitizeText(
          params.notes || `Unpublished (${params.scope})`,
          500
        ),
      });
    } else if (params.action === "schedule" && params.scheduledFor) {
      attempt.scheduled_publish_at = new Date(
        params.scheduledFor
      ).toISOString();
      if (attempt.results_status !== "approved") {
        attempt.results_status = "approved";
      }
      updatedCount++;

      db.results_publications.unshift({
        id: crypto.randomUUID(),
        exam_id: attempt.exam_id,
        student_id: attempt.student_id,
        attempt_id: attempt.id,
        published_by: params.teacher.id,
        published_at: nowIso,
        scheduled_for: attempt.scheduled_publish_at,
        publication_status: "scheduled",
        notes: sanitizeText(
          params.notes ||
            `Scheduled for ${new Date(params.scheduledFor).toLocaleString()}`,
          500
        ),
      });
    }
  }

  appendAuditLog(
    db,
    params.teacher,
    `RESULTS_${params.action.toUpperCase()}`,
    {
      scope: params.scope,
      group_name: params.groupName ?? null,
      updated_count: updatedCount,
      scheduled_for: params.scheduledFor ?? null,
    }
  );

  writeDb(db);
  return { updatedCount };
}

// ----------------------------------------------------------------------------
// Examination Integrity & Anti-Cheating Operations
// ----------------------------------------------------------------------------

export function recordStudentIntegrityEvent(params: {
  student: AuthenticatedUser;
  attemptId: string;
  eventType: IntegrityEventType;
  clientTimestamp?: string | null;
  durationSeconds?: number | null;
  clientSessionId?: string | null;
  details?: string;
  metadata?: Record<string, unknown>;
}): {
  event?: IntegrityEventRecord;
  counters?: {
    tabSwitchesCount: number;
    totalHiddenSeconds: number;
    refreshCount: number;
    disconnectCount: number;
    sessionChangeCount: number;
  };
  error?: string;
} {
  if (params.student.role !== "student" || !params.student.student_id) {
    return { error: "Unauthorized: Student account required." };
  }

  const db = readDb();
  const attempt = db.exam_attempts.find((a) => a.id === params.attemptId);
  if (!attempt) {
    return { error: "Examination attempt not found." };
  }
  if (attempt.student_id !== params.student.student_id) {
    return {
      error: "Forbidden: You cannot log events for another student's attempt.",
    };
  }

  const nowIso = new Date().toISOString();
  const dur =
    typeof params.durationSeconds === "number" && params.durationSeconds >= 0
      ? Math.round(params.durationSeconds * 10) / 10
      : null;

  // Update attempt counters based on event type (never penalizes or fails the student)
  if (params.eventType === "tab_hidden") {
    attempt.tab_switches_count = (attempt.tab_switches_count || 0) + 1;
  } else if (params.eventType === "tab_visible" && dur !== null) {
    attempt.total_hidden_seconds = Math.round(
      ((attempt.total_hidden_seconds || 0) + dur) * 10
    ) / 10;
  } else if (params.eventType === "page_refresh") {
    attempt.refresh_count = (attempt.refresh_count || 0) + 1;
  } else if (params.eventType === "network_disconnect") {
    attempt.disconnect_count = (attempt.disconnect_count || 0) + 1;
  } else if (
    params.eventType === "session_change" ||
    params.eventType === "concurrent_session_warning"
  ) {
    attempt.session_change_count = (attempt.session_change_count || 0) + 1;
  } else if (params.eventType === "privacy_acknowledged") {
    attempt.privacy_notice_acknowledged_at = nowIso;
  }

  const defaultDetailsMap: Record<IntegrityEventType, string> = {
    tab_hidden: "Candidate navigated away from the examination tab (tab hidden).",
    tab_visible:
      dur !== null
        ? `Candidate returned to the examination tab after ${dur}s.`
        : "Candidate returned to the examination tab.",
    window_blur: "Examination browser window lost focus.",
    window_focus:
      dur !== null
        ? `Examination browser window regained focus after ${dur}s.`
        : "Examination browser window regained focus.",
    page_refresh: "Browser page refresh or reload detected during examination.",
    network_disconnect: "Internet connection interruption detected.",
    network_reconnect:
      dur !== null
        ? `Internet connection restored after ${dur}s.`
        : "Internet connection restored.",
    session_started: "Individual examination session started.",
    session_change: "Session context change detected.",
    concurrent_session_warning: "Concurrent session activity detected.",
    unusual_access_pattern: "Unusual access pattern logged for review.",
    privacy_acknowledged:
      "Candidate reviewed and acknowledged the Examination Privacy & Integrity Notice.",
  };

  const eventRecord: IntegrityEventRecord = {
    id: crypto.randomUUID(),
    attempt_id: attempt.id,
    exam_id: attempt.exam_id,
    student_id: attempt.student_id,
    event_type: params.eventType,
    occurred_at: nowIso,
    client_timestamp: params.clientTimestamp
      ? sanitizeText(params.clientTimestamp, 64)
      : nowIso,
    duration_seconds: dur,
    client_session_id: params.clientSessionId
      ? sanitizeText(params.clientSessionId, 120)
      : null,
    details: sanitizeText(
      params.details || defaultDetailsMap[params.eventType] || "Integrity event logged.",
      500
    ),
    metadata: params.metadata || {},
  };

  db.integrity_events = db.integrity_events || [];
  db.integrity_events.unshift(eventRecord);

  // If multiple tab switches occur, mark integrity_review_status as "under_review" for teacher inspection
  if (
    (attempt.tab_switches_count || 0) >= 3 &&
    (!attempt.integrity_review_status ||
      attempt.integrity_review_status === "clean")
  ) {
    attempt.integrity_review_status = "under_review";
  }

  writeDb(db);

  return {
    event: eventRecord,
    counters: {
      tabSwitchesCount: attempt.tab_switches_count || 0,
      totalHiddenSeconds: attempt.total_hidden_seconds || 0,
      refreshCount: attempt.refresh_count || 0,
      disconnectCount: attempt.disconnect_count || 0,
      sessionChangeCount: attempt.session_change_count || 0,
    },
  };
}

export function getTeacherIntegrityDashboard(params: {
  teacher: AuthenticatedUser;
  examId?: string;
}) {
  if (params.teacher.role !== "teacher") {
    return { error: "Forbidden: Teacher authorization required." };
  }

  const db = readDb();
  // Ensure originality & answer pattern comparisons are fresh
  runOriginalityAnalysis(db, params.examId);
  writeDb(db);

  const studentMap = new Map<
    string,
    { full_name: string; email: string; student_number: string; group_name: string }
  >();
  for (const s of db.students) {
    const p = db.profiles.find((prof) => prof.id === s.profile_id);
    studentMap.set(s.id, {
      full_name: p?.full_name || "Candidate",
      email: p?.email || "",
      student_number: s.student_number,
      group_name: s.group_name,
    });
  }

  const examMap = new Map<string, ExamRecord>();
  db.exams.forEach((e) => examMap.set(e.id, e));

  const filteredAttempts = params.examId
    ? db.exam_attempts.filter((a) => a.exam_id === params.examId)
    : db.exam_attempts;

  const allEvents = db.integrity_events || [];
  const allFlags = db.similarity_flags || [];

  const attemptSummaries = filteredAttempts.map((att) => {
    const stu = studentMap.get(att.student_id);
    const exam = examMap.get(att.exam_id);
    const events = allEvents
      .filter((ev) => ev.attempt_id === att.id)
      .sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      );
    const relatedFlags = allFlags.filter(
      (f) => f.attempt_a_id === att.id || f.attempt_b_id === att.id
    );
    const writing = db.writing_submissions.find((w) => w.attempt_id === att.id);

    return {
      attempt_id: att.id,
      exam_id: att.exam_id,
      exam_title: exam?.title || "B1 – FINAL ENGLISH EXAMINATION",
      student_id: att.student_id,
      student_name: stu?.full_name || "Candidate",
      student_username: stu?.email || "",
      student_number: stu?.student_number || "",
      group_name: stu?.group_name || "Group B1",
      variant_code: att.variant_code || "A",
      status: att.status,
      started_at: att.started_at,
      submitted_at: att.submitted_at,
      last_saved_at: att.last_saved_at,
      tab_switches_count: att.tab_switches_count || 0,
      total_hidden_seconds: att.total_hidden_seconds || 0,
      refresh_count: att.refresh_count || 0,
      disconnect_count: att.disconnect_count || 0,
      session_change_count: att.session_change_count || 0,
      teacher_integrity_notes: att.teacher_integrity_notes || "",
      integrity_review_status: att.integrity_review_status || "clean",
      oral_verification_status: att.oral_verification_status || "not_required",
      oral_verification_scheduled_at:
        att.oral_verification_scheduled_at || null,
      oral_verification_teacher_comments:
        att.oral_verification_teacher_comments || "",
      oral_verification_student_notice:
        att.oral_verification_student_notice || "",
      regular_score: att.score,
      bonus_score: att.bonus_score,
      final_total: att.final_total,
      results_status: att.results_status,
      essay_word_count: writing?.word_count || 0,
      essay_text: writing?.essay_text || "",
      essay_topic: writing?.topic || "",
      similarity_flags_count: relatedFlags.filter((f) => f.is_flagged).length,
      max_essay_similarity_pct: relatedFlags.reduce(
        (max, f) => Math.max(max, f.essay_similarity_pct),
        0
      ),
      max_pattern_similarity_pct: relatedFlags.reduce(
        (max, f) => Math.max(max, f.answer_pattern_similarity_pct),
        0
      ),
      events,
    };
  });

  const enrichedSimilarityFlags = allFlags
    .filter((f) => (!params.examId ? true : f.exam_id === params.examId))
    .map((f) => {
      const stuA = studentMap.get(f.student_a_id);
      const stuB = studentMap.get(f.student_b_id);
      const writingA = db.writing_submissions.find(
        (w) => w.attempt_id === f.attempt_a_id
      );
      const writingB = db.writing_submissions.find(
        (w) => w.attempt_id === f.attempt_b_id
      );
      return {
        ...f,
        student_a_name: stuA?.full_name || "Candidate A",
        student_a_number: stuA?.student_number || "",
        student_b_name: stuB?.full_name || "Candidate B",
        student_b_number: stuB?.student_number || "",
        essay_a_excerpt: (writingA?.essay_text || "").slice(0, 400),
        essay_b_excerpt: (writingB?.essay_text || "").slice(0, 400),
      };
    });

  return {
    attempts: attemptSummaries,
    similarityFlags: enrichedSimilarityFlags,
    allCandidates: db.students.map((s) => {
      const p = db.profiles.find((prof) => prof.id === s.profile_id);
      const latestAtt = db.exam_attempts.find((a) => a.student_id === s.id);
      return {
        student_id: s.id,
        full_name: p?.full_name || "Candidate",
        username: p?.email || "",
        student_number: s.student_number,
        group_name: s.group_name,
        has_attempt: Boolean(latestAtt),
        attempt_id: latestAtt?.id || null,
        attempt_status: latestAtt?.status || "not_started",
      };
    }),
  };
}

export function updateTeacherIntegrityReview(params: {
  teacher: AuthenticatedUser;
  attemptId?: string;
  integrityReviewStatus?: IntegrityReviewStatus;
  teacherIntegrityNotes?: string;
  eventId?: string;
  eventTeacherNote?: string;
  similarityFlagId?: string;
  similarityReviewStatus?: "pending_review" | "cleared" | "confirmed_concern";
  similarityTeacherNotes?: string;
  oralVerification?: {
    status: OralVerificationStatus;
    scheduledAt?: string | null;
    teacherComments?: string;
    studentNotice?: string;
  };
}): { success: boolean; error?: string } {
  if (params.teacher.role !== "teacher") {
    return {
      success: false,
      error: "Forbidden: Teacher authorization required.",
    };
  }

  const db = readDb();
  let mutated = false;

  if (params.attemptId) {
    const attempt = db.exam_attempts.find((a) => a.id === params.attemptId);
    if (!attempt) {
      return { success: false, error: "Examination attempt not found." };
    }

    if (params.integrityReviewStatus) {
      attempt.integrity_review_status = params.integrityReviewStatus;
      mutated = true;
    }
    if (params.teacherIntegrityNotes !== undefined) {
      attempt.teacher_integrity_notes = sanitizeText(
        params.teacherIntegrityNotes,
        4000
      );
      mutated = true;
    }
    if (params.oralVerification) {
      attempt.oral_verification_status = params.oralVerification.status;
      if (params.oralVerification.scheduledAt !== undefined) {
        attempt.oral_verification_scheduled_at =
          params.oralVerification.scheduledAt || null;
      }
      if (params.oralVerification.teacherComments !== undefined) {
        // Stored strictly separately from examination score!
        attempt.oral_verification_teacher_comments = sanitizeText(
          params.oralVerification.teacherComments,
          4000
        );
      }
      if (params.oralVerification.studentNotice !== undefined) {
        attempt.oral_verification_student_notice = sanitizeText(
          params.oralVerification.studentNotice,
          1000
        );
      }
      mutated = true;

      appendAuditLog(db, params.teacher, "ORAL_VERIFICATION_UPDATED", {
        attempt_id: attempt.id,
        student_id: attempt.student_id,
        oral_verification_status: attempt.oral_verification_status,
        scheduled_at: attempt.oral_verification_scheduled_at,
      });
    } else {
      appendAuditLog(db, params.teacher, "INTEGRITY_REVIEW_UPDATED", {
        attempt_id: attempt.id,
        integrity_review_status: attempt.integrity_review_status,
      });
    }
  }

  if (params.eventId && params.eventTeacherNote !== undefined) {
    const ev = (db.integrity_events || []).find((e) => e.id === params.eventId);
    if (ev) {
      ev.teacher_note = sanitizeText(params.eventTeacherNote, 1500);
      mutated = true;
    }
  }

  if (params.similarityFlagId) {
    const flag = (db.similarity_flags || []).find(
      (f) => f.id === params.similarityFlagId
    );
    if (flag) {
      if (params.similarityReviewStatus) {
        flag.review_status = params.similarityReviewStatus;
      }
      if (params.similarityTeacherNotes !== undefined) {
        flag.teacher_notes = sanitizeText(params.similarityTeacherNotes, 2000);
      }
      flag.updated_at = new Date().toISOString();
      mutated = true;
    }
  }

  if (mutated) {
    writeDb(db);
  }
  return { success: true };
}

