-- ============================================================================
-- ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
-- 001_schema_and_rls.sql
-- Complete PostgreSQL Schema, Row Level Security (RLS), and Integrity Module
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. STUDENTS
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_number TEXT UNIQUE NOT NULL,
    group_name TEXT NOT NULL DEFAULT 'Group B1',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EXAMS
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT 'English Language Assessment',
    description TEXT NOT NULL DEFAULT '',
    level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1')),
    duration_minutes INTEGER NOT NULL DEFAULT 150,
    access_code_hash TEXT NOT NULL,
    access_code_hint TEXT NOT NULL DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    max_attempts INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
    total_marks NUMERIC(6, 2) NOT NULL DEFAULT 100,
    bonus_marks NUMERIC(6, 2) NOT NULL DEFAULT 2,
    reading_passage_title TEXT,
    reading_passage_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EXAM SECTIONS
CREATE TABLE IF NOT EXISTS public.exam_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    section_order INTEGER NOT NULL,
    max_marks NUMERIC(6, 2) NOT NULL
);

-- 5. QUESTIONS
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES public.exam_sections(id) ON DELETE CASCADE,
    exercise_title TEXT NOT NULL,
    exercise_instructions TEXT NOT NULL DEFAULT '',
    question_type TEXT NOT NULL CHECK (
        question_type IN (
            'single_choice',
            'multiple_choice',
            'short_text',
            'sentence_transformation',
            'error_correction',
            'fill_in_the_gap',
            'true_false',
            'reading_comprehension',
            'essay',
            'bonus_words'
        )
    ),
    question_text TEXT NOT NULL,
    prompt_keyword TEXT,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    accepted_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    marks NUMERIC(6, 2) NOT NULL DEFAULT 1,
    question_order INTEGER NOT NULL,
    grading_method TEXT NOT NULL CHECK (grading_method IN ('auto', 'hybrid', 'manual')),
    allow_question_randomization BOOLEAN NOT NULL DEFAULT true,
    allow_option_randomization BOOLEAN NOT NULL DEFAULT true
);

-- 6. EXAM ATTEMPTS (Server-Authoritative Timestamps, Variants & Integrity Counters)
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'locked')),
    grammar_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    reading_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    writing_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    bonus_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    final_total NUMERIC(6, 2) NOT NULL DEFAULT 0,
    results_status TEXT NOT NULL DEFAULT 'not_graded' CHECK (
        results_status IN (
            'not_graded',
            'grading_in_progress',
            'awaiting_approval',
            'approved',
            'published',
            'unpublished'
        )
    ),
    results_published_at TIMESTAMPTZ,
    results_published_by UUID REFERENCES public.profiles(id),
    scheduled_publish_at TIMESTAMPTZ,
    teacher_overall_feedback TEXT NOT NULL DEFAULT '',
    show_teacher_feedback BOOLEAN NOT NULL DEFAULT true,
    last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Integrity, Randomization & Oral Verification Columns
    variant_code TEXT NOT NULL DEFAULT 'A',
    randomization_seed TEXT,
    question_order_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    option_order_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    active_client_session_id TEXT,
    active_user_agent TEXT,
    tab_switches_count INTEGER NOT NULL DEFAULT 0,
    total_hidden_seconds NUMERIC(10, 2) NOT NULL DEFAULT 0,
    refresh_count INTEGER NOT NULL DEFAULT 0,
    disconnect_count INTEGER NOT NULL DEFAULT 0,
    session_change_count INTEGER NOT NULL DEFAULT 0,
    teacher_integrity_notes TEXT NOT NULL DEFAULT '',
    integrity_review_status TEXT NOT NULL DEFAULT 'clean',
    oral_verification_status TEXT NOT NULL DEFAULT 'not_required',
    oral_verification_scheduled_at TIMESTAMPTZ,
    oral_verification_teacher_comments TEXT NOT NULL DEFAULT '',
    oral_verification_student_notice TEXT NOT NULL DEFAULT '',
    privacy_notice_acknowledged_at TIMESTAMPTZ
);

-- 7. STUDENT ANSWERS
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer JSONB NOT NULL DEFAULT '""'::jsonb,
    awarded_marks NUMERIC(6, 2),
    auto_awarded_marks NUMERIC(6, 2),
    true_false_choice_marks NUMERIC(6, 2),
    true_false_justification_marks NUMERIC(6, 2),
    is_graded BOOLEAN NOT NULL DEFAULT false,
    is_manual_override BOOLEAN NOT NULL DEFAULT false,
    teacher_feedback TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, question_id)
);

-- 8. WRITING SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.writing_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID UNIQUE NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    topic TEXT NOT NULL DEFAULT '',
    essay_text TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    char_count INTEGER NOT NULL DEFAULT 0,
    awarded_marks NUMERIC(6, 2),
    rubric_breakdown JSONB NOT NULL DEFAULT '{"grammar_accuracy":0,"vocabulary":0,"organisation":0,"task_achievement":0,"mechanics":0}'::jsonb,
    feedback TEXT NOT NULL DEFAULT '',
    grading_status TEXT NOT NULL DEFAULT 'pending' CHECK (grading_status IN ('pending', 'draft', 'graded', 'approved')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. GRADING RECORDS
CREATE TABLE IF NOT EXISTS public.grading_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id),
    section TEXT NOT NULL,
    criterion TEXT NOT NULL,
    awarded_marks NUMERIC(6, 2) NOT NULL DEFAULT 0,
    feedback TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. RESULTS PUBLICATIONS
