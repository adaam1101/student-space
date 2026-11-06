"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherShell } from "@/components/TeacherShell";
import { CEFRLevel } from "@/lib/types";
import { PlusCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TeacherCreateExamPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [level, setLevel] = useState<CEFRLevel>("B2");
  const [code, setCode] = useState("B2-FINAL-2026");
  const [accessCode, setAccessCode] = useState("B2FINAL2026");
  const [durationMinutes, setDurationMinutes] = useState(150);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [description, setDescription] = useState("");
  const [readingTitle, setReadingTitle] = useState("");
  const [readingText, setReadingText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/teacher/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title,
          subtitle,
          level,
          code,
          access_code: accessCode,
          duration_minutes: durationMinutes,
          max_attempts: maxAttempts,
          description,
          reading_passage_title: readingTitle,
          reading_passage_text: readingText,
          status: "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create examination.");
        setSaving(false);
        return;
      }
      router.push(`/teacher/exams/${data.exam.id}`);
    } catch {
      setError("Network error creating examination.");
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0f234b]" />
      </div>
    );
  }

  return (
    <TeacherShell user={user}>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0f234b]">
              Create New Examination
            </h1>
            <p className="text-sm text-slate-600">
              Configure a new CEFR A1, A2, B1, B2, or C1 examination for Adam
              Ameyoud
            </p>
          </div>
          <Link
            href="/teacher/exams"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Exams</span>
          </Link>
        </div>

        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Examination Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. B2 – FINAL ENGLISH EXAMINATION"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                CEFR Level *
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CEFRLevel)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
              >
                <option value="A1">A1 — Beginner</option>
                <option value="A2">A2 — Elementary</option>
                <option value="B1">B1 — Intermediate</option>
                <option value="B2">B2 — Upper-Intermediate</option>
                <option value="C1">C1 — Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Subtitle / Level Note
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Upper-Intermediate Academic Assessment"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Internal Reference Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Access Code *
              </label>
              <input
                type="text"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono font-bold text-[#0f234b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                required
                min={15}
                max={360}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Maximum Attempts *
              </label>
              <input
                type="number"
                required
                min={1}
                max={5}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview of examination sections and instructions..."
              className="w-full rounded-lg border border-slate-300 p-3.5 text-sm"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h2 className="text-sm font-bold text-[#0f234b]">
              Reading Comprehension Passage (Optional)
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Passage Title
              </label>
              <input
                type="text"
                value={readingTitle}
                onChange={(e) => setReadingTitle(e.target.value)}
                placeholder="e.g. THE FUTURE OF HUMAN COMMUNICATION"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Passage Text (Separate paragraphs with a blank line)
              </label>
              <textarea
                rows={6}
                value={readingText}
                onChange={(e) => setReadingText(e.target.value)}
                placeholder="Paste the reading passage here..."
                className="w-full rounded-lg border border-slate-300 p-3.5 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1e3a8a]"
            >
              <PlusCircle className="h-4 w-4 text-sky-300" />
              <span>
                {saving ? "Creating Examination..." : "Create Examination"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </TeacherShell>
  );
}
