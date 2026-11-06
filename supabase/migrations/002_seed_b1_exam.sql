-- ============================================================================
-- ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
-- Migration 002: Complete Seed of Initial B1 Final Examination & Accounts
-- ============================================================================

DO $$
DECLARE
    v_teacher_id UUID := '00000000-0000-0000-0000-000000000001';
    v_exam_id UUID := '10000000-0000-0000-0000-000000000001';
    v_sec_grammar UUID := '20000000-0000-0000-0000-000000000001';
    v_sec_reading UUID := '20000000-0000-0000-0000-000000000002';
    v_sec_writing UUID := '20000000-0000-0000-0000-000000000003';
    v_sec_bonus UUID := '20000000-0000-0000-0000-000000000004';
BEGIN
    -- 1. Insert Examiner (Adam Ameyoud) & 2 Candidates (hanine2026, ritedj2026)
    INSERT INTO public.profiles (id, full_name, email, password_hash, role) VALUES
        (v_teacher_id, 'Adam Ameyoud', 'adamameyoud', crypt('adamadam', gen_salt('bf')), 'teacher'),
        ('00000000-0000-0000-0000-000000000101', 'Hanine', 'hanine2026', crypt('haninehanine', gen_salt('bf')), 'student'),
        ('00000000-0000-0000-0000-000000000102', 'Ritedj', 'ritedj2026', crypt('ritedjritedj', gen_salt('bf')), 'student')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.students (id, profile_id, student_number, group_name, is_active) VALUES
        ('30000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000101', 'hanine2026', 'Group B1', TRUE),
        ('30000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000102', 'ritedj2026', 'Group B1', TRUE)
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert Initial B1 Final Examination
    INSERT INTO public.exams (
        id, code, title, subtitle, description, level, duration_minutes,
        access_code_hash, access_code_hint, start_time, end_time,
        max_attempts, status, total_marks, bonus_marks,
        reading_passage_title, reading_passage_text
    ) VALUES (
        v_exam_id,
        'B1-FINAL-2026',
        'B1 – FINAL ENGLISH EXAMINATION',
        'Strong B1, approaching B2',
        'Comprehensive Final English Assessment covering Grammar (50 marks), Reading Comprehension (25 marks), Academic & Reflective Writing (25 marks), and a Bonus Vocabulary & Critical Understanding section (2 marks).',
        'B1',
        150,
        crypt('B1FINAL2026', gen_salt('bf')),
        'B1FINAL2026',
        NOW() - INTERVAL '7 days',
        NOW() + INTERVAL '180 days',
        1,
        'active',
        100,
        2,
        'THE PRICE OF CONVENIENCE',
        E'Modern society has become increasingly dependent on convenience. From online shopping and instant communication to artificial intelligence and automated services, technology has transformed the way people live, work and interact. Tasks that once required considerable time and effort can now be completed within seconds. However, while these developments have undoubtedly improved certain aspects of human life, they have also raised important questions about the consequences of our growing dependence on technology.\n\nOne of the most noticeable changes concerns the way people acquire knowledge. In the past, learning often required patience, extensive reading and independent investigation. Today, information is immediately available through search engines and digital platforms. Although this accessibility has made education more inclusive, it has also encouraged some individuals to accept information without questioning its accuracy. As a result, having access to information does not necessarily mean possessing genuine knowledge.\n\nAnother concern is the effect of convenience on human relationships. People can communicate with friends and relatives regardless of geographical distance. Nevertheless, digital communication sometimes replaces meaningful face-to-face interaction. Individuals may spend hours exchanging messages while struggling to maintain deep conversations in real life. Paradoxically, a society that is more connected than ever may also experience increasing feelings of isolation.\n\nFurthermore, the widespread use of artificial intelligence has generated debate about human abilities. While these systems can perform complicated tasks efficiently, excessive reliance on them may weaken certain intellectual skills if individuals stop practising independent thinking. Rather than using technology as a substitute for human judgement, people should consider it a tool that supports their abilities.\n\nUltimately, convenience itself is neither entirely beneficial nor harmful. Its value depends on how responsibly individuals use it. Progress should not be measured exclusively by the speed at which tasks are completed, but also by the quality of human thinking, relationships and decisions. Perhaps the most important question is not how much technology can do for us, but how much of our humanity we are willing to preserve while using it.'
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Exam Sections
    INSERT INTO public.exam_sections (id, exam_id, title, description, section_order, max_marks) VALUES
        (v_sec_grammar, v_exam_id, 'Part One: Grammar', 'Multiple Choice, Sentence Transformation, Error Correction, and Verb Forms (50 marks)', 1, 50),
        (v_sec_reading, v_exam_id, 'Part Two: Reading Comprehension', 'Comprehension, True or False with Justification, Contextual Vocabulary, and Reference & Interpretation (25 marks)', 2, 25),
        (v_sec_writing, v_exam_id, 'Part Three: Writing', 'Choose ONE essay topic (180–220 words) (25 marks)', 3, 25),
        (v_sec_bonus, v_exam_id, 'Bonus Question', 'Words for the Teacher — Critical Vocabulary Selection & Explanation (2 marks)', 4, 2)
    ON CONFLICT (id) DO NOTHING;

    -- 4. PART ONE — GRAMMAR (50 MARKS)
    -- Exercise 1: Multiple Choice (10 marks, 1 mark each)
    INSERT INTO public.questions (section_id, exercise_title, exercise_instructions, question_type, question_text, prompt_keyword, options, correct_answers, accepted_answers, marks, question_order, grading_method) VALUES
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '1. By the time the rescue team arrived, the villagers ______ their homes.', NULL,
     '["a) have already left", "b) had already left", "c) already leave", "d) were already leaving"]'::jsonb,
     '["b) had already left"]'::jsonb, '["b", "b) had already left", "had already left"]'::jsonb, 1, 1, 'auto'),
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '2. If she had accepted the scholarship, she ______ abroad now.', NULL,
     '["a) would study", "b) will study", "c) would be studying", "d) had studied"]'::jsonb,
     '["c) would be studying"]'::jsonb, '["c", "c) would be studying", "would be studying"]'::jsonb, 1, 2, 'auto'),
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '3. Despite ______ exhausted, he continued working on his research.', NULL,
     '["a) he was", "b) being", "c) was", "d) to be"]'::jsonb,
     '["b) being"]'::jsonb, '["b", "b) being", "being"]'::jsonb, 1, 3, 'auto'),
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '4. The professor asked me where ______ the previous evening.', NULL,
     '["a) did I go", "b) I had gone", "c) have I gone", "d) I go"]'::jsonb,
     '["b) I had gone"]'::jsonb, '["b", "b) I had gone", "I had gone"]'::jsonb, 1, 4, 'auto'),
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '5. I ______ this novel for three weeks, but I haven''t finished it yet.', NULL,
     '["a) read", "b) have been reading", "c) had read", "d) am reading"]'::jsonb,
     '["b) have been reading"]'::jsonb, '["b", "b) have been reading", "have been reading"]'::jsonb, 1, 5, 'auto'),
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '6. Look at those dark clouds! It ______.', NULL,
     '["a) will rain", "b) rains", "c) is going to rain", "d) would rain"]'::jsonb,
     '["c) is going to rain"]'::jsonb, '["c", "c) is going to rain", "is going to rain"]'::jsonb, 1, 6, 'auto'),
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '7. You ______ have informed the authorities earlier. It was your responsibility.', NULL,
     '["a) should", "b) can", "c) might", "d) would"]'::jsonb,
     '["a) should"]'::jsonb, '["a", "a) should", "should"]'::jsonb, 1, 7, 'auto'),
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '8. She regrets ______ so much time on social media.', NULL,
     '["a) to spend", "b) spend", "c) spending", "d) spent"]'::jsonb,
     '["c) spending"]'::jsonb, '["c", "c) spending", "spending"]'::jsonb, 1, 8, 'auto'),
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '9. The new research centre ______ by the university next year.', NULL,
     '["a) will establish", "b) will be established", "c) has established", "d) establishes"]'::jsonb,
     '["b) will be established"]'::jsonb, '["b", "b) will be established", "will be established"]'::jsonb, 1, 9, 'auto'),
    (v_sec_grammar, 'Exercise 1: Multiple Choice (10 marks)', 'One mark each. Choose the correct option.', 'single_choice',
     '10. The woman ______ discovery changed modern medicine is a famous scientist.', NULL,
     '["a) who", "b) which", "c) whose", "d) whom"]'::jsonb,
     '["c) whose"]'::jsonb, '["c", "c) whose", "whose"]'::jsonb, 1, 10, 'auto'),

    -- Exercise 2: Sentence Transformation (20 marks — 10 questions, 2 marks each)
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '1. Although he was seriously ill, he attended the examination.', 'DESPITE', '[]'::jsonb,
     '["Despite being seriously ill, he attended the examination."]'::jsonb,
     '["Despite being seriously ill, he attended the examination.", "Despite his serious illness, he attended the examination.", "Despite the fact that he was seriously ill, he attended the examination.", "He attended the examination despite being seriously ill.", "He attended the examination despite his serious illness."]'::jsonb, 2, 11, 'hybrid'),
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '2. Someone has stolen the researcher''s laptop.', 'BEEN', '[]'::jsonb,
     '["The researcher''s laptop has been stolen."]'::jsonb,
     '["The researcher''s laptop has been stolen.", "The laptop of the researcher has been stolen."]'::jsonb, 2, 12, 'hybrid'),
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '3. "I will submit my assignment tomorrow," Sarah said.', 'TOLD', '[]'::jsonb,
     '["Sarah told me that she would submit her assignment the next day."]'::jsonb,
     '["Sarah told me that she would submit her assignment the next day.", "Sarah told me she would submit her assignment the following day.", "Sarah told us that she would submit her assignment the next day.", "Sarah told us she would submit her assignment the following day.", "Sarah told the teacher that she would submit her assignment the next day.", "Sarah told him that she would submit her assignment the next day."]'::jsonb, 2, 13, 'hybrid'),
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '4. If you don''t revise regularly, you won''t improve your performance.', 'UNLESS', '[]'::jsonb,
     '["Unless you revise regularly, you won''t improve your performance."]'::jsonb,
     '["Unless you revise regularly, you won''t improve your performance.", "Unless you revise regularly, you will not improve your performance.", "You won''t improve your performance unless you revise regularly.", "You will not improve your performance unless you revise regularly."]'::jsonb, 2, 14, 'hybrid'),
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '5. It is a pity that I didn''t take that opportunity.', 'WISH', '[]'::jsonb,
     '["I wish I had taken that opportunity."]'::jsonb,
     '["I wish I had taken that opportunity.", "I wish that I had taken that opportunity."]'::jsonb, 2, 15, 'hybrid'),
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '6. The last time I visited London was three years ago.', 'FOR', '[]'::jsonb,
     '["I haven''t visited London for three years."]'::jsonb,
     '["I haven''t visited London for three years.", "I have not visited London for three years.", "I haven''t been to London for three years.", "I have not been to London for three years."]'::jsonb, 2, 16, 'hybrid'),
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '7. The teacher expects the students to complete the project by Friday.', 'ARE', '[]'::jsonb,
     '["The students are expected to complete the project by Friday."]'::jsonb,
     '["The students are expected to complete the project by Friday.", "The students are expected by the teacher to complete the project by Friday."]'::jsonb, 2, 17, 'hybrid'),
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '8. The woman is a famous scientist. Her discovery changed modern medicine.', 'WHOSE', '[]'::jsonb,
     '["The woman whose discovery changed modern medicine is a famous scientist."]'::jsonb,
     '["The woman whose discovery changed modern medicine is a famous scientist.", "The woman, whose discovery changed modern medicine, is a famous scientist."]'::jsonb, 2, 18, 'hybrid'),
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '9. You should consult a specialist before making such an important decision.', 'OUGHT', '[]'::jsonb,
     '["You ought to consult a specialist before making such an important decision."]'::jsonb,
     '["You ought to consult a specialist before making such an important decision."]'::jsonb, 2, 19, 'hybrid'),
    (v_sec_grammar, 'Exercise 2: Sentence Transformation (20 marks)', 'Rewrite the following sentences without changing their original meaning. Use the given keyword without changing it. Two marks each.', 'sentence_transformation',
     '10. The train will leave before we arrive at the station.', 'BY', '[]'::jsonb,
     '["By the time we arrive at the station, the train will have left."]'::jsonb,
     '["By the time we arrive at the station, the train will have left.", "The train will have left by the time we arrive at the station."]'::jsonb, 2, 20, 'hybrid'),

    -- Exercise 3: Error Correction (10 marks — 10 questions, 1 mark each)
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '1. If I would have known about the meeting, I would have attended it.', NULL, '[]'::jsonb,
     '["If I had known about the meeting, I would have attended it."]'::jsonb,
     '["If I had known about the meeting, I would have attended it.", "Had I known about the meeting, I would have attended it."]'::jsonb, 1, 21, 'hybrid'),
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '2. She suggested to organise another meeting.', NULL, '[]'::jsonb,
     '["She suggested organising another meeting."]'::jsonb,
     '["She suggested organising another meeting.", "She suggested organizing another meeting.", "She suggested that we organise another meeting.", "She suggested that we organize another meeting.", "She suggested that they organise another meeting."]'::jsonb, 1, 22, 'hybrid'),
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '3. The building has been construct recently.', NULL, '[]'::jsonb,
     '["The building has been constructed recently."]'::jsonb,
     '["The building has been constructed recently.", "The building was constructed recently."]'::jsonb, 1, 23, 'hybrid'),
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '4. He asked me where did I buy that dictionary.', NULL, '[]'::jsonb,
     '["He asked me where I had bought that dictionary."]'::jsonb,
     '["He asked me where I had bought that dictionary.", "He asked me where I bought that dictionary."]'::jsonb, 1, 24, 'hybrid'),
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '5. In spite of she was disappointed, she remained polite.', NULL, '[]'::jsonb,
     '["In spite of being disappointed, she remained polite."]'::jsonb,
     '["In spite of being disappointed, she remained polite.", "In spite of her disappointment, she remained polite.", "Although she was disappointed, she remained polite.", "In spite of the fact that she was disappointed, she remained polite."]'::jsonb, 1, 25, 'hybrid'),
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '6. I have visited Paris last summer.', NULL, '[]'::jsonb,
     '["I visited Paris last summer."]'::jsonb,
     '["I visited Paris last summer."]'::jsonb, 1, 26, 'hybrid'),
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '7. The students which passed the examination received certificates.', NULL, '[]'::jsonb,
     '["The students who passed the examination received certificates."]'::jsonb,
     '["The students who passed the examination received certificates.", "The students that passed the examination received certificates."]'::jsonb, 1, 27, 'hybrid'),
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '8. You mustn''t have forgotten to lock the door yesterday.', NULL, '[]'::jsonb,
     '["You can''t have forgotten to lock the door yesterday."]'::jsonb,
     '["You can''t have forgotten to lock the door yesterday.", "You cannot have forgotten to lock the door yesterday.", "You shouldn''t have forgotten to lock the door yesterday.", "You should not have forgotten to lock the door yesterday."]'::jsonb, 1, 28, 'hybrid'),
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '9. By next December, she will complete her university degree.', NULL, '[]'::jsonb,
     '["By next December, she will have completed her university degree."]'::jsonb,
     '["By next December, she will have completed her university degree."]'::jsonb, 1, 29, 'hybrid'),
    (v_sec_grammar, 'Exercise 3: Error Correction (10 marks)', 'Each sentence contains one grammatical mistake. Rewrite the complete corrected sentence.', 'error_correction',
     '10. I wish I know the answer to this complicated question.', NULL, '[]'::jsonb,
     '["I wish I knew the answer to this complicated question."]'::jsonb,
     '["I wish I knew the answer to this complicated question."]'::jsonb, 1, 30, 'hybrid'),

    -- Exercise 4: Complete the Sentences (10 marks — 10 questions, 1 mark each)
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '1. By the time the lecture started, most students ______ already ______ (arrive).', 'arrive', '[]'::jsonb,
     '["had already arrived"]'::jsonb, '["had already arrived", "had / arrived", "had arrived"]'::jsonb, 1, 31, 'auto'),
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '2. If he ______ (study) harder, he would have passed the examination.', 'study', '[]'::jsonb,
     '["had studied"]'::jsonb, '["had studied"]'::jsonb, 1, 32, 'auto'),
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '3. The documents ______ (sign) by the director before the deadline.', 'sign', '[]'::jsonb,
     '["were signed"]'::jsonb, '["were signed", "had been signed", "will be signed", "will have been signed", "must be signed"]'::jsonb, 1, 33, 'auto'),
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '4. She denied ______ (take) the money from the office.', 'take', '[]'::jsonb,
     '["taking"]'::jsonb, '["taking", "having taken"]'::jsonb, 1, 34, 'auto'),
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '5. I wish I ______ (not / waste) so much time yesterday.', 'not / waste', '[]'::jsonb,
     '["had not wasted"]'::jsonb, '["had not wasted", "hadn''t wasted"]'::jsonb, 1, 35, 'auto'),
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '6. Unless you ______ (provide) sufficient evidence, your argument will remain weak.', 'provide', '[]'::jsonb,
     '["provide"]'::jsonb, '["provide"]'::jsonb, 1, 36, 'auto'),
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '7. They ______ (work) on this project since January.', 'work', '[]'::jsonb,
     '["have been working"]'::jsonb, '["have been working", "have worked"]'::jsonb, 1, 37, 'auto'),
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '8. The manager promised that he ______ (contact) us the following day.', 'contact', '[]'::jsonb,
     '["would contact"]'::jsonb, '["would contact"]'::jsonb, 1, 38, 'auto'),
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '9. The woman ______ (live) next door is a university professor.', 'live', '[]'::jsonb,
     '["living"]'::jsonb, '["living", "who lives"]'::jsonb, 1, 39, 'auto'),
    (v_sec_grammar, 'Exercise 4: Complete the Sentences (10 marks)', 'Use the correct form of the verbs in brackets.', 'fill_in_the_gap',
     '10. You ______ (not / use) your phone during the examination. It is strictly prohibited.', 'not / use', '[]'::jsonb,
     '["must not use"]'::jsonb, '["must not use", "mustn''t use", "cannot use", "can''t use", "are not allowed to use", "may not use"]'::jsonb, 1, 40, 'auto'),

    -- 5. PART TWO — READING COMPREHENSION (25 MARKS)
    -- Reading Exercise 1: Comprehension (10 marks — 5 questions, 2 marks each)
    (v_sec_reading, 'Reading Exercise 1: Comprehension (10 marks)', 'Answer the following questions based on the passage "THE PRICE OF CONVENIENCE". Two marks each.', 'reading_comprehension',
     '1. What is the main contradiction presented in the passage concerning modern communication? (2 marks)', NULL, '[]'::jsonb,
     '["Although society is more connected than ever through digital communication, people may experience increasing feelings of isolation and struggle with deep face-to-face conversations."]'::jsonb,
     '["connected", "isolation", "face-to-face", "paradoxically"]'::jsonb, 2, 1, 'hybrid'),
    (v_sec_reading, 'Reading Exercise 1: Comprehension (10 marks)', 'Answer the following questions based on the passage "THE PRICE OF CONVENIENCE". Two marks each.', 'reading_comprehension',
     '2. Why does having immediate access to information not necessarily guarantee genuine knowledge? (2 marks)', NULL, '[]'::jsonb,
     '["Because immediate accessibility encourages some individuals to accept information without questioning its accuracy or conducting independent investigation."]'::jsonb,
     '["without questioning", "accuracy", "accept information", "patience", "independent investigation"]'::jsonb, 2, 2, 'hybrid'),
    (v_sec_reading, 'Reading Exercise 1: Comprehension (10 marks)', 'Answer the following questions based on the passage "THE PRICE OF CONVENIENCE". Two marks each.', 'reading_comprehension',
     '3. How might excessive dependence on artificial intelligence affect human intellectual abilities? (2 marks)', NULL, '[]'::jsonb,
     '["Excessive reliance on AI may weaken certain intellectual skills if individuals stop practising independent thinking and use technology as a substitute for human judgement."]'::jsonb,
     '["weaken", "intellectual skills", "independent thinking", "human judgement"]'::jsonb, 2, 3, 'hybrid'),
    (v_sec_reading, 'Reading Exercise 1: Comprehension (10 marks)', 'Answer the following questions based on the passage "THE PRICE OF CONVENIENCE". Two marks each.', 'reading_comprehension',
     '4. What does the writer suggest should determine the value of technological progress? (2 marks)', NULL, '[]'::jsonb,
     '["The value of progress should be determined by how responsibly individuals use convenience and by the quality of human thinking, relationships, and decisions, not just speed."]'::jsonb,
     '["responsibly", "quality of human thinking", "relationships", "decisions"]'::jsonb, 2, 4, 'hybrid'),
    (v_sec_reading, 'Reading Exercise 1: Comprehension (10 marks)', 'Answer the following questions based on the passage "THE PRICE OF CONVENIENCE". Two marks each.', 'reading_comprehension',
     '5. Suggest an appropriate alternative title for the passage. (2 marks)', NULL, '[]'::jsonb,
     '["Technology and Humanity: Balancing Convenience and Independent Thought"]'::jsonb,
     '["technology", "convenience", "humanity", "modern", "digital", "dependence", "cost", "consequences"]'::jsonb, 2, 5, 'hybrid'),

    -- Reading Exercise 2: True or False (6 marks — 3 questions, 2 marks each: 1 mark T/F + 1 mark justification)
    (v_sec_reading, 'Reading Exercise 2: True or False (6 marks)', 'State whether each statement is True or False and justify your answer using information from the passage. (2 marks each)', 'true_false',
     '1. Modern technology has made access to education and information more difficult.', NULL, '["True", "False"]'::jsonb,
     '["False"]'::jsonb,
     '["False", "immediately available", "accessibility has made education more inclusive"]'::jsonb, 2, 6, 'hybrid'),
    (v_sec_reading, 'Reading Exercise 2: True or False (6 marks)', 'State whether each statement is True or False and justify your answer using information from the passage. (2 marks each)', 'true_false',
     '2. The writer believes that digital communication always strengthens personal relationships.', NULL, '["True", "False"]'::jsonb,
     '["False"]'::jsonb,
     '["False", "replaces meaningful face-to-face interaction", "struggling to maintain deep conversations", "feelings of isolation"]'::jsonb, 2, 7, 'hybrid'),
    (v_sec_reading, 'Reading Exercise 2: True or False (6 marks)', 'State whether each statement is True or False and justify your answer using information from the passage. (2 marks each)', 'true_false',
     '3. The writer considers technology a tool that should support rather than replace human judgement.', NULL, '["True", "False"]'::jsonb,
     '["True"]'::jsonb,
     '["True", "Rather than using technology as a substitute for human judgement", "consider it a tool that supports their abilities"]'::jsonb, 2, 8, 'hybrid'),

    -- Reading Exercise 3: Vocabulary (4 marks — 4 questions, 1 mark each)
    (v_sec_reading, 'Reading Exercise 3: Vocabulary (4 marks)', 'Find words or expressions in the passage that mean the following. One mark each.', 'short_text',
     '1. Made something possible to use or obtain more easily. (Paragraph 2)', NULL, '[]'::jsonb,
     '["accessibility"]'::jsonb, '["accessibility", "immediately available", "inclusive"]'::jsonb, 1, 9, 'auto'),
    (v_sec_reading, 'Reading Exercise 3: Vocabulary (4 marks)', 'Find words or expressions in the passage that mean the following. One mark each.', 'short_text',
     '2. The ability to make decisions based on careful thought. (Paragraph 4 / Text)', NULL, '[]'::jsonb,
     '["judgement"]'::jsonb, '["judgement", "judgment", "human judgement", "independent thinking"]'::jsonb, 1, 10, 'auto'),
    (v_sec_reading, 'Reading Exercise 3: Vocabulary (4 marks)', 'Find words or expressions in the passage that mean the following. One mark each.', 'short_text',
     '3. Depending too much on someone or something. (Paragraph 4)', NULL, '[]'::jsonb,
     '["excessive reliance"]'::jsonb, '["excessive reliance", "reliance", "dependence", "growing dependence"]'::jsonb, 1, 11, 'auto'),
    (v_sec_reading, 'Reading Exercise 3: Vocabulary (4 marks)', 'Find words or expressions in the passage that mean the following. One mark each.', 'short_text',
     '4. The act of keeping something safe or maintaining it. (Paragraph 5)', NULL, '[]'::jsonb,
     '["preserve"]'::jsonb, '["preserve", "to preserve"]'::jsonb, 1, 12, 'auto'),

    -- Reading Exercise 4: Reference and Interpretation (5 marks)
    (v_sec_reading, 'Reading Exercise 4: Reference and Interpretation (5 marks)', 'Answer the reference and interpretation questions carefully.', 'reading_comprehension',
     '1. What does "these developments" in paragraph 1 refer to? (2 marks)', NULL, '[]'::jsonb,
     '["Online shopping, instant communication, artificial intelligence, automated services, and technological convenience."]'::jsonb,
     '["online shopping", "instant communication", "artificial intelligence", "automated services", "technology"]'::jsonb, 2, 13, 'hybrid'),
    (v_sec_reading, 'Reading Exercise 4: Reference and Interpretation (5 marks)', 'Answer the reference and interpretation questions carefully.', 'reading_comprehension',
     '2. What does "them" in paragraph 4 refer to? (1 mark)', NULL, '[]'::jsonb,
     '["Artificial intelligence systems (these systems)."]'::jsonb,
     '["artificial intelligence", "these systems", "ai systems", "systems"]'::jsonb, 1, 14, 'hybrid'),
    (v_sec_reading, 'Reading Exercise 4: Reference and Interpretation (5 marks)', 'Answer the reference and interpretation questions carefully.', 'reading_comprehension',
     '3. Explain the meaning of the final sentence in your own words: "Perhaps the most important question is not how much technology can do for us, but how much of our humanity we are willing to preserve while using it." (2 marks)', NULL, '[]'::jsonb,
     '["We should focus on protecting our human qualities, critical thinking, and genuine relationships rather than only focusing on technological capabilities."]'::jsonb,
     '["humanity", "preserve", "protect", "relationships", "thinking", "values", "human qualities"]'::jsonb, 2, 15, 'hybrid'),

    -- 6. PART THREE — WRITING (25 MARKS)
    (v_sec_writing, 'Part Three: Essay Writing (25 marks)', 'Students must choose ONE topic. Word limit: 180–220 words.', 'essay',
     'Choose ONE of the two topics below and write a well-structured essay of 180–220 words.', NULL,
     '["Topic 1: Technology and Human Intelligence — Some people believe that modern technology makes individuals more intelligent, while others argue that it makes them intellectually dependent. Write an argumentative essay discussing both perspectives and expressing your own opinion.", "Topic 2: A Decision That Changed Everything — Imagine that you had been given an important opportunity in your life but failed to take advantage of it. Write a reflective essay explaining: What the opportunity was; Why you did not take it; What the consequences were; What you wish you had done differently; What you learned from the experience."]'::jsonb,
     '[]'::jsonb, '[]'::jsonb, 25, 1, 'manual'),

    -- 7. BONUS QUESTION — 2 MARKS
    (v_sec_bonus, 'Bonus Question: Words for the Teacher (2 marks)', 'Identify two words from the reading passage that you consider particularly important for understanding its central message. Explain each word in your own words. (1 mark per word + explanation)', 'bonus_words',
     'Identify two words from the reading passage "THE PRICE OF CONVENIENCE" that you consider particularly important for understanding its central message, and explain each word in your own words.', NULL,
     '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 2, 1, 'manual');

END $$;
