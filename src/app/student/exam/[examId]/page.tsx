"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AnswerValue,
  BonusWordsAnswerValue,
  ExamSectionRecord,
  StudentQuestionDTO,
  TrueFalseAnswerValue,
} from "@/lib/types";
import { countWords } from "@/lib/grading";
import {
  BookOpen,
  Clock,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  KeyRound,
  Bold,
  Italic,
  Underline,
  Eraser,
  FileText,
  Loader2,
  ShieldCheck,
  EyeOff,
  Info,
} from "lucide-react";

function formatQuestionDisplayText(
  q: StudentQuestionDTO,
  displayNumber: number
): string {
  // If Exercise 2 narrative paragraph with (1) ______ gaps, preserve as-is
  if (/\(\d+\)\s*_+/i.test(q.question_text)) {
    return q.question_text;
  }
  // Replace leading hardcoded number e.g. "1. " with the candidate's current variant sequence number
  if (/^\d+\.\s+/.test(q.question_text)) {
    return q.question_text.replace(/^\d+\.\s+/, `${displayNumber}. `);
  }
  return q.question_text;
}

function formatOptionDisplayLabel(opt: string, index: number): string {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const prefix = letters[index] || String(index + 1);
  const stripped = opt.replace(/^[a-f]\)\s*/i, "").trim();
  return `${prefix}) ${stripped}`;
}

function formatRemainingTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return [
    String(hrs).padStart(2, "0"),
    String(mins).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":");
}

function isQuestionAnswered(
  q: StudentQuestionDTO,
  ans: AnswerValue | undefined,
  writingTopic: string,
  essayText: string
): boolean {
  if (q.question_type === "essay") {
    return Boolean(writingTopic && countWords(essayText) > 0);
  }
  if (ans === undefined || ans === null) return false;
  if (typeof ans === "string") return ans.trim().length > 0;
  if (Array.isArray(ans)) return ans.length > 0;
  if (typeof ans === "object") {
    if ("choice" in ans) {
      const tf = ans as TrueFalseAnswerValue;
      return Boolean(tf.choice && tf.justification?.trim());
    }
    if ("word1" in ans) {
      const bw = ans as BonusWordsAnswerValue;
      return Boolean(
        bw.word1?.trim() &&
          bw.meaning1?.trim() &&
          bw.word2?.trim() &&
          bw.meaning2?.trim()
      );
    }
  }
  return false;
}

