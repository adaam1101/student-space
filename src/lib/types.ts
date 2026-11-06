// ============================================================================
// ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
// Core Domain & Database Types (including Examination Integrity Module)
// ============================================================================

export type UserRole = "teacher" | "student";

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";

export type ExamStatus = "draft" | "active" | "inactive" | "archived";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "short_text"
  | "sentence_transformation"
  | "error_correction"
  | "fill_in_the_gap"
  | "true_false"
  | "reading_comprehension"
  | "essay"
  | "bonus_words";

export type GradingMethod = "auto" | "hybrid" | "manual";

export type AttemptStatus =
  | "in_progress"
  | "submitted"
  | "auto_submitted"
  | "locked";

export type ResultsStatus =
  | "not_graded"
  | "grading_in_progress"
  | "awaiting_approval"
  | "approved"
  | "published"
  | "unpublished";

export type ExamVariantCode = "A" | "B" | "C" | "D";

export type IntegrityEventType =
  | "tab_hidden"
  | "tab_visible"
  | "window_blur"
  | "window_focus"
  | "page_refresh"
  | "network_disconnect"
  | "network_reconnect"
  | "session_started"
  | "session_change"
  | "concurrent_session_warning"
  | "unusual_access_pattern"
  | "privacy_acknowledged";

export type IntegrityReviewStatus =
  | "clean"
  | "under_review"
  | "reviewed_cleared"
  | "reviewed_flagged";

export type OralVerificationStatus =
  | "not_required"
  | "selected"
  | "scheduled"
  | "completed_verified"
  | "completed_concern";

export interface ProfileRecord {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface StudentRecord {
  id: string;
  profile_id: string;
  student_number: string;
  group_name: string;
  is_active: boolean;
  created_at: string;
}

export interface ExamRecord {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  level: CEFRLevel;
  duration_minutes: number;
  access_code_hash: string;
  access_code_hint: string; // Strictly stripped on student-facing responses
  start_time: string;
  end_time: string;
  max_attempts: number;
  status: ExamStatus;
  total_marks: number;
  bonus_marks: number;
  reading_passage_title?: string;
  reading_passage_text?: string;
  created_at: string;
}

export interface ExamSectionRecord {
  id: string;
  exam_id: string;
  title: string;
  description: string;
  section_order: number;
  max_marks: number;
}

export interface QuestionRecord {
  id: string;
  section_id: string;
  exercise_title: string;
  exercise_instructions: string;
  question_type: QuestionType;
  question_text: string;
  prompt_keyword?: string | null;
  options: string[];
  correct_answers: string[]; // NEVER sent to student APIs
  accepted_answers: string[]; // NEVER sent to student APIs
  marks: number;
  question_order: number;
  grading_method: GradingMethod;
  allow_question_randomization?: boolean; // True for independent items, false for narrative/contextual sequences
  allow_option_randomization?: boolean; // True for MCQs, false where option order is fixed
}

// Sanitized Question DTO for Student Exam Delivery (never includes correct_answers or accepted_answers)
export interface StudentQuestionDTO {
  id: string;
  section_id: string;
  exercise_title: string;
  exercise_instructions: string;
  question_type: QuestionType;
  question_text: string;
  prompt_keyword?: string | null;
  options: string[];
  marks: number;
  question_order: number;
}

export interface TrueFalseAnswerValue {
  choice: "True" | "False" | "";
  justification: string;
}

export interface BonusWordsAnswerValue {
  word1: string;
  meaning1: string;
  word2: string;
  meaning2: string;
}

export type AnswerValue =
  | string
  | string[]
  | TrueFalseAnswerValue
  | BonusWordsAnswerValue;

export interface ExamAttemptRecord {
  id: string;
  exam_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  status: AttemptStatus;
  grammar_score: number;
  reading_score: number;
  writing_score: number;
  score: number; // Regular total out of 100
  bonus_score: number; // Out of 2
  final_total: number; // Out of 102
  results_status: ResultsStatus;
  results_published_at: string | null;
  results_published_by: string | null;
  scheduled_publish_at: string | null;
  teacher_overall_feedback: string;
  show_teacher_feedback: boolean;
  last_saved_at: string;

