# ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
### Professional Online Examination Platform (CEFR A1, A2, B1, B2, C1)

A complete, production-ready online examination management and assessment platform engineered for **Adam Ameyoud — English Language Assessment**.

---

## 1. Key Platform Capabilities

### Student Examination Experience
- **Individual Candidate Accounts**: Register or sign in using Student ID or Email + Password.
- **Secure Examination Access Gateway**: Hashed examination access codes (`B1FINAL2026` for the initial B1 Final Examination) verified on the server.
- **Professional Online Testing Interface**:
  - **Top Navigation Bar**: Adam Ameyoud branding, examination title, student identity, server-authoritative countdown timer, real-time network connection indicator, and autosave indicator.
  - **Left Section & Question Navigator**: Instant navigation across *Part One: Grammar*, *Part Two: Reading Comprehension*, *Part Three: Writing*, and *Bonus Question* with live *Answered*, *Unanswered*, and *Current* indicators.
  - **9 Supported Answer Types**: Single-choice, multiple-choice, short text, sentence transformation (with required keyword verification), error correction, fill-in-the-gap, True/False with justification, reading comprehension, and long-form essay responses (with formatting toolbar, word/character counter, and 180–220 word-count guidance).
- **Server-Authoritative Timer (150 Minutes)**:
  - Begins only when the candidate starts the attempt.
  - Refreshing or reconnecting never resets the timer.
  - Displays warnings at **15 minutes** and **5 minutes** remaining, and automatically submits when time expires.
- **Strict Post-Submission Score Restriction**:
  - Marks, preliminary grades, and answer keys are **never** shown upon submission.
  - Candidates only see their results after **Adam Ameyoud** explicitly approves and authorizes publication.

### Teacher / Examiner Console (`Adam Ameyoud`)
- **Administrative Overview Dashboard**: 12 real-time metrics, participation funnel chart, and recent submissions.
- **Examination Management**: Create, edit, duplicate, activate/deactivate A1, A2, B1, B2, and C1 examinations, configure access codes, durations, and question banks.
- **Student Management**: Add, edit, delete candidates with confirmation, bulk CSV import, search by name/ID, filter by group, and export CSV.
- **Hybrid Automatic + Manual Grading**:
  - Automatic grading for MCQs, verb forms, vocabulary, and accepted grammatical alternatives.
  - Manual override on every question, separate True/False choice + justification grading, 5-criterion Writing Rubric (`/25`), and Bonus Question grading (`/2`).
- **Dedicated Results Publication System (`/teacher/results`)**:
  - States: *Not graded*, *Grading in progress*, *Awaiting approval*, *Approved*, *Published*, *Unpublished*.
  - Publish all results, publish by group, publish individual results, schedule publication, or unpublish results — protected by confirmation dialogs.
- **Exports & Reporting**: CSV, Excel-compatible UTF-8 BOM CSV, and official PDF Results Transcripts.

---

## 2. Quick Start & Local Installation

### Prerequisites
- Node.js `>= 18.x` (v22 LTS installed in environment)
- npm

### Step 1 — Install Dependencies
```bash
cd adam-ameyoud-exams
npm install
```

### Step 2 — Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
- **Local Server Mode (Default out of the box)**: Uses the built-in transactional server-side persistent database (`data/database.json`) with the exact 11 normalized tables, seeded B1 Final Examination, and server-enforced RBAC/RLS.
- **Supabase Cloud Mode**: Add your `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and run the SQL migrations in `supabase/migrations/001_schema_and_rls.sql` and `supabase/migrations/002_seed_b1_exam.sql`.

### Step 3 — Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000`.

---

## 3. Platform Accounts & Examination Access Code

### Examiner / Teacher Account
- **Role**: Teacher / Administrator (`Adam Ameyoud`)
- **Username**: `adamameyoud`
- **Password**: `adamadam`

### Candidate Accounts (Only 2 Candidates)
| Candidate Name | Username / ID | Group | Password |
|---|---|---|---|
| Hanine | `hanine2026` | `Group B1` | `haninehanine` |
| Ritedj | `ritedj2026` | `Group B1` | `ritedjritedj` |

### Seeded B1 Final Examination
- **Title**: `B1 – FINAL ENGLISH EXAMINATION`
- **Access Code**: `B1FINAL2026`
- **Duration**: `150 minutes`
- **Marks**: Grammar (`50`), Reading (`25`), Writing (`25`) = `100` Regular + `2` Bonus = `102` Total.
