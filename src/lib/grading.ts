// ============================================================================
// ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
// Automatic & Hybrid Grading Engine + Rubric Calculation
// ============================================================================

import {
  AnswerValue,
  BonusWordsAnswerValue,
  ExamSectionRecord,
  QuestionRecord,
  StudentAnswerRecord,
  TrueFalseAnswerValue,
  WritingRubricBreakdown,
  WritingSubmissionRecord,
} from "./types";

/**
 * Normalizes a sentence or short text for grammatical comparison:
 * - Lowercases
 * - Expands common English contractions so both contracted and full forms match
 * - Normalizes British/American spelling variants (organise/organize, judgement/judgment, centre/center)
 * - Strips trailing/extra punctuation and collapses whitespace
 */
export function normalizeEnglishAnswer(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/['’`]/g, "'")
    .replace(/\bhadn't\b/g, "had not")
    .replace(/\bhaven't\b/g, "have not")
    .replace(/\bhasn't\b/g, "has not")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bwouldn't\b/g, "would not")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bcannot\b/g, "can not")
    .replace(/\bmustn't\b/g, "must not")
    .replace(/\bshouldn't\b/g, "should not")
    .replace(/\bdidn't\b/g, "did not")
    .replace(/\bdoesn't\b/g, "does not")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bi'm\b/g, "i am")
    .replace(/\borganising\b/g, "organizing")
    .replace(/\borganise\b/g, "organize")
    .replace(/\bjudgement\b/g, "judgment")
    .replace(/\bcentre\b/g, "center")
    .replace(/\bpractising\b/g, "practicing")
    .replace(/[.,!?;:"“”()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface AutoGradeOutput {
  awardedMarks: number;
  isGraded: boolean;
  tfChoiceMarks?: number;
  tfJustificationMarks?: number;
}

/**
 * Automatically evaluates a student's answer against a question's configured
 * correct_answers and accepted_answers.
 * Note: Preliminary grades are stored on the server for teacher review and
 * NEVER exposed to the student until explicit publication.
 */
export function evaluateQuestionAnswer(
  question: QuestionRecord,
  answer: AnswerValue | undefined | null
): AutoGradeOutput {
  if (answer === undefined || answer === null || answer === "") {
    return {
      awardedMarks: 0,
      isGraded: question.grading_method === "auto",
    };
  }

  const maxMarks = Number(question.marks) || 1;
  const allAccepted = [
    ...(question.correct_answers || []),
    ...(question.accepted_answers || []),
  ];

  switch (question.question_type) {
    case "single_choice": {
      const strAns = typeof answer === "string" ? answer.trim() : "";
      if (!strAns) return { awardedMarks: 0, isGraded: true };
      const normAns = normalizeEnglishAnswer(strAns);
      const matched = allAccepted.some(
        (acc) =>
          acc.toLowerCase().trim() === strAns.toLowerCase() ||
          normalizeEnglishAnswer(acc) === normAns
      );
      return {
        awardedMarks: matched ? maxMarks : 0,
        isGraded: true,
      };
    }

    case "multiple_choice": {
      const selected = Array.isArray(answer)
        ? answer.map((s) => normalizeEnglishAnswer(String(s)))
        : typeof answer === "string" && answer
        ? [normalizeEnglishAnswer(answer)]
        : [];
      if (selected.length === 0) return { awardedMarks: 0, isGraded: true };
      const target = (question.correct_answers || []).map((c) =>
        normalizeEnglishAnswer(c)
      );
      const exactMatch =
        selected.length === target.length &&
        selected.every((s) => target.includes(s));
      return {
        awardedMarks: exactMatch ? maxMarks : 0,
        isGraded: true,
      };
    }

    case "fill_in_the_gap":
    case "short_text": {
      const strAns = typeof answer === "string" ? answer.trim() : "";
      if (!strAns) return { awardedMarks: 0, isGraded: true };
      const normAns = normalizeEnglishAnswer(strAns);
      const matched = allAccepted.some(
        (acc) => normalizeEnglishAnswer(acc) === normAns
      );
      return {
        awardedMarks: matched ? maxMarks : 0,
        isGraded: true,
      };
    }

    case "sentence_transformation": {
      const strAns = typeof answer === "string" ? answer.trim() : "";
      if (!strAns) return { awardedMarks: 0, isGraded: false };
      const normAns = normalizeEnglishAnswer(strAns);

      // Must contain the required keyword if one is specified
      if (question.prompt_keyword) {
        const kw = question.prompt_keyword.toLowerCase().trim();
        if (!strAns.toLowerCase().includes(kw)) {
          return { awardedMarks: 0, isGraded: false };
        }
      }

      const exactMatch = allAccepted.some(
        (acc) => normalizeEnglishAnswer(acc) === normAns
      );
      return {
        awardedMarks: exactMatch ? maxMarks : 0,
        // Hybrid: auto-scored, flagged for teacher confirmation/override
        isGraded: exactMatch,
      };
    }

    case "error_correction": {
      const strAns = typeof answer === "string" ? answer.trim() : "";
      if (!strAns) return { awardedMarks: 0, isGraded: false };
      const normAns = normalizeEnglishAnswer(strAns);
      const exactMatch = allAccepted.some(
        (acc) => normalizeEnglishAnswer(acc) === normAns
      );
      return {
        awardedMarks: exactMatch ? maxMarks : 0,
        isGraded: exactMatch,
      };
    }

    case "true_false": {
      let choice = "";
      let justification = "";

      if (typeof answer === "object" && !Array.isArray(answer) && "choice" in answer) {
        const tf = answer as TrueFalseAnswerValue;
        choice = (tf.choice || "").trim();
        justification = (tf.justification || "").trim();
      } else if (typeof answer === "string") {
        choice = answer.trim();
      }

      const correctChoice = (question.correct_answers?.[0] || "").trim();
      const choiceCorrect =
        choice.toLowerCase() === correctChoice.toLowerCase();
      const choiceMarks = choiceCorrect ? 1 : 0;

      // Evaluate justification against accepted key phrases (1 mark)
      const normJust = normalizeEnglishAnswer(justification);
      const justificationKeywords = (question.accepted_answers || []).filter(
        (a) => a.toLowerCase() !== "true" && a.toLowerCase() !== "false"
      );
      const justMatched =
        normJust.length >= 8 &&
        justificationKeywords.some((kw) =>
          normJust.includes(normalizeEnglishAnswer(kw))
        );
      const justificationMarks = choiceCorrect && justMatched ? 1 : 0;

      return {
        awardedMarks: Math.min(maxMarks, choiceMarks + justificationMarks),
        tfChoiceMarks: choiceMarks,
        tfJustificationMarks: justificationMarks,
        isGraded: false, // Hybrid: teacher can adjust justification marks separately
      };
    }

    case "reading_comprehension": {
      const strAns = typeof answer === "string" ? answer.trim() : "";
      if (!strAns || strAns.length < 4) {
        return { awardedMarks: 0, isGraded: false };
      }
      const normAns = normalizeEnglishAnswer(strAns);
      // Count how many accepted key concepts appear in the student's answer
      const matchedConcepts = (question.accepted_answers || []).filter((kw) =>
        normAns.includes(normalizeEnglishAnswer(kw))
      );

      let autoMarks = 0;
      if (matchedConcepts.length >= 2) {
        autoMarks = maxMarks;
      } else if (matchedConcepts.length === 1) {
        autoMarks = maxMarks >= 2 ? 1 : maxMarks;
      }

      return {
        awardedMarks: autoMarks,
        isGraded: false, // Teacher reviews reading comprehension answers
      };
    }

    case "essay":
    case "bonus_words": {
      // Strictly manual grading by the teacher
      return {
        awardedMarks: 0,
        isGraded: false,
      };
    }

    default:
      return { awardedMarks: 0, isGraded: false };
  }
}

/**
 * Counts words in an essay accurately
 */
export function countWords(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const cleaned = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").filter(Boolean).length;
}

/**
 * Calculates total marks across Grammar (/50), Reading (/25), Writing (/25),
 * Regular Total (/100), Bonus (/2), and Final Total (/102).
 * Keeps bonus points separate from regular percentage.
 */
export function calculateAttemptTotals(params: {
  sections: ExamSectionRecord[];
  questions: QuestionRecord[];
  answers: StudentAnswerRecord[];
  writingSubmission?: WritingSubmissionRecord | null;
}) {
  const { sections, questions, answers, writingSubmission } = params;

  const sectionOrderMap = new Map<string, number>();
  sections.forEach((sec) => sectionOrderMap.set(sec.id, sec.section_order));

  const answerMap = new Map<string, StudentAnswerRecord>();
  answers.forEach((a) => answerMap.set(a.question_id, a));

  let grammarScore = 0;
  let readingScore = 0;
  let writingScore = 0;
  let bonusScore = 0;

  for (const q of questions) {
    const secOrder = sectionOrderMap.get(q.section_id) ?? 1;
    const ans = answerMap.get(q.id);
    const marks =
      ans && ans.awarded_marks !== null && ans.awarded_marks !== undefined
        ? Number(ans.awarded_marks)
        : 0;

    if (secOrder === 1) {
      grammarScore += marks;
    } else if (secOrder === 2) {
      readingScore += marks;
    } else if (secOrder === 3 || q.question_type === "essay") {
      writingScore += marks;
    } else if (secOrder === 4 || q.question_type === "bonus_words") {
      bonusScore += marks;
    }
  }

  // If writingSubmission has awarded_marks, prefer that for writingScore
  if (
    writingSubmission &&
    writingSubmission.awarded_marks !== null &&
    writingSubmission.awarded_marks !== undefined
  ) {
    writingScore = Number(writingSubmission.awarded_marks);
  }

  grammarScore = Math.min(50, Math.max(0, Number(grammarScore.toFixed(2))));
  readingScore = Math.min(25, Math.max(0, Number(readingScore.toFixed(2))));
  writingScore = Math.min(25, Math.max(0, Number(writingScore.toFixed(2))));
  bonusScore = Math.min(2, Math.max(0, Number(bonusScore.toFixed(2))));

  const regularTotal = Number(
    (grammarScore + readingScore + writingScore).toFixed(2)
  );
  const finalTotal = Number((regularTotal + bonusScore).toFixed(2));

  return {
    grammar_score: grammarScore,
    reading_score: readingScore,
    writing_score: writingScore,
    score: regularTotal, // /100
    bonus_score: bonusScore, // /2
    final_total: finalTotal, // /102
    regular_percentage: regularTotal, // /100% (bonus kept separate)
  };
}

export function sumWritingRubric(rubric: WritingRubricBreakdown): number {
  const g = Math.min(8, Math.max(0, Number(rubric.grammar_accuracy) || 0));
  const v = Math.min(5, Math.max(0, Number(rubric.vocabulary) || 0));
  const o = Math.min(5, Math.max(0, Number(rubric.organisation) || 0));
  const t = Math.min(5, Math.max(0, Number(rubric.task_achievement) || 0));
  const m = Math.min(2, Math.max(0, Number(rubric.mechanics) || 0));
  return Number((g + v + o + t + m).toFixed(2));
}

export function isBonusAnswerPopulated(val: AnswerValue | undefined): boolean {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const b = val as BonusWordsAnswerValue;
  return Boolean(
    (b.word1 && b.word1.trim()) ||
      (b.meaning1 && b.meaning1.trim()) ||
      (b.word2 && b.word2.trim()) ||
      (b.meaning2 && b.meaning2.trim())
  );
}
