"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { TeacherShell } from "@/components/TeacherShell";
import { downloadCSV } from "@/lib/export-utils";
import {
  UserPlus,
  Upload,
  Download,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface StudentRow {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  student_number: string;
  group_name: string;
  is_active: boolean;
  attempts_count: number;
  latest_attempt: {
    id: string;
    status: string;
    score: number;
    final_total: number;
    results_status: string;
  } | null;
}

export default function TeacherStudentsPage() {
  const [user, setUser] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  // Add/Edit Student modal
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [groupName, setGroupName] = useState("Group B1-A");
  const [password, setPassword] = useState("Student@2026!");

  // Delete confirmation modal
  const [deletingStudent, setDeletingStudent] = useState<StudentRow | null>(
    null
  );

  async function refreshStudents() {
    const res = await fetch("/api/teacher/overview");
    if (res.ok) {
      const data = await res.json();
      setStudents(data.students || []);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/teacher/overview").then((r) => r.json()),
    ]).then(([meRes, ovRes]) => {
      if (meRes.user) setUser(meRes.user);
      setStudents(ovRes.students || []);
      setLoading(false);
    });
  }, []);

  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/teacher/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingStudent
          ? {
              action: "update",
              studentId: editingStudent.id,
              full_name: fullName,
              email,
              student_number: studentNumber,
              group_name: groupName,
              password: password || undefined,
            }
          : {
              action: "create",
              full_name: fullName,
              email,
              student_number: studentNumber || undefined,
              group_name: groupName,
              password,
            }
      ),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not save student.");
      return;
    }
    setShowModal(false);
    setEditingStudent(null);
    setToast(
      editingStudent
        ? "Student account updated."
        : "Student account created successfully."
    );
    await refreshStudents();
    setTimeout(() => setToast(""), 3500);
  }

  async function handleConfirmDelete() {
    if (!deletingStudent) return;
    const res = await fetch("/api/teacher/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        studentId: deletingStudent.id,
      }),
    });
    if (res.ok) {
      setDeletingStudent(null);
      setToast("Student account removed.");
      await refreshStudents();
      setTimeout(() => setToast(""), 3500);
    }
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const res = await fetch("/api/teacher/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bulk_import",
            students: results.data,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setToast(
            `CSV Import complete: ${data.importedCount} student(s) imported.`
          );
          await refreshStudents();
          setTimeout(() => setToast(""), 4000);
        } else {
          setError(data.error || "CSV import failed.");
        }
      },
    });
    e.target.value = "";
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0f234b]" />
      </div>
    );
  }

  const groups = Array.from(new Set(students.map((s) => s.group_name)));
  const filtered = students.filter((st) => {
    const matchesGroup =
      groupFilter === "ALL" || st.group_name === groupFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      st.full_name.toLowerCase().includes(q) ||
      st.student_number.toLowerCase().includes(q) ||
      st.email.toLowerCase().includes(q);
    return matchesGroup && matchesSearch;
  });

  return (
    <TeacherShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0f234b]">
              Student Management
            </h1>
            <p className="text-sm text-slate-600">
              Manage candidate accounts, groups, CSV imports, and examination
              histories
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
              <Upload className="h-4 w-4 text-sky-600" />
              <span>Import CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  "Adam_Ameyoud_Student_List.csv",
                  filtered.map((s) => ({
                    Full_Name: s.full_name,
                    Student_ID: s.student_number,
                    Email: s.email,
                    Group: s.group_name,
                    Attempts: s.attempts_count,
                    Latest_Status: s.latest_attempt?.status || "Not Started",
                  }))
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-slate-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingStudent(null);
                setFullName("");
                setEmail("");
                setStudentNumber("");
                setGroupName("Group B1-A");
                setPassword("Student@2026!");
                setError("");
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f234b] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1e3a8a]"
            >
              <UserPlus className="h-4 w-4 text-sky-300" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {toast && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
        )}

        {/* Search & Group Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, Student ID, or email..."
              className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-700"
          >
            <option value="ALL">All Groups ({students.length})</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Students Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Student Name</th>
                  <th className="px-4 py-3.5">Student ID</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Group</th>
                  <th className="px-4 py-3.5">Exam History</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {st.full_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-[#0f234b]">
                      {st.student_number}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{st.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {st.group_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {st.latest_attempt ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            {st.latest_attempt.status}
                          </span>
                          <Link
                            href={`/teacher/submissions/${st.latest_attempt.id}`}
                            className="text-xs font-bold text-[#0f234b] hover:underline"
                          >
                            View ({st.latest_attempt.final_total}/102)
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Not started
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudent(st);
                          setFullName(st.full_name);
                          setEmail(st.email);
                          setStudentNumber(st.student_number);
                          setGroupName(st.group_name);
                          setPassword("");
                          setError("");
                          setShowModal(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingStudent(st)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Student Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <form
              onSubmit={handleSaveStudent}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
            >
              <h3 className="text-lg font-bold text-[#0f234b]">
                {editingStudent ? "Edit Student Account" : "Add New Student"}
              </h3>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="Auto if blank"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Group
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {editingStudent
                    ? "New Password (leave blank to keep current)"
                    : "Initial Password *"}
                </label>
                <input
                  type="text"
                  required={!editingStudent}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0f234b] px-4 py-2 text-xs font-bold text-white"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deletingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Confirm Student Deletion
                </h3>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete{" "}
                <strong>{deletingStudent.full_name}</strong> (
                {deletingStudent.student_number})? This will also remove their
                recorded attempts.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingStudent(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
