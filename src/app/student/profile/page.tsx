import React from "react";
import { requireStudent } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { StudentShell } from "@/components/StudentShell";
import { User, Mail, Hash, Users, ShieldCheck, Calendar } from "lucide-react";

export default async function StudentProfilePage() {
  const user = await requireStudent();
  const db = readDb();
  const student = db.students.find((s) => s.id === user.student_id);
  const attempts = db.exam_attempts.filter(
    (a) => a.student_id === user.student_id
  );

  return (
    <StudentShell user={user}>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f234b]">
            Candidate Profile
          </h1>
          <p className="text-sm text-slate-600">
            Your registered identity on the Adam Ameyoud — English Language
            Assessment platform
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f234b] text-xl font-bold text-white">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {user.full_name}
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Active Examination Candidate
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <User className="h-4 w-4 text-[#0f234b]" />
                Full Name
              </div>
              <div className="mt-1.5 text-sm font-bold text-slate-900">
                {user.full_name}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Hash className="h-4 w-4 text-[#0f234b]" />
                Student ID
              </div>
              <div className="mt-1.5 text-sm font-bold font-mono text-slate-900">
                {user.student_number}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Mail className="h-4 w-4 text-[#0f234b]" />
                Email Address
              </div>
              <div className="mt-1.5 text-sm font-bold text-slate-900">
                {user.email}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Users className="h-4 w-4 text-[#0f234b]" />
                Assigned Group
              </div>
              <div className="mt-1.5 text-sm font-bold text-slate-900">
                {user.group_name}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Calendar className="h-4 w-4 text-[#0f234b]" />
                Examination Sessions Recorded
              </div>
              <div className="mt-1.5 text-sm font-semibold text-slate-900">
                {attempts.length} attempt(s) • Registered on{" "}
                {student?.created_at
                  ? new Date(student.created_at).toLocaleDateString()
                  : "2026"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