export default function StudentExamEnvironmentPage() {
  const params = useParams<{ examId: string }>();
  const router = useRouter();
  const examId = params.examId;

  const [loading, setLoading] = useState(true);
  const [needsAccessCode, setNeedsAccessCode] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessError, setAccessError] = useState("");

  const [studentName, setStudentName] = useState("Candidate");
  const [exam, setExam] = useState<{
    id: string;
    title: string;
    subtitle: string;
    duration_minutes: number;
    reading_passage_title?: string;
    reading_passage_text?: string;
  } | null>(null);
  const [attemptId, setAttemptId] = useState<string>("");
  const [sections, setSections] = useState<ExamSectionRecord[]>([]);
  const [questions, setQuestions] = useState<StudentQuestionDTO[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  // Answers state
  const [answersMap, setAnswersMap] = useState<Record<string, AnswerValue>>({});
  const [writingTopic, setWritingTopic] = useState<string>("");
  const [essayText, setEssayText] = useState<string>("");

  // Timer & Connectivity state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(150 * 60);
  const deadlineMsRef = useRef<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "unsaved" | "offline_queued"
  >("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // Modals & UI toggles
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReadingPassage, setShowReadingPassage] = useState(true);

  // Integrity, Variant & Privacy State
  const [variantCode, setVariantCode] = useState<string>("A");
  const [tabSwitchesCount, setTabSwitchesCount] = useState<number>(0);
  const [showTabWarningModal, setShowTabWarningModal] = useState<boolean>(false);
  const [lastTabAwaySeconds, setLastTabAwaySeconds] = useState<number>(0);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

  const clientSessionIdRef = useRef<string>("");
  const hiddenSinceMsRef = useRef<number | null>(null);
  const offlineSinceMsRef = useRef<number | null>(null);

  const dirtyQuestionsRef = useRef<Set<string>>(new Set());
  const dirtyWritingRef = useRef<boolean>(false);
  const answersRef = useRef<Record<string, AnswerValue>>({});
  const writingRef = useRef<{ topic: string; essayText: string }>({
    topic: "",
    essayText: "",
  });
  const essayTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    answersRef.current = answersMap;
  }, [answersMap]);

  useEffect(() => {
    writingRef.current = { topic: writingTopic, essayText };
  }, [writingTopic, essayText]);

  const logIntegrityEvent = useCallback(
    async (
      eventType: string,
      durationSeconds?: number | null,
      details?: string,
      overrideAttemptId?: string
    ) => {
      const targetAttemptId = overrideAttemptId || attemptId;
      if (!targetAttemptId) return;
      try {
        const res = await fetch("/api/exam/integrity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            attemptId: targetAttemptId,
            eventType,
            clientTimestamp: new Date().toISOString(),
            durationSeconds: durationSeconds ?? null,
            clientSessionId: clientSessionIdRef.current || null,
            details,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.counters && typeof data.counters.tabSwitchesCount === "number") {
            setTabSwitchesCount(data.counters.tabSwitchesCount);
          }
        }
      } catch {
        // Non-blocking integrity telemetry
      }
    },
    [attemptId]
  );

  const loadSession = useCallback(
    async (providedCode?: string) => {
      setLoading(true);
      setAccessError("");
      try {
        // Ensure a persistent per-tab clientSessionId
        let cSid = "";
        let isRefresh = false;
        if (typeof window !== "undefined") {
          const storageKey = `adam_exam_client_session_${examId}`;
          const loadedKey = `adam_exam_loaded_${examId}`;
          cSid = window.sessionStorage.getItem(storageKey) || "";
          if (!cSid) {
            cSid = `csid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            window.sessionStorage.setItem(storageKey, cSid);
          }
          if (window.sessionStorage.getItem(loadedKey) === "1") {
            isRefresh = true;
          }
          window.sessionStorage.setItem(loadedKey, "1");
        }
        clientSessionIdRef.current = cSid;

        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const meData = await meRes.json();
        if (meData.user) {
          setStudentName(meData.user.full_name);
        }

        const res = await fetch("/api/exam/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId,
            accessCode: providedCode,
            clientSessionId: cSid,
          }),
        });
        const data = await res.json();

        if (res.status === 409 && data.error === "EXAM_ALREADY_SUBMITTED") {
          router.replace("/student/submission");
          return;
        }

        if (res.status === 403 && data.error === "ACCESS_CODE_REQUIRED") {
          setNeedsAccessCode(true);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setAccessError(data.error || "Could not start examination.");
          setNeedsAccessCode(true);
          setLoading(false);
          return;
        }

        setNeedsAccessCode(false);
        setExam(data.exam);
        setAttemptId(data.attempt.id);
        setVariantCode(data.attempt.variant_code || "A");
        setTabSwitchesCount(data.attempt.tab_switches_count || 0);
        setSections(data.sections || []);

        if (isRefresh && data.attempt?.id) {
          logIntegrityEvent(
            "page_refresh",
            null,
            "Candidate refreshed or reloaded the examination browser tab.",
            data.attempt.id
          );
        }

        // Sort questions by section_order then question_order (already variant-randomized by server)
        const secOrderMap = new Map<string, number>();
        (data.sections || []).forEach((s: ExamSectionRecord) =>
          secOrderMap.set(s.id, s.section_order)
        );
        const sortedQuestions = [...(data.questions || [])].sort(
          (a: StudentQuestionDTO, b: StudentQuestionDTO) => {
            const sa = secOrderMap.get(a.section_id) ?? 1;
            const sb = secOrderMap.get(b.section_id) ?? 1;
            if (sa !== sb) return sa - sb;
            return a.question_order - b.question_order;
          }
        );
        setQuestions(sortedQuestions);

        // Hydrate saved answers from server
        const initialMap: Record<string, AnswerValue> = {};
        for (const a of data.answers || []) {
          initialMap[a.question_id] = a.answer;
        }
        setAnswersMap(initialMap);
        answersRef.current = initialMap;

        if (data.writingSubmission) {
          setWritingTopic(data.writingSubmission.topic || "");
          setEssayText(data.writingSubmission.essay_text || "");
          writingRef.current = {
            topic: data.writingSubmission.topic || "",
            essayText: data.writingSubmission.essay_text || "",
          };
        } else {
          const essayQ = sortedQuestions.find(
            (q) => q.question_type === "essay"
          );
          if (essayQ && essayQ.options?.[0]) {
            setWritingTopic(essayQ.options[0]);
            writingRef.current.topic = essayQ.options[0];
          }
        }

        // Authoritative server deadline calculation
        const serverNowMs = new Date(data.serverNow).getTime();
        const deadlineMs = new Date(data.deadlineAt).getTime();
        const clientNowMs = Date.now();
        const clockOffset = serverNowMs - clientNowMs;
        deadlineMsRef.current = deadlineMs - clockOffset;
        setRemainingSeconds(data.remainingSeconds ?? 150 * 60);

        setLastSavedTime(new Date().toLocaleTimeString());
        setSaveState("saved");
        setLoading(false);
      } catch {
        setAccessError("Network error initializing examination.");
        setLoading(false);
      }
    },
    [examId, router, logIntegrityEvent]
  );

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Flush dirty answers to server
  const flushAutosave = useCallback(
    async (forceAll = false) => {
      if (!attemptId) return;
      if (!navigator.onLine) {
        setIsOnline(false);
        setSaveState("offline_queued");
        return;
      }

      const dirtyQIds = forceAll
        ? Object.keys(answersRef.current)
        : Array.from(dirtyQuestionsRef.current);
      const shouldSaveWriting = forceAll || dirtyWritingRef.current;

      if (dirtyQIds.length === 0 && !shouldSaveWriting) return;

      setSaveState("saving");
      const payloadAnswers = dirtyQIds.map((qId) => ({
        questionId: qId,
        answer: answersRef.current[qId],
      }));

      try {
        const res = await fetch("/api/exam/autosave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            clientSessionId: clientSessionIdRef.current || undefined,
            answers: payloadAnswers.length > 0 ? payloadAnswers : undefined,
            writing: shouldSaveWriting ? writingRef.current : undefined,
          }),
        });
        const data = await res.json();
        if (res.status === 409 && data.autoSubmitted) {
          router.replace("/student/submission");
          return;
        }
        if (res.ok) {
          dirtyQIds.forEach((id) => dirtyQuestionsRef.current.delete(id));
          if (shouldSaveWriting) dirtyWritingRef.current = false;
          setSaveState("saved");
          setLastSavedTime(new Date().toLocaleTimeString());
          if (typeof data.remainingSeconds === "number") {
            setRemainingSeconds(data.remainingSeconds);
          }
        } else {
          setSaveState("unsaved");
        }
      } catch {
        setSaveState("offline_queued");
      }
    },
    [attemptId, router]
  );

  // Trigger Final Exam Submission
  const handleFinalSubmit = useCallback(
    async (isTimeout = false) => {
      if (!attemptId || isSubmitting) return;
      setIsSubmitting(true);
      try {
        const allAnswers = Object.entries(answersRef.current).map(
          ([questionId, answer]) => ({
            questionId,
            answer,
          })
        );
        const res = await fetch("/api/exam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            isTimeout,
            answers: allAnswers,
            writing: writingRef.current,
          }),
        });
        if (res.ok || res.status === 409) {
          router.replace("/student/submission");
        } else {
          setIsSubmitting(false);
        }
      } catch {
        setIsSubmitting(false);
      }
    },
    [attemptId, isSubmitting, router]
  );

  // Server-synchronized 1-second countdown timer
  useEffect(() => {
    if (!attemptId || needsAccessCode) return;
    const interval = setInterval(() => {
      if (deadlineMsRef.current) {
        const diffSec = Math.max(
          0,
          Math.floor((deadlineMsRef.current - Date.now()) / 1000)
        );
        setRemainingSeconds(diffSec);
        if (diffSec <= 0) {
          clearInterval(interval);
          handleFinalSubmit(true);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [attemptId, needsAccessCode, handleFinalSubmit]);

  // Debounced & periodic autosave (every 4 seconds if dirty)
  useEffect(() => {
    if (!attemptId) return;
    const interval = setInterval(() => {
      if (
        dirtyQuestionsRef.current.size > 0 ||
        dirtyWritingRef.current
      ) {
        flushAutosave(false);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [attemptId, flushAutosave]);

  // Network online/offline listeners with automatic recovery + integrity logging
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      flushAutosave(true);
      const dur = offlineSinceMsRef.current
        ? (Date.now() - offlineSinceMsRef.current) / 1000
        : null;
      offlineSinceMsRef.current = null;
      logIntegrityEvent(
        "network_reconnect",
        dur,
        dur !== null
          ? `Network connection restored after ${Math.round(dur)}s offline.`
          : "Network connection restored."
      );
    }
    function handleOffline() {
      setIsOnline(false);
      setSaveState("offline_queued");
      offlineSinceMsRef.current = Date.now();
      logIntegrityEvent(
        "network_disconnect",
        null,
        "Network connection interrupted during examination."
      );
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushAutosave, logIntegrityEvent]);

  // Tab Visibility Monitoring (Requirement 2: detect tab hidden/visible, record timestamps, warn student fairly)
  useEffect(() => {
    if (!attemptId || needsAccessCode) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenSinceMsRef.current = Date.now();
        logIntegrityEvent(
          "tab_hidden",
          null,
          "Candidate left the examination tab (document hidden)."
        );
      } else if (document.visibilityState === "visible") {
        const awaySec = hiddenSinceMsRef.current
          ? Math.max(1, Math.round((Date.now() - hiddenSinceMsRef.current) / 1000))
          : 1;
        hiddenSinceMsRef.current = null;
        setLastTabAwaySeconds(awaySec);
        setShowTabWarningModal(true);
        logIntegrityEvent(
          "tab_visible",
          awaySec,
          `Candidate returned to the examination tab after ${awaySec}s.`
        );
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [attemptId, needsAccessCode, logIntegrityEvent]);

  function updateAnswer(questionId: string, value: AnswerValue) {
    setAnswersMap((prev) => {
      const next = { ...prev, [questionId]: value };
      answersRef.current = next;
      return next;
    });
    dirtyQuestionsRef.current.add(questionId);
    setSaveState(isOnline ? "unsaved" : "offline_queued");
  }

  function updateEssay(topic: string, text: string) {
    setWritingTopic(topic);
    setEssayText(text);
    writingRef.current = { topic, essayText: text };
    dirtyWritingRef.current = true;
    setSaveState(isOnline ? "unsaved" : "offline_queued");
  }

  function applyEssayFormatting(tag: "bold" | "italic" | "underline" | "clear") {
    const el = essayTextareaRef.current;
    if (!el) return;
    if (tag === "clear") {
      const cleaned = essayText
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/\*/g, "");
      updateEssay(writingTopic, cleaned);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    const selected = essayText.slice(start, end);
    const wrapper = tag === "bold" ? "**" : tag === "italic" ? "*" : "__";
    const updated =
      essayText.slice(0, start) +
      `${wrapper}${selected}${wrapper}` +
      essayText.slice(end);
    updateEssay(writingTopic, updated);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-[#0f234b]">
        <Loader2 className="mr-2.5 h-6 w-6 animate-spin" />
        <span className="font-semibold">
          Initializing Secure Examination Environment...
        </span>
      </div>
    );
  }

  if (needsAccessCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f234b] text-sky-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0f234b]">
                Examination Access Code Required
              </h1>
              <p className="text-xs text-slate-500">
                Enter the code provided by Adam Ameyoud to start the timer
              </p>
            </div>
          </div>

          {accessError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {accessError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadSession(accessCodeInput);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              required
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter Access Code (e.g. B1FINAL2026)"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-mono text-base font-bold tracking-widest text-[#0f234b] uppercase focus:border-[#0f234b] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[#0f234b] py-3 text-sm font-bold text-white hover:bg-[#1e3a8a]"
            >
              Verify &amp; Start Examination
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const currentSection = sections.find(
    (s) => s.id === currentQuestion?.section_id
  );
  const isReadingOrBonus =
    currentSection?.section_order === 2 || currentSection?.section_order === 4;

  const isWarning15 = remainingSeconds <= 15 * 60 && remainingSeconds > 5 * 60;
  const isCritical5 = remainingSeconds <= 5 * 60;

  const answeredCount = questions.filter((q) =>
    isQuestionAnswered(q, answersMap[q.id], writingTopic, essayText)
  ).length;

  const wordCount = countWords(essayText);
  const charCount = essayText.length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* 1. TOP NAVIGATION BAR (Section 7) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#0f234b] text-white shadow-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Branding & Exam Title */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sky-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-tight text-white">
                  ADAM AMEYOUD
                </span>
                <span className="hidden sm:inline text-xs text-sky-300">•</span>
                <span className="hidden sm:inline text-xs font-medium text-sky-200">
                  {exam?.title}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-sky-200/90">
                <span>
                  Candidate: <strong className="text-white">{studentName}</strong>
                </span>
                <span className="rounded bg-sky-400/20 border border-sky-300/30 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">
                  Variant {variantCode}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-sky-100 hover:bg-white/20"
                  title="View Examination Integrity & Privacy Notice"
                >
                  <ShieldCheck className="h-3 w-3 text-emerald-300" />
                  <span>Integrity &amp; Privacy Policy</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Status Cluster: Network, Autosave, Countdown Timer, Submit */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            {/* Network Status */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                isOnline
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25"
                  : "bg-red-500/20 text-red-200 border border-red-400/30"
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Offline (Auto-Recovery Active)</span>
                </>
              )}
            </div>

            {/* Autosave Status */}
            <button
              type="button"
              onClick={() => flushAutosave(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-sky-100 hover:bg-white/15"
              title="Click to force save now"
            >
              <Save className="h-3.5 w-3.5 text-sky-300" />
              <span>
                {saveState === "saving"
                  ? "Saving..."
                  : saveState === "saved"
                  ? `Saved ${lastSavedTime}`
                  : saveState === "offline_queued"
                  ? "Queued for Sync"
                  : "Saving changes..."}
              </span>
            </button>

            {/* Authoritative Server Timer */}
            <div
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-sm sm:text-base font-bold tracking-wider border ${
                isCritical5
                  ? "bg-red-600 text-white border-red-400 animate-pulse"
                  : isWarning15
                  ? "bg-amber-500 text-slate-950 border-amber-300"
                  : "bg-[#152d5e] text-white border-sky-400/30"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{formatRemainingTime(remainingSeconds)}</span>
            </div>

            {/* Submit Exam Button */}
            <button
              type="button"
              onClick={() => {
                flushAutosave(true);
                setShowConfirmSubmit(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-emerald-500"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit Exam</span>
            </button>
          </div>
        </div>

        {/* 15-Minute and 5-Minute Timer Warnings */}
        {(isWarning15 || isCritical5) && (
          <div
            className={`px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 ${
              isCritical5
                ? "bg-red-700 text-white"
                : "bg-amber-400 text-slate-950"
            }`}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {isCritical5
                ? "CRITICAL TIME WARNING: Less than 5 minutes remaining! Your examination will be automatically submitted when the timer reaches 00:00:00."
                : "TIME NOTICE: Less than 15 minutes remaining. Please review your answers across all sections."}
            </span>
          </div>
        )}
      </header>

      {/* MAIN WORKSPACE: LEFT NAVIGATION + QUESTION AREA */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        {/* 2. LEFT NAVIGATION PANEL (Section 7) */}
        <aside className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-4 sm:p-5 overflow-y-auto lg:max-h-[calc(100vh-64px)] lg:sticky lg:top-16">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0f234b]">
              Examination Sections
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {answeredCount} / {questions.length} Answered
            </span>
          </div>

          <div className="space-y-5">
            {sections.map((sec) => {
              const secQuestions = questions.filter(
                (q) => q.section_id === sec.id
              );
              const isCurrentSec = currentQuestion?.section_id === sec.id;

              return (
                <div
                  key={sec.id}
                  className={`rounded-xl border p-3.5 transition ${
                    isCurrentSec
                      ? "border-[#0f234b] bg-slate-50/90"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const firstQIdx = questions.findIndex(
                        (q) => q.section_id === sec.id
                      );
                      if (firstQIdx >= 0) setCurrentIdx(firstQIdx);
                    }}
                    className="w-full text-left flex items-center justify-between"
                  >
                    <span className="text-xs sm:text-sm font-bold text-[#0f234b]">
                      {sec.title}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {sec.max_marks} pts
                    </span>
                  </button>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {secQuestions.map((q) => {
                      const globalIdx = questions.findIndex(
                        (item) => item.id === q.id
                      );
                      const isCurrent = globalIdx === currentIdx;
                      const answered = isQuestionAnswered(
                        q,
                        answersMap[q.id],
                        writingTopic,
                        essayText
                      );

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentIdx(globalIdx)}
                          className={`h-8 min-w-[2rem] px-2 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                            isCurrent
                              ? "bg-[#0f234b] text-white ring-2 ring-sky-400 ring-offset-1"
                              : answered
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title={`${sec.title} — Question ${q.question_order} (${
                            answered ? "Answered" : "Unanswered"
                          })`}
                        >
                          {q.question_type === "essay"
                            ? "Essay"
                            : q.question_type === "bonus_words"
                            ? "Bonus"
                            : q.question_order}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Legend */}
          <div className="mt-6 border-t border-slate-100 pt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-[#0f234b] inline-block" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-emerald-100 border border-emerald-300 inline-block" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-slate-100 border border-slate-200 inline-block" />
              <span>Unanswered</span>
            </div>
          </div>
        </aside>

        {/* 3. MAIN EXAMINATION AREA (Section 7) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
          {/* Reading Passage Panel (Displayed in Part Two & Bonus Question) */}
          {isReadingOrBonus && exam?.reading_passage_text && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between bg-[#152d5e] px-5 py-3.5 text-white">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-300" />
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
                    Reading Passage:{" "}
                    <strong className="text-white">
                      {exam.reading_passage_title || "THE PRICE OF CONVENIENCE"}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReadingPassage(!showReadingPassage)}
                  className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  {showReadingPassage ? "Collapse Passage" : "Expand Passage"}
                </button>
              </div>

              {showReadingPassage && (
                <div className="p-6 sm:p-7 bg-slate-50/60 max-h-96 overflow-y-auto space-y-4 text-sm sm:text-base text-slate-800 leading-relaxed border-t border-slate-200">
                  {exam.reading_passage_text
                    .split("\n\n")
                    .map((para, index) => (
                      <p key={index} className="text-justify">
                        <span className="mr-2 rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                          ¶{index + 1}
                        </span>
                        {para}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Question Card */}
          {currentQuestion && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              {/* Section & Exercise Header */}
              <div className="border-b border-slate-100 pb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                    {currentSection?.title}
                  </span>
                  <h2 className="mt-1 text-lg sm:text-xl font-bold text-[#0f234b]">
                    {currentQuestion.exercise_title}
                  </h2>
                  {currentQuestion.exercise_instructions && (
                    <p className="mt-1 text-xs sm:text-sm text-slate-600">
                      {currentQuestion.exercise_instructions}
                    </p>
                  )}
                </div>
                <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#0f234b]">
                  {currentQuestion.marks}{" "}
                  {currentQuestion.marks === 1 ? "Mark" : "Marks"}
                </span>
              </div>

              {/* Question Text & Prompt Keyword */}
              <div className="space-y-3">
                <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                  {formatQuestionDisplayText(
                    currentQuestion,
                    currentQuestion.question_order
                  )}
                </div>

                {currentQuestion.prompt_keyword && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-[#0f234b]">
                    <span className="text-slate-500 font-medium">
                      Required Keyword / Verb:
                    </span>
                    <span className="font-mono text-sm tracking-wider uppercase text-sky-900">
                      {currentQuestion.prompt_keyword}
                    </span>
                  </div>
                )}
              </div>

              {/* Answer Input Area by Question Type */}
              <div className="pt-2">
                {/* 1. Single Choice (Options randomized per candidate variant) */}
                {currentQuestion.question_type === "single_choice" && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const selected =
                        answersMap[currentQuestion.id] === opt;
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-3.5 rounded-xl border p-4 cursor-pointer transition ${
                            selected
                              ? "border-[#0f234b] bg-sky-50/70 ring-1 ring-[#0f234b]"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${currentQuestion.id}`}
                            checked={selected}
                            onChange={() =>
                              updateAnswer(currentQuestion.id, opt)
                            }
                            className="h-4 w-4 text-[#0f234b] focus:ring-[#0f234b]"
                          />
                          <span className="text-sm sm:text-base font-medium text-slate-800">
                            {formatOptionDisplayLabel(opt, optIdx)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 2. Multiple Choice (Options randomized per candidate variant) */}
                {currentQuestion.question_type === "multiple_choice" && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const currentArr = Array.isArray(
                        answersMap[currentQuestion.id]
                      )
                        ? (answersMap[currentQuestion.id] as string[])
                        : [];
                      const checked = currentArr.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-3.5 rounded-xl border p-4 cursor-pointer transition ${
                            checked
                              ? "border-[#0f234b] bg-sky-50/70"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...currentArr, opt]
                                : currentArr.filter((i) => i !== opt);
                              updateAnswer(currentQuestion.id, next);
                            }}
                            className="h-4 w-4 rounded text-[#0f234b]"
                          />
                          <span className="text-sm sm:text-base font-medium text-slate-800">
                            {formatOptionDisplayLabel(opt, optIdx)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 3, 4, 5, 6. Short Text, Sentence Transformation, Error Correction, Fill in the Gap */}
                {(currentQuestion.question_type === "short_text" ||
                  currentQuestion.question_type === "sentence_transformation" ||
                  currentQuestion.question_type === "error_correction" ||
                  currentQuestion.question_type === "fill_in_the_gap") && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Your Answer
                    </label>
                    <input
                      type="text"
                      value={
                        typeof answersMap[currentQuestion.id] === "string"
                          ? (answersMap[currentQuestion.id] as string)
                          : ""
                      }
                      onChange={(e) =>
                        updateAnswer(currentQuestion.id, e.target.value)
                      }
                      placeholder={
                        currentQuestion.question_type ===
                        "sentence_transformation"
                          ? `Write the complete transformed sentence using "${currentQuestion.prompt_keyword}"...`
                          : currentQuestion.question_type === "error_correction"
                          ? "Write the complete corrected sentence..."
                          : "Type your answer here..."
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm sm:text-base text-slate-900 focus:border-[#0f234b] focus:outline-none focus:ring-2 focus:ring-[#0f234b]/15"
                    />
                  </div>
                )}

                {/* 7. True / False with Justification */}
                {currentQuestion.question_type === "true_false" && (
                  <div className="space-y-4">
                    {(() => {
                      const tfVal: TrueFalseAnswerValue =
                        typeof answersMap[currentQuestion.id] === "object" &&
                        answersMap[currentQuestion.id] !== null &&
                        !Array.isArray(answersMap[currentQuestion.id]) &&
                        "choice" in (answersMap[currentQuestion.id] as object)
                          ? (answersMap[
                              currentQuestion.id
                            ] as TrueFalseAnswerValue)
                          : { choice: "", justification: "" };

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-4 max-w-md">
                            {(["True", "False"] as const).map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() =>
                                  updateAnswer(currentQuestion.id, {
                                    ...tfVal,
                                    choice: option,
                                  })
                                }
                                className={`rounded-xl border py-3 px-4 text-sm font-bold transition ${
                                  tfVal.choice === option
                                    ? "border-[#0f234b] bg-[#0f234b] text-white"
                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                              Justification from the passage *
                            </label>
                            <textarea
                              rows={3}
                              value={tfVal.justification}
                              onChange={(e) =>
                                updateAnswer(currentQuestion.id, {
                                  ...tfVal,
                                  justification: e.target.value,
                                })
                              }
                              placeholder="Justify your True/False choice using evidence from the passage..."
                              className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm sm:text-base text-slate-900 focus:border-[#0f234b] focus:outline-none focus:ring-2 focus:ring-[#0f234b]/15"
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* 8. Reading Comprehension Open Answer */}
                {currentQuestion.question_type === "reading_comprehension" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Your Written Response
                    </label>
                    <textarea
                      rows={4}
                      value={
                        typeof answersMap[currentQuestion.id] === "string"
                          ? (answersMap[currentQuestion.id] as string)
                          : ""
                      }
                      onChange={(e) =>
                        updateAnswer(currentQuestion.id, e.target.value)
                      }
                      placeholder="Write a clear, complete answer based on the passage..."
                      className="w-full rounded-xl border border-slate-300 bg-white p-4 text-sm sm:text-base text-slate-900 focus:border-[#0f234b] focus:outline-none focus:ring-2 focus:ring-[#0f234b]/15"
                    />
                  </div>
                )}

                {/* 9. Long-Form Essay Writing (Part Three) */}
                {currentQuestion.question_type === "essay" && (
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#0f234b]">
                        Step 1: Select ONE Essay Topic
                      </label>
                      {currentQuestion.options.map((topicOpt, idx) => {
                        const isSelected = writingTopic === topicOpt;
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-3.5 rounded-xl border p-4 cursor-pointer transition ${
                              isSelected
                                ? "border-[#0f234b] bg-sky-50/70 ring-1 ring-[#0f234b]"
                                : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="essay-topic"
                              checked={isSelected}
                              onChange={() => updateEssay(topicOpt, essayText)}
                              className="mt-1 h-4 w-4 text-[#0f234b]"
                            />
                            <span className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                              {topicOpt}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Rich Text Editor & Live Word Counter */}
                    <div className="rounded-xl border border-slate-300 bg-white overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => applyEssayFormatting("bold")}
                            className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
                            title="Bold"
                          >
                            <Bold className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyEssayFormatting("italic")}
                            className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
                            title="Italic"
                          >
                            <Italic className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyEssayFormatting("underline")}
                            className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
                            title="Underline"
                          >
                            <Underline className="h-4 w-4" />
                          </button>
                          <div className="h-4 w-px bg-slate-300 mx-1" />
                          <button
                            type="button"
                            onClick={() => applyEssayFormatting("clear")}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                            title="Clear formatting"
                          >
                            <Eraser className="h-3.5 w-3.5" />
                            <span>Clear Formatting</span>
                          </button>
                        </div>

                        {/* Live Word & Character Counter + Word-Count Warning */}
                        <div className="flex items-center gap-3 text-xs">
                          <span
                            className={`rounded-md px-2.5 py-1 font-bold ${
                              wordCount >= 180 && wordCount <= 220
                                ? "bg-emerald-100 text-emerald-800"
                                : wordCount > 220
                                ? "bg-amber-100 text-amber-900"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            Words: {wordCount} / 180–220
                          </span>
                          <span className="text-slate-500">
                            Characters: {charCount}
                          </span>
                        </div>
                      </div>

                      <textarea
                        ref={essayTextareaRef}
                        rows={14}
                        value={essayText}
                        onChange={(e) =>
                          updateEssay(writingTopic, e.target.value)
                        }
                        placeholder="Compose your essay here (180–220 words). Your work is saved automatically as you type..."
                        className="w-full p-5 text-sm sm:text-base text-slate-900 leading-relaxed focus:outline-none resize-y"
                      />

                      {/* Word Limit Warning Footer */}
                      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center justify-between text-xs">
                        {wordCount === 0 ? (
                          <span className="text-slate-500">
                            Target length: 180 to 220 words.
                          </span>
                        ) : wordCount < 180 ? (
                          <span className="text-amber-700 font-medium">
                            Word-count notice: Your essay is currently{" "}
                            {180 - wordCount} words below the 180-word minimum
                            guideline.
                          </span>
                        ) : wordCount > 220 ? (
                          <span className="text-amber-700 font-medium">
                            Word-count warning: Your essay exceeds the 220-word
                            guideline by {wordCount - 220} words. (Your work
                            will never be truncated or deleted).
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ideal word count achieved (180–220 words).
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 10. Bonus Question: Words for the Teacher */}
                {currentQuestion.question_type === "bonus_words" && (
                  <div className="space-y-5">
                    {(() => {
                      const bwVal: BonusWordsAnswerValue =
                        typeof answersMap[currentQuestion.id] === "object" &&
                        answersMap[currentQuestion.id] !== null &&
                        !Array.isArray(answersMap[currentQuestion.id]) &&
                        "word1" in (answersMap[currentQuestion.id] as object)
                          ? (answersMap[
                              currentQuestion.id
                            ] as BonusWordsAnswerValue)
                          : {
                              word1: "",
                              meaning1: "",
                              word2: "",
                              meaning2: "",
                            };

                      return (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-[#0f234b]">
                              First Selected Word (1 Mark)
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Word 1 from Passage:
                              </label>
                              <input
                                type="text"
                                value={bwVal.word1}
                                onChange={(e) =>
                                  updateAnswer(currentQuestion.id, {
                                    ...bwVal,
                                    word1: e.target.value,
                                  })
                                }
                                placeholder="e.g. Paradoxically"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0f234b] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Meaning &amp; Importance in Your Own Words:
                              </label>
                              <textarea
                                rows={3}
                                value={bwVal.meaning1}
                                onChange={(e) =>
                                  updateAnswer(currentQuestion.id, {
                                    ...bwVal,
                                    meaning1: e.target.value,
                                  })
                                }
                                placeholder="Explain its meaning and why it is central to the passage..."
                                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-[#0f234b] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-[#0f234b]">
                              Second Selected Word (1 Mark)
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Word 2 from Passage:
                              </label>
                              <input
                                type="text"
                                value={bwVal.word2}
                                onChange={(e) =>
                                  updateAnswer(currentQuestion.id, {
                                    ...bwVal,
                                    word2: e.target.value,
                                  })
                                }
                                placeholder="e.g. Preserve"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0f234b] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Meaning &amp; Importance in Your Own Words:
                              </label>
                              <textarea
                                rows={3}
                                value={bwVal.meaning2}
                                onChange={(e) =>
                                  updateAnswer(currentQuestion.id, {
                                    ...bwVal,
                                    meaning2: e.target.value,
                                  })
                                }
                                placeholder="Explain its meaning and why it is central to the passage..."
                                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-[#0f234b] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Bottom Navigation: Previous / Next / Submit */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-medium text-slate-500">
                  Item {currentIdx + 1} of {questions.length}
                </span>

                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e3a8a]"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      flushAutosave(true);
                      setShowConfirmSubmit(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    <Send className="h-4 w-4" />
                    <span>Review &amp; Submit Examination</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Dialog Modal for Final Submission */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Confirm Examination Submission
                </h3>
                <p className="text-xs text-slate-500">
                  This action will permanently lock your examination attempt.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-700 space-y-2">
              <div className="flex justify-between">
                <span>Questions Answered:</span>
                <strong className="text-[#0f234b]">
                  {answeredCount} of {questions.length}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Essay Word Count:</span>
                <strong className="text-[#0f234b]">{wordCount} words</strong>
              </div>
              <div className="flex justify-between">
                <span>Remaining Time:</span>
                <strong className="font-mono text-[#0f234b]">
                  {formatRemainingTime(remainingSeconds)}
                </strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Once submitted, you will not be able to change your answers. Your
              results will become available once your teacher authorizes their
              publication.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmSubmit(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Reviewing
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm &amp; Submit Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Visibility Monitoring Warning Modal (Requirement 2 & 7: Clear, Fair Warning) */}
      {showTabWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 sm:p-7 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <EyeOff className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Examination Tab Focus Notice
                </h3>
                <p className="text-xs text-slate-500">
                  Tab visibility change recorded ({tabSwitchesCount}{" "}
                  {tabSwitchesCount === 1 ? "switch" : "switches"})
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs sm:text-sm text-amber-950 space-y-2 leading-relaxed">
              <p>
                You left the examination tab for{" "}
                <strong>{lastTabAwaySeconds} seconds</strong>. Please remain on
                this examination tab until you submit your work.
              </p>
              <p className="text-xs text-amber-900">
                <strong>Fairness Assurance:</strong> Leaving and returning timestamps
                are logged for your teacher&apos;s review, but your examination is{" "}
                <strong>never automatically failed or penalized</strong> by browser
                events.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowTabWarningModal(false)}
                className="rounded-xl bg-[#0f234b] px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#1e3a8a]"
              >
                I Understand — Return to Examination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Examination Integrity Policy Modal (Requirement 7) */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f234b] text-sky-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0f234b]">
                  Examination Integrity &amp; Privacy Disclosure
                </h3>
                <p className="text-xs text-slate-500">
                  Assigned Paper: Variant {variantCode} • Transparent Activity Logging
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="font-bold text-[#0f234b] flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-sky-600" />
                  <span>What Activity Is Logged During Your Exam:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                  <li>
                    <strong>Tab Visibility Changes:</strong> Server timestamps when
                    the examination tab becomes hidden and when you return.
                  </li>
                  <li>
                    <strong>Page Refreshes &amp; Connectivity:</strong> Browser
                    reload events and temporary network disconnections/reconnections.
                  </li>
                  <li>
                    <strong>Session Continuity:</strong> Detection of simultaneous
                    sessions or browser changes on the same account.
                  </li>
                  <li>
                    <strong>Answer Originality Review:</strong> Post-submission
                    comparison of essays and answer patterns for unusual similarity.
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                <div className="font-bold text-emerald-950">
                  Your Privacy &amp; Fairness Guarantees:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-emerald-900">
                  <li>
                    <strong>No Webcam or Microphone Access:</strong> This platform
                    never activates or accesses your camera, microphone, or personal
                    files.
                  </li>
                  <li>
                    <strong>No Automatic Penalties:</strong> Browser events (such as
                    accidental tab switches or Wi-Fi drops) never automatically fail
                    or deduct marks from your examination.
                  </li>
                  <li>
                    <strong>Teacher Review &amp; Oral Verification:</strong> All
                    integrity logs are reviewed personally by Mr. Adam Ameyoud, who
                    may optionally request a brief post-examination oral verification
                    separately from your written score.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPrivacyModal(false);
                  logIntegrityEvent(
                    "privacy_acknowledged",
                    null,
                    "Candidate viewed and acknowledged the Integrity & Privacy Disclosure."
                  );
                }}
                className="rounded-xl bg-[#0f234b] px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#1e3a8a]"
              >
                Close &amp; Continue Examination
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
