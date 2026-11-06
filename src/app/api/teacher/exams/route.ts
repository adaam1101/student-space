import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { appendAuditLog, readDb, writeDb } from "@/lib/db";
import { hashSecret, sanitizeText } from "@/lib/security";
import { CEFRLevel, ExamStatus, GradingMethod, QuestionType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const examId = req.nextUrl.searchParams.get("examId");
  const db = readDb();

  if (examId) {
    const exam = db.exams.find((e) => e.id === examId);
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }
    const sections = db.exam_sections
      .filter((s) => s.exam_id === exam.id)
      .sort((a, b) => a.section_order - b.section_order);
    const secIds = new Set(sections.map((s) => s.id));
    const questions = db.questions
      .filter((q) => secIds.has(q.section_id))
      .sort((a, b) => a.question_order - b.question_order);

    return NextResponse.json({ exam, sections, questions });
  }

  return NextResponse.json({
    exams: db.exams,
    sections: db.exam_sections,
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const action = String(body.action || "create");
    const db = readDb();
    const nowIso = new Date().toISOString();

    if (action === "create") {
      const title = sanitizeText(body.title, 200).trim();
      const level = (["A1", "A2", "B1", "B2", "C1"].includes(body.level)
        ? body.level
        : "B1") as CEFRLevel;
      const accessCode = sanitizeText(
        body.access_code || `${level}EXAM2026`,
        60
      ).trim();

      if (!title || !accessCode) {
        return NextResponse.json(
          { error: "Title and access code are required." },
          { status: 400 }
        );
      }

      const examId = crypto.randomUUID();
      const newExam = {
        id: examId,
        code:
          sanitizeText(body.code, 50).trim() ||
          `${level}-${Date.now().toString().slice(-4)}`,
        title,
        subtitle:
          sanitizeText(body.subtitle, 150).trim() ||
          `CEFR ${level} English Language Assessment`,
        description:
          sanitizeText(body.description, 2000).trim() ||
          `Comprehensive ${level} English Examination by Adam Ameyoud.`,
        level,
        duration_minutes: Math.max(
          15,
          Math.min(360, Number(body.duration_minutes) || 150)
        ),
        access_code_hash: hashSecret(accessCode),
        access_code_hint: accessCode,
        start_time:
          body.start_time || new Date(Date.now() - 3600_000).toISOString(),
        end_time:
          body.end_time ||
          new Date(Date.now() + 90 * 24 * 3600_000).toISOString(),
        max_attempts: Math.max(1, Number(body.max_attempts) || 1),
        status: (["draft", "active", "inactive", "archived"].includes(
          body.status
        )
          ? body.status
          : "active") as ExamStatus,
        total_marks: Number(body.total_marks) || 100,
        bonus_marks: Number(body.bonus_marks) ?? 2,
        reading_passage_title: sanitizeText(
          body.reading_passage_title || "",
          250
        ),
        reading_passage_text: sanitizeText(
          body.reading_passage_text || "",
          20000
        ),
        created_at: nowIso,
      };

      db.exams.push(newExam);

      // Create standard 4 sections for the new examination
      const defaultSections = [
        {
          id: crypto.randomUUID(),
          exam_id: examId,
          title: "Part One: Grammar",
          description: "Grammar accuracy and structures (50 marks)",
          section_order: 1,
          max_marks: 50,
        },
        {
          id: crypto.randomUUID(),
          exam_id: examId,
          title: "Part Two: Reading Comprehension",
          description: "Reading comprehension and interpretation (25 marks)",
          section_order: 2,
          max_marks: 25,
        },
        {
          id: crypto.randomUUID(),
          exam_id: examId,
          title: "Part Three: Writing",
          description: "Essay writing (25 marks)",
          section_order: 3,
          max_marks: 25,
        },
        {
          id: crypto.randomUUID(),
          exam_id: examId,
          title: "Bonus Question",
          description: "Words for the Teacher (2 marks)",
          section_order: 4,
          max_marks: 2,
        },
      ];
      db.exam_sections.push(...defaultSections);

      appendAuditLog(db, user, "EXAM_CREATED", {
        exam_id: examId,
        title: newExam.title,
        level: newExam.level,
      });
      writeDb(db);

      return NextResponse.json({ exam: newExam, sections: defaultSections });
    }

    if (action === "duplicate") {
      const sourceId = String(body.examId || "");
      const source = db.exams.find((e) => e.id === sourceId);
      if (!source) {
        return NextResponse.json(
          { error: "Source examination not found." },
          { status: 404 }
        );
      }

      const newExamId = crypto.randomUUID();
      const newCode = `${source.level}-COPY-${Date.now().toString().slice(-4)}`;
      const newAccessCode = `${source.access_code_hint || "EXAM"}2`;

      const clonedExam = {
        ...source,
        id: newExamId,
        code: newCode,
        title: `${source.title} (Copy)`,
        access_code_hash: hashSecret(newAccessCode),
        access_code_hint: newAccessCode,
        status: "draft" as ExamStatus,
        created_at: nowIso,
      };
      db.exams.push(clonedExam);

      const sourceSections = db.exam_sections.filter(
        (s) => s.exam_id === source.id
      );
      for (const sec of sourceSections) {
        const newSecId = crypto.randomUUID();
        db.exam_sections.push({
          ...sec,
          id: newSecId,
          exam_id: newExamId,
        });

        const secQuestions = db.questions.filter(
          (q) => q.section_id === sec.id
        );
        for (const q of secQuestions) {
          db.questions.push({
            ...q,
            id: crypto.randomUUID(),
            section_id: newSecId,
          });
        }
      }

      appendAuditLog(db, user, "EXAM_DUPLICATED", {
        source_exam_id: source.id,
        new_exam_id: newExamId,
      });
      writeDb(db);

      return NextResponse.json({ exam: clonedExam });
    }

    if (action === "update") {
      const examId = String(body.examId || "");
      const exam = db.exams.find((e) => e.id === examId);
      if (!exam) {
        return NextResponse.json(
          { error: "Examination not found." },
          { status: 404 }
        );
      }

      if (body.title !== undefined)
        exam.title = sanitizeText(body.title, 200).trim();
      if (body.subtitle !== undefined)
        exam.subtitle = sanitizeText(body.subtitle, 150).trim();
      if (body.description !== undefined)
        exam.description = sanitizeText(body.description, 2000).trim();
      if (
        body.level &&
        ["A1", "A2", "B1", "B2", "C1"].includes(String(body.level))
      ) {
        exam.level = body.level as CEFRLevel;
      }
      if (body.duration_minutes !== undefined) {
        exam.duration_minutes = Math.max(
          5,
          Math.min(360, Number(body.duration_minutes) || 150)
        );
      }
      if (body.max_attempts !== undefined) {
        exam.max_attempts = Math.max(1, Number(body.max_attempts) || 1);
      }
      if (
        body.status &&
        ["draft", "active", "inactive", "archived"].includes(String(body.status))
      ) {
        exam.status = body.status as ExamStatus;
      }
      if (body.start_time) exam.start_time = String(body.start_time);
      if (body.end_time) exam.end_time = String(body.end_time);
      if (body.reading_passage_title !== undefined) {
        exam.reading_passage_title = sanitizeText(
          body.reading_passage_title,
          250
        );
      }
      if (body.reading_passage_text !== undefined) {
        exam.reading_passage_text = sanitizeText(
          body.reading_passage_text,
          20000
        );
      }
      if (body.access_code && String(body.access_code).trim()) {
        const cleanCode = sanitizeText(body.access_code, 60).trim();
        exam.access_code_hash = hashSecret(cleanCode);
        exam.access_code_hint = cleanCode;
      }

      appendAuditLog(db, user, "EXAM_UPDATED", {
        exam_id: exam.id,
        status: exam.status,
      });
      writeDb(db);

      return NextResponse.json({ exam });
    }

    if (action === "add_question") {
      const sectionId = String(body.section_id || "");
      const sec = db.exam_sections.find((s) => s.id === sectionId);
      if (!sec) {
        return NextResponse.json(
          { error: "Section not found." },
          { status: 404 }
        );
      }
      const existingInSec = db.questions.filter(
        (q) => q.section_id === sectionId
      );
      const newQuestion = {
        id: crypto.randomUUID(),
        section_id: sectionId,
        exercise_title:
          sanitizeText(body.exercise_title, 200) || "Exercise",
        exercise_instructions: sanitizeText(
          body.exercise_instructions || "",
          500
        ),
        question_type: (body.question_type || "single_choice") as QuestionType,
        question_text: sanitizeText(body.question_text, 2000),
        prompt_keyword: body.prompt_keyword
          ? sanitizeText(body.prompt_keyword, 50)
          : null,
        options: Array.isArray(body.options) ? body.options : [],
        correct_answers: Array.isArray(body.correct_answers)
          ? body.correct_answers
          : [],
        accepted_answers: Array.isArray(body.accepted_answers)
          ? body.accepted_answers
          : [],
        marks: Math.max(0.5, Number(body.marks) || 1),
        question_order: existingInSec.length + 1,
        grading_method: (body.grading_method || "auto") as GradingMethod,
      };
      db.questions.push(newQuestion);
      writeDb(db);
      return NextResponse.json({ question: newQuestion });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err) {
    console.error("Teacher exam API error:", err);
    return NextResponse.json(
      { error: "Failed to process examination update." },
      { status: 500 }
    );
  }
}
