# DEPLOYMENT INSTRUCTIONS (VERCEL + SUPABASE)
## Adam Ameyoud — English Language Assessment

---

## 1. Supabase Database Setup

1. Create a new project at [https://supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Run the contents of [`supabase/migrations/001_schema_and_rls.sql`](./supabase/migrations/001_schema_and_rls.sql) to create all 11 normalized tables (`profiles`, `students`, `exams`, `exam_sections`, `questions`, `exam_attempts`, `student_answers`, `writing_submissions`, `grading_records`, `results_publications`, `audit_logs`), foreign keys, indexes, and Row Level Security (RLS) policies.
4. Run the contents of [`supabase/migrations/002_seed_b1_exam.sql`](./supabase/migrations/002_seed_b1_exam.sql) to seed the initial **B1 – FINAL ENGLISH EXAMINATION** (all 40 Grammar items, the reading passage *"THE PRICE OF CONVENIENCE"*, all 15 Reading Comprehension items, the 2 Essay topics, and the Bonus Question).
5. In **Project Settings -> API**, copy:
   - `Project URL` (`NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public` key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role secret` key (`SUPABASE_SERVICE_ROLE_KEY` — server-only, never exposed to browser).

---

## 2. Deploying to Vercel

1. Push the repository to GitHub / GitLab / Bitbucket.
2. Import the project into [Vercel](https://vercel.com/new).
3. Configure the **Environment Variables** in Vercel Project Settings:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SESSION_SECRET=generate-a-strong-random-64-char-hmac-secret
   NEXT_PUBLIC_APP_URL=https://your-custom-domain.vercel.app
   ```
4. Click **Deploy**. Next.js App Router will build and deploy all server routes and pages automatically.