CREATE TABLE IF NOT EXISTS public.results_publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    published_by UUID NOT NULL REFERENCES public.profiles(id),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ,
    publication_status TEXT NOT NULL CHECK (publication_status IN ('published', 'unpublished', 'scheduled')),
    notes TEXT NOT NULL DEFAULT ''
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. INTEGRITY EVENTS
CREATE TABLE IF NOT EXISTS public.integrity_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_timestamp TEXT,
    duration_seconds NUMERIC(10, 2),
    client_session_id TEXT,
    details TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    teacher_note TEXT NOT NULL DEFAULT ''
);

-- 13. SIMILARITY FLAGS (Originality & Answer Pattern Review)
CREATE TABLE IF NOT EXISTS public.similarity_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    attempt_a_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    attempt_b_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    student_a_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_b_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    essay_similarity_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
    answer_pattern_similarity_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
    identical_answers_count INTEGER NOT NULL DEFAULT 0,
    identical_wrong_answers_count INTEGER NOT NULL DEFAULT 0,
    total_compared_questions INTEGER NOT NULL DEFAULT 0,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    flagged_reason TEXT NOT NULL DEFAULT '',
    shared_details JSONB NOT NULL DEFAULT '[]'::jsonb,
    review_status TEXT NOT NULL DEFAULT 'pending_review',
    teacher_notes TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.similarity_flags ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'teacher'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID AS $$
    SELECT id FROM public.students WHERE profile_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Teachers can manage all profiles"
    ON public.profiles FOR ALL USING (public.is_teacher());

CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Teachers can manage all students"
    ON public.students FOR ALL USING (public.is_teacher());

CREATE POLICY "Students can read own student record"
    ON public.students FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Teachers can manage all exams"
    ON public.exams FOR ALL USING (public.is_teacher());

CREATE POLICY "Authenticated students can view active exams metadata"
    ON public.exams FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'active');

CREATE POLICY "Teachers can manage all sections"
    ON public.exam_sections FOR ALL USING (public.is_teacher());

CREATE POLICY "Students can view sections of active exams"
    ON public.exam_sections FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_sections.exam_id AND e.status = 'active'));

CREATE POLICY "Teachers can manage all questions"
    ON public.questions FOR ALL USING (public.is_teacher());

-- Secure student view for questions (strips correct_answers and accepted_answers)
CREATE OR REPLACE VIEW public.student_exam_questions AS
SELECT
    q.id,
    q.section_id,
    q.exercise_title,
    q.exercise_instructions,
    q.question_type,
    q.question_text,
    q.prompt_keyword,
    q.options,
    q.marks,
    q.question_order
FROM public.questions q;

CREATE POLICY "Teachers can manage all exam attempts"
    ON public.exam_attempts FOR ALL USING (public.is_teacher());

CREATE POLICY "Students can view own exam attempts"
    ON public.exam_attempts FOR SELECT USING (student_id = public.current_student_id());

CREATE POLICY "Students can insert own exam attempt"
    ON public.exam_attempts FOR INSERT WITH CHECK (student_id = public.current_student_id());

CREATE POLICY "Teachers can manage all student answers"
    ON public.student_answers FOR ALL USING (public.is_teacher());

CREATE POLICY "Students can view own answers during attempt"
    ON public.student_answers FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = student_answers.attempt_id AND ea.student_id = public.current_student_id()));

CREATE POLICY "Students can insert/update own answers only while attempt is in_progress"
    ON public.student_answers FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = student_answers.attempt_id AND ea.student_id = public.current_student_id() AND ea.status = 'in_progress'));

CREATE POLICY "Students can update own answers only while attempt is in_progress"
    ON public.student_answers FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = student_answers.attempt_id AND ea.student_id = public.current_student_id() AND ea.status = 'in_progress'));

CREATE POLICY "Teachers can manage all writing submissions"
    ON public.writing_submissions FOR ALL USING (public.is_teacher());

CREATE POLICY "Students can read own writing submission"
    ON public.writing_submissions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = writing_submissions.attempt_id AND ea.student_id = public.current_student_id()));

CREATE POLICY "Students can upsert own writing submission while in_progress"
    ON public.writing_submissions FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = writing_submissions.attempt_id AND ea.student_id = public.current_student_id() AND ea.status = 'in_progress'));

CREATE POLICY "Students can update own writing submission while in_progress"
    ON public.writing_submissions FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = writing_submissions.attempt_id AND ea.student_id = public.current_student_id() AND ea.status = 'in_progress'));

CREATE POLICY "Teachers can manage all grading records"
    ON public.grading_records FOR ALL USING (public.is_teacher());

CREATE POLICY "Students can read grading records ONLY when results are published"
    ON public.grading_records FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.exam_attempts ea WHERE ea.id = grading_records.attempt_id AND ea.student_id = public.current_student_id() AND ea.results_status = 'published'));

CREATE POLICY "Teachers can manage all results publications"
    ON public.results_publications FOR ALL USING (public.is_teacher());

CREATE POLICY "Students can view own published records"
    ON public.results_publications FOR SELECT
    USING (student_id = public.current_student_id() AND publication_status = 'published');

CREATE POLICY "Teachers can view all audit logs"
    ON public.audit_logs FOR SELECT USING (public.is_teacher());

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can manage all integrity events"
    ON public.integrity_events FOR ALL USING (public.is_teacher());

CREATE POLICY "Students can insert own integrity events"
    ON public.integrity_events FOR INSERT WITH CHECK (student_id = public.current_student_id());

CREATE POLICY "Teachers can manage all similarity flags"
    ON public.similarity_flags FOR ALL USING (public.is_teacher());