  // --- Examination Integrity, Randomization & Verification Fields ---
  variant_code?: ExamVariantCode;
  randomization_seed?: string;
  question_order_map?: Record<string, number>;
  option_order_map?: Record<string, string[]>;
  active_client_session_id?: string | null;
  active_user_agent?: string | null;
  tab_switches_count?: number;
  total_hidden_seconds?: number;
  refresh_count?: number;
  disconnect_count?: number;
  session_change_count?: number;
  teacher_integrity_notes?: string; // Strictly private to teacher
  integrity_review_status?: IntegrityReviewStatus;
  oral_verification_status?: OralVerificationStatus;
  oral_verification_scheduled_at?: string | null;
  oral_verification_teacher_comments?: string; // Strictly separate from exam score & private to teacher
  oral_verification_student_notice?: string; // Optional notice visible to student when selected/scheduled
  privacy_notice_acknowledged_at?: string | null;
}

export interface IntegrityEventRecord {
  id: string;
  attempt_id: string;
  exam_id: string;
  student_id: string;
  event_type: IntegrityEventType;
  occurred_at: string; // Server-authoritative timestamp
  client_timestamp?: string | null;
  duration_seconds?: number | null;
  client_session_id?: string | null;
  details: string;
  metadata: Record<string, unknown>;
  teacher_note?: string; // Private teacher annotation on a specific event
}

export interface SimilarityFlagRecord {
  id: string;
  exam_id: string;
  attempt_a_id: string;
  attempt_b_id: string;
  student_a_id: string;
  student_b_id: string;
  essay_similarity_pct: number;
  answer_pattern_similarity_pct: number;
  identical_answers_count: number;
  identical_wrong_answers_count: number;
  total_compared_questions: number;
  is_flagged: boolean;
  flagged_reason: string;
  shared_details: string[];
  review_status: "pending_review" | "cleared" | "confirmed_concern";
  teacher_notes: string;
  updated_at: string;
}

export interface StudentAnswerRecord {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: AnswerValue;
  awarded_marks: number | null;
  auto_awarded_marks: number | null;
  true_false_choice_marks?: number | null;
  true_false_justification_marks?: number | null;
  is_graded: boolean;
  is_manual_override: boolean;
  teacher_feedback: string;
  updated_at: string;
}

export interface WritingRubricBreakdown {
  grammar_accuracy: number; // /8
  vocabulary: number; // /5
  organisation: number; // /5
  task_achievement: number; // /5
  mechanics: number; // /2
}

export interface WritingSubmissionRecord {
  id: string;
  attempt_id: string;
  topic: string;
  essay_text: string;
  word_count: number;
  char_count: number;
  awarded_marks: number | null;
  rubric_breakdown: WritingRubricBreakdown;
  feedback: string;
  grading_status: "pending" | "draft" | "graded" | "approved";
  updated_at: string;
}

export interface GradingRecord {
  id: string;
  attempt_id: string;
  teacher_id: string;
  section: string;
  criterion: string;
  awarded_marks: number;
  feedback: string;
  updated_at: string;
}

export interface ResultsPublicationRecord {
  id: string;
  exam_id: string;
  student_id: string;
  attempt_id: string;
  published_by: string;
  published_at: string;
  scheduled_for?: string | null;
  publication_status: "published" | "unpublished" | "scheduled";
  notes: string;
}

export interface AuditLogRecord {
  id: string;
  user_id: string | null;
  user_name?: string;
  user_role?: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DatabaseSchema {
  profiles: ProfileRecord[];
  students: StudentRecord[];
  exams: ExamRecord[];
  exam_sections: ExamSectionRecord[];
  questions: QuestionRecord[];
  exam_attempts: ExamAttemptRecord[];
  student_answers: StudentAnswerRecord[];
  writing_submissions: WritingSubmissionRecord[];
  grading_records: GradingRecord[];
  results_publications: ResultsPublicationRecord[];
  audit_logs: AuditLogRecord[];
  integrity_events?: IntegrityEventRecord[];
  similarity_flags?: SimilarityFlagRecord[];
}

export interface AuthenticatedUser {
  id: string; // profile.id
  full_name: string;
  email: string;
  role: UserRole;
  student_id?: string;
  student_number?: string;
  group_name?: string;
}
