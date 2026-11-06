"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  FileSpreadsheet,
  Award,
  User,
  KeyRound,
  LogOut,
  CheckCircle2,
} from "lucide-react";

interface StudentShellProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    student_number?: string;
    group_name?: string;
  };
  children: React.ReactNode;
}

const navItems = [
  {
    href: "/student/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/student/exams",
    label: "Examinations",
    icon: FileSpreadsheet,
  },
  {
    href: "/exam-access",
    label: "Enter Access Code",
    icon: KeyRound,
  },
  {
    href: "/student/submission",
    label: "Submissions",
    icon: CheckCircle2,
  },
  {
    href: "/student/results",
    label: "Published Results",
    icon: Award,
  },
  {
    href: "/student/profile",
    label: "Candidate Profile",
    icon: User,
  },
];

export function StudentShell({ user, children }: StudentShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#0f234b] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/student/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sky-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight text-white">
                  ADAM AMEYOUD
                </div>
                <div className="text-[11px] font-medium text-sky-200">
                  English Language Assessment — Candidate Portal
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-white">
                {user.full_name}
              </div>
              <div className="text-xs text-sky-200">
                {user.student_number || "Candidate"} •{" "}
                {user.group_name || "Group B1"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Secondary Horizontal Navigation */}
        <div className="border-t border-white/10 bg-[#152d5e]">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6 lg:px-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/student/dashboard" &&
                  pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-xs sm:text-sm font-medium transition ${
                    active
                      ? "bg-white text-[#0f234b] shadow-xs font-semibold"
                      : "text-sky-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Adam Ameyoud — English Language Assessment • Secure Online Examination
        Environment
      </footer>
    </div>
  );
}
