# TESTING & VERIFICATION DOCUMENTATION
## Adam Ameyoud — English Language Assessment

---

## Running the Automated 25-Point E2E Test Suite

With the Next.js server running on `http://localhost:3000`, execute:

```bash
npm run test:e2e
```

### Verified Scenarios in `scripts/test-platform.mjs`

| # | Test Scenario | Verification Method |
|---|---|---|
| 1 | Teacher login | Authenticates `adam@ameyoud-assessment.com` and verifies `teacher` session cookie. |
| 2 | Student login | Authenticates `STU-2026-001` (`Yasmine Belkacem`) and verifies `student` session cookie. |
| 3 | Access code validation | Rejects `WRONGCODE999` (`403`) and accepts `B1FINAL2026` (`200`). |
| 4 | Unauthorized access | Verifies student is blocked from `/api/teacher/overview` (`403`) and redirected from `/teacher/dashboard` (`307`). |
| 5 | Starting an examination | Starts attempt on `B1 – FINAL ENGLISH EXAMINATION` and loads all 57 items across 4 sections. |
| 6 | Timer persistence after refresh | Re-fetches `/api/exam/attempt` after delay and confirms `started_at` is unchanged and `remainingSeconds` decrements monotonically. |
| 7 | Autosave | Saves MCQs, sentence transformations, gap fills, True/False justification, bonus words, and essay draft to server. |
| 8 | Network interruption & recovery | Verifies dirty queue synchronization upon reconnection. |
| 9 | Multiple-choice grading | Verifies 10/10 MCQs are automatically scored (`10/10`). |
| 10 | Short-answer & transformation grading | Verifies accepted grammatical alternatives, gap fills, vocabulary, and True/False choice + justification scoring. |
| 11 | Essay submission | Submits 190-word argumentative essay on Topic 1 and locks attempt. |
| 12 | Automatic submission at timeout | Verifies server-authoritative expiration auto-submits `in_progress` attempts. |
| 13 | Manual essay grading | Applies 5-criterion rubric (`7.5 + 4.5 + 4.5 + 4.5 + 2 = 23/25`). |
| 14 | Bonus grading | Evaluates both selected words and meanings (`+2/2`). |
| 15 | Results calculation | Verifies `Grammar (/50) + Reading (/25) + Writing (/25) = Regular (/100)` and `Final (/102)` with bonus kept separate from regular percentage. |
| 16 | Results remaining hidden after submission | Confirms `/api/student/results` returns `breakdown: null` both immediately after submission and when `approved` but not yet `published`. |
| 17 | Results publication by teacher | Publishes individual result via `/api/teacher/results`. |
| 18 | Individual results access & isolation | Confirms Student 1 sees their published breakdown while Student 2 cannot see Student 1's results. |
| 19 | Group results publication | Publishes results for `Group B1-A` and verifies release. |
| 20 | Unpublishing results | Unpublishes result and confirms immediate hiding on `/api/student/results`. |
| 21 | CSV exports | Verifies student list, submissions, and statistics CSV generation (with UTF-8 BOM for Excel). |
| 22 | PDF exports | Verifies individual candidate PDF transcript and group summary PDF generation. |
| 23 | Mobile responsiveness | Responsive navigation drawers and adaptive grids across mobile/tablet/desktop viewports. |
| 24 | Database & API permissions | Confirms `correct_answers`, `accepted_answers`, and `access_code_hash` are never present in student payloads. |
| 25 | Duplicate submission attempts | Confirms second POST to `/api/exam/submit` returns `409 Conflict`. |
