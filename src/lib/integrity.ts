// ============================================================================
// ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
// Examination Integrity, Question/Option Randomization & Originality Engine
// ============================================================================

import crypto from "crypto";
import {
  AnswerValue,
  DatabaseSchema,
  ExamAttemptRecord,
  ExamSectionRecord,
  ExamVariantCode,
  QuestionRecord,
  SimilarityFlagRecord,
  StudentAnswerRecord,
  StudentQuestionDTO,
} from "./types";
import { evaluateQuestionAnswer, normalizeEnglishAnswer } from "./grading";

// ----------------------------------------------------------------------------
// 1. Deterministic Seeded PRNG (Mulberry32) for Reproducible Exam Variants
// ----------------------------------------------------------------------------
function stringToSeed(seedStr: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRandom(seedStr: string): () => number {
  let a = stringToSeed(seedStr);
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seedStr: string): T[] {
  const arr = [...items];
  const rand = createSeededRandom(seedStr);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function assignExamVariant(seedStr: string): ExamVariantCode {
  const variants: ExamVariantCode[] = ["A", "B", "C", "D"];
  const idx = stringToSeed(`variant:${seedStr}`) % variants.length;
  return variants[idx];
}

/**
 * Determines whether questions within an exercise can have their order randomized
 * WITHOUT breaking sentence, narrative, or paragraph dependencies.
 *
 * - Exercise 2 ("Verb Tenses in Context") is a continuous 10-gap story (1)..(10):
 *   NEVER randomized so narrative dependencies remain intact.
 * - Reading Section B ("Comprehension Questions") follows the passage paragraph-by-paragraph:
 *   Kept in natural passage order.
 * - Independent standalone exercises (Exercise 1 MCQs, Exercise 3 Sentence Transformation,
 *   Exercise 4 Error Correction, Exercise 5 Fill in the Gaps, Reading Section A True/False,
 *   Reading Section C Vocabulary) CAN be safely randomized within their exercise block.
 */
export function isExerciseOrderRandomizable(question: QuestionRecord): boolean {
  if (typeof question.allow_question_randomization === "boolean") {
    return question.allow_question_randomization;
  }
  const ex = (question.exercise_title || "").toLowerCase();
  if (
    ex.includes("verb tenses in context") ||
    ex.includes("exercise 2") ||
    ex.includes("comprehension questions") ||
    question.question_type === "essay" ||
    question.question_type === "bonus_words"
  ) {
    return false;
  }
  // Check if question_text has narrative gap markers like "(1) ______"
  if (/\(\d+\)\s*_+/i.test(question.question_text)) {
    return false;
  }
  return true;
}

export function isOptionOrderRandomizable(question: QuestionRecord): boolean {
  if (typeof question.allow_option_randomization === "boolean") {
    return question.allow_option_randomization;
  }
  return (
    (question.question_type === "single_choice" ||
      question.question_type === "multiple_choice") &&
    Array.isArray(question.options) &&
    question.options.length > 1
  );
}

/**
 * Generates and persists the deterministic question order and MCQ option order
 * for a given student attempt. Marking keys remain bound to `question.id` on the server.
 */
export function ensureAttemptRandomization(
  attempt: ExamAttemptRecord,
  sections: ExamSectionRecord[],
  questions: QuestionRecord[]
): {
  variantCode: ExamVariantCode;
  questionOrderMap: Record<string, number>;
  optionOrderMap: Record<string, string[]>;
  mutated: boolean;
} {
  let mutated = false;
  if (!attempt.randomization_seed) {
    attempt.randomization_seed = `${attempt.student_id}:${attempt.exam_id}:attempt-${attempt.attempt_number}`;
    mutated = true;
  }
  if (!attempt.variant_code) {
    attempt.variant_code = assignExamVariant(attempt.randomization_seed);
    mutated = true;
  }

  if (
    !attempt.question_order_map ||
    Object.keys(attempt.question_order_map).length !== questions.length ||
    !attempt.option_order_map
  ) {
    const secOrderMap = new Map<string, number>();
    sections.forEach((s) => secOrderMap.set(s.id, s.section_order));

    // Sort canonically first by section_order then question_order
    const canonical = [...questions].sort((a, b) => {
      const sa = secOrderMap.get(a.section_id) ?? 1;
      const sb = secOrderMap.get(b.section_id) ?? 1;
      if (sa !== sb) return sa - sb;
      return a.question_order - b.question_order;
    });

    // Group contiguous questions by (section_id + exercise_title)
    const groups: {
      key: string;
      randomizable: boolean;
      items: QuestionRecord[];
    }[] = [];

    for (const q of canonical) {
      const key = `${q.section_id}::${q.exercise_title}`;
      const randomizable = isExerciseOrderRandomizable(q);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.key === key) {
        lastGroup.items.push(q);
      } else {
        groups.push({
          key,
          randomizable,
          items: [q],
        });
      }
    }

    const questionOrderMap: Record<string, number> = {};
    const optionOrderMap: Record<string, string[]> = {};
    let displayOrderCounter = 1;

    for (const grp of groups) {
      const orderedItems =
        grp.randomizable && grp.items.length > 1
          ? seededShuffle(
              grp.items,
              `${attempt.randomization_seed}::exercise::${grp.key}`
            )
          : grp.items;

      for (const q of orderedItems) {
        questionOrderMap[q.id] = displayOrderCounter++;
        if (isOptionOrderRandomizable(q)) {
          optionOrderMap[q.id] = seededShuffle(
            q.options,
            `${attempt.randomization_seed}::options::${q.id}`
          );
        } else {
          optionOrderMap[q.id] = [...(q.options || [])];
        }
      }
    }

    attempt.question_order_map = questionOrderMap;
    attempt.option_order_map = optionOrderMap;
    mutated = true;
  }

  return {
    variantCode: attempt.variant_code,
    questionOrderMap: attempt.question_order_map!,
    optionOrderMap: attempt.option_order_map!,
    mutated,
  };
}

/**
 * Builds the student-safe, variant-randomized list of questions for an active attempt.
 * - Never includes `correct_answers` or `accepted_answers`.
 * - Applies the attempt's randomized question order within compatible exercises.
 * - Applies the attempt's randomized MCQ option order.
 */
export function buildRandomizedStudentQuestions(
  attempt: ExamAttemptRecord,
  sections: ExamSectionRecord[],
  questions: QuestionRecord[]
): StudentQuestionDTO[] {
  const { questionOrderMap, optionOrderMap } = ensureAttemptRandomization(
    attempt,
    sections,
    questions
  );

  const sanitized: StudentQuestionDTO[] = questions.map((q) => {
    const assignedOrder = questionOrderMap[q.id] ?? q.question_order;
    const assignedOptions = optionOrderMap[q.id] ?? q.options;

    return {
      id: q.id,
      section_id: q.section_id,
      exercise_title: q.exercise_title,
      exercise_instructions: q.exercise_instructions,
      question_type: q.question_type,
      question_text: q.question_text,
      prompt_keyword: q.prompt_keyword ?? null,
      options: assignedOptions,
      marks: q.marks,
      question_order: assignedOrder,
    };
  });

  return sanitized.sort((a, b) => a.question_order - b.question_order);
}

// ----------------------------------------------------------------------------
// 2. Answer Originality & Cross-Candidate Similarity Engine
// ----------------------------------------------------------------------------

function extractWords(text: string): string[] {
  const norm = normalizeEnglishAnswer(text);
  if (!norm) return [];
  return norm.split(/\s+/).filter((w) => w.length > 0);
}

function buildShingles(words: string[], k = 3): Set<string> {
  const set = new Set<string>();
  if (words.length < k) {
    if (words.length > 0) set.add(words.join(" "));
    return set;
  }
  for (let i = 0; i <= words.length - k; i++) {
    set.add(words.slice(i, i + k).join(" "));
  }
  return set;
}

function computeCosineWordSimilarity(wordsA: string[], wordsB: string[]): number {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();
  for (const w of wordsA) {
    if (w.length <= 2) continue; // Skip trivial stop tokens
    freqA.set(w, (freqA.get(w) ?? 0) + 1);
  }
  for (const w of wordsB) {
    if (w.length <= 2) continue;
    freqB.set(w, (freqB.get(w) ?? 0) + 1);
  }
  if (freqA.size === 0 || freqB.size === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [w, countA] of freqA.entries()) {
    normA += countA * countA;
    const countB = freqB.get(w) ?? 0;
    dot += countA * countB;
  }
  for (const countB of freqB.values()) {
    normB += countB * countB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeEssaySimilarity(
  essayA: string,
  essayB: string
): {
  similarityPct: number;
  sharedPhrases: string[];
} {
  const wordsA = extractWords(essayA);
  const wordsB = extractWords(essayB);
  if (wordsA.length < 8 || wordsB.length < 8) {
    return { similarityPct: 0, sharedPhrases: [] };
  }

  const shingles3A = buildShingles(wordsA, 3);
  const shingles3B = buildShingles(wordsB, 3);

  let intersection = 0;
  for (const s of shingles3A) {
    if (shingles3B.has(s)) intersection++;
  }
  const union = shingles3A.size + shingles3B.size - intersection;
  const jaccard3 = union > 0 ? intersection / union : 0;

  const cosine = computeCosineWordSimilarity(wordsA, wordsB);

  // Find shared 5-word phrases for concrete evidence
  const shingles5A = buildShingles(wordsA, 5);
  const shingles5B = buildShingles(wordsB, 5);
  const sharedPhrases: string[] = [];
  for (const phrase of shingles5A) {
    if (shingles5B.has(phrase) && sharedPhrases.length < 5) {
      sharedPhrases.push(`"${phrase}"`);
    }
  }

  // Weighted blend: 65% 3-gram phrase overlap + 35% vocabulary cosine similarity
  const combined = jaccard3 * 0.65 + cosine * 0.35;
  const similarityPct = Math.min(100, Math.round(combined * 100));

  return { similarityPct, sharedPhrases };
}

function serializeAnswerForComparison(val: AnswerValue | undefined): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return normalizeEnglishAnswer(val);
  if (Array.isArray(val)) {
    return val
      .map((v) => normalizeEnglishAnswer(String(v)))
      .sort()
      .join("|");
  }
  if (typeof val === "object") {
    if ("choice" in val) {
      return `${normalizeEnglishAnswer(val.choice || "")}::${normalizeEnglishAnswer(
        val.justification || ""
      )}`;
    }
    if ("word1" in val) {
      return [
        normalizeEnglishAnswer(val.word1 || ""),
        normalizeEnglishAnswer(val.meaning1 || ""),
        normalizeEnglishAnswer(val.word2 || ""),
        normalizeEnglishAnswer(val.meaning2 || ""),
      ].join("::");
    }
  }
  return "";
}

export function computeAnswerPatternSimilarity(params: {
  answersA: StudentAnswerRecord[];
  answersB: StudentAnswerRecord[];
  questions: QuestionRecord[];
}): {
  similarityPct: number;
  identicalAnswersCount: number;
  identicalWrongAnswersCount: number;
  totalComparedQuestions: number;
  sharedDetails: string[];
} {
  const mapA = new Map<string, StudentAnswerRecord>();
  const mapB = new Map<string, StudentAnswerRecord>();
  params.answersA.forEach((a) => mapA.set(a.question_id, a));
  params.answersB.forEach((b) => mapB.set(b.question_id, b));

  let totalCompared = 0;
  let identicalCount = 0;
  let identicalWrongCount = 0;
  const sharedDetails: string[] = [];

  for (const q of params.questions) {
    if (q.question_type === "essay") continue;
    const recA = mapA.get(q.id);
    const recB = mapB.get(q.id);
    const strA = serializeAnswerForComparison(recA?.answer);
    const strB = serializeAnswerForComparison(recB?.answer);

    if (!strA || !strB) continue;
    totalCompared++;

    if (strA === strB) {
      identicalCount++;
      const evalA = evaluateQuestionAnswer(q, recA?.answer);
      const isWrong = evalA.awardedMarks === 0;
      if (isWrong) {
        identicalWrongCount++;
        if (sharedDetails.length < 6) {
          sharedDetails.push(
            `Identical incorrect response on ${q.exercise_title.split(":")[0]} (Q#${q.question_order}): "${strA.slice(0, 80)}"`
          );
        }
      } else if (
        (q.question_type === "sentence_transformation" ||
          q.question_type === "reading_comprehension" ||
          q.question_type === "true_false") &&
        strA.length > 25 &&
        sharedDetails.length < 6
      ) {
        sharedDetails.push(
          `Identical written phrasing on ${q.exercise_title.split(":")[0]} (Q#${q.question_order}): "${strA.slice(0, 80)}"`
        );
      }
    }
  }

  const similarityPct =
    totalCompared > 0 ? Math.round((identicalCount / totalCompared) * 100) : 0;

  return {
    similarityPct,
    identicalAnswersCount: identicalCount,
    identicalWrongAnswersCount: identicalWrongCount,
    totalComparedQuestions: totalCompared,
    sharedDetails,
  };
}

/**
 * Evaluates all pairs of candidate attempts for an examination and updates
 * `db.similarity_flags` without ever modifying candidate scores.
 */
export function runOriginalityAnalysis(
  db: DatabaseSchema,
  examId?: string
): SimilarityFlagRecord[] {
  if (!Array.isArray(db.similarity_flags)) {
    db.similarity_flags = [];
  }

  const targetExams = examId
    ? db.exams.filter((e) => e.id === examId)
    : db.exams;

  const nowIso = new Date().toISOString();

  for (const exam of targetExams) {
    const attempts = db.exam_attempts.filter((a) => a.exam_id === exam.id);
    if (attempts.length < 2) continue;

    const sectionIds = new Set(
      db.exam_sections.filter((s) => s.exam_id === exam.id).map((s) => s.id)
    );
    const questions = db.questions.filter((q) => sectionIds.has(q.section_id));

    for (let i = 0; i < attempts.length; i++) {
      for (let j = i + 1; j < attempts.length; j++) {
        const attA = attempts[i];
        const attB = attempts[j];
        if (attA.student_id === attB.student_id) continue;

        const writingA = db.writing_submissions.find(
          (w) => w.attempt_id === attA.id
        );
        const writingB = db.writing_submissions.find(
          (w) => w.attempt_id === attB.id
        );

        const essayComp = computeEssaySimilarity(
          writingA?.essay_text || "",
          writingB?.essay_text || ""
        );

        const answersA = db.student_answers.filter(
          (a) => a.attempt_id === attA.id
        );
        const answersB = db.student_answers.filter(
          (a) => a.attempt_id === attB.id
        );

        const patternComp = computeAnswerPatternSimilarity({
          answersA,
          answersB,
          questions,
        });

        const reasons: string[] = [];
        if (essayComp.similarityPct >= 40) {
          reasons.push(`High essay text similarity (${essayComp.similarityPct}%)`);
        }
        if (patternComp.identicalWrongAnswersCount >= 3) {
          reasons.push(
            `${patternComp.identicalWrongAnswersCount} identical incorrect answers`
          );
        }
        if (
          patternComp.totalComparedQuestions >= 10 &&
          patternComp.similarityPct >= 85
        ) {
          reasons.push(
            `High overall answer pattern overlap (${patternComp.similarityPct}%)`
          );
        }

        const isFlagged = reasons.length > 0;
        const flaggedReason =
          reasons.length > 0
            ? reasons.join(" • ")
            : "Routine originality comparison — within normal independent range";

        const combinedDetails = [
          ...essayComp.sharedPhrases.map(
            (p) => `Shared essay phrase: ${p}`
          ),
          ...patternComp.sharedDetails,
        ];

        const existingFlag = db.similarity_flags.find(
          (f) =>
            f.exam_id === exam.id &&
            ((f.attempt_a_id === attA.id && f.attempt_b_id === attB.id) ||
              (f.attempt_a_id === attB.id && f.attempt_b_id === attA.id))
        );

        if (existingFlag) {
          existingFlag.essay_similarity_pct = essayComp.similarityPct;
          existingFlag.answer_pattern_similarity_pct =
            patternComp.similarityPct;
          existingFlag.identical_answers_count =
            patternComp.identicalAnswersCount;
          existingFlag.identical_wrong_answers_count =
            patternComp.identicalWrongAnswersCount;
          existingFlag.total_compared_questions =
            patternComp.totalComparedQuestions;
          existingFlag.is_flagged = isFlagged;
          existingFlag.flagged_reason = flaggedReason;
          existingFlag.shared_details = combinedDetails;
          existingFlag.updated_at = nowIso;
        } else {
          db.similarity_flags.push({
            id: crypto.randomUUID(),
            exam_id: exam.id,
            attempt_a_id: attA.id,
            attempt_b_id: attB.id,
            student_a_id: attA.student_id,
            student_b_id: attB.student_id,
            essay_similarity_pct: essayComp.similarityPct,
            answer_pattern_similarity_pct: patternComp.similarityPct,
            identical_answers_count: patternComp.identicalAnswersCount,
            identical_wrong_answers_count:
              patternComp.identicalWrongAnswersCount,
            total_compared_questions: patternComp.totalComparedQuestions,
            is_flagged: isFlagged,
            flagged_reason: flaggedReason,
            shared_details: combinedDetails,
            review_status: "pending_review",
            teacher_notes: "",
            updated_at: nowIso,
          });
        }
      }
    }
  }

  return db.similarity_flags;
}
