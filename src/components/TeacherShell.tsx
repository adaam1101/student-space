"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  Users,
  ClipboardCheck,
  PenTool,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Settings,
  LogOut,
  PlusCircle,
  Menu,
  X,
} from "lucide-react";

interface TeacherShellProps {
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  children: React.ReactNode;
}

const teacherNav = [
  {
    href: "/teacher/dashboard",
    label: "Overview Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/teacher/exams",
    label: "Examinations",
    icon: FileText,
  },
  {
    href: "/teacher/exams/create",
    label: "Create Examination",
    icon: PlusCircle,
  },
  {
    href: "/teacher/students",
    label: "Students & CSV",
    icon: Users,
  },
  {
    href: "/teacher/submissions",
    label: "Submissions",
    icon: ClipboardCheck,
  },
  {
    href: "/teacher/grading",
    label: "Manual Grading & Rubric",
    icon: PenTool,
  },
  {
    href: "/teacher/results",
    label: "Results Publication",
    icon: ShieldCheck,
  },
  {
    href: "/teacher/integrity",
    label: "Integrity & Verification",
    icon: ShieldAlert,
  },
  {
    href: "/teacher/analytics",
    label: "Analytics & Exports",
    icon: BarChart3,
  },
  {
    href: "/teacher/settings",
    label: "Platform Settings",
    icon: Settings,
  },
];

export function TeacherShell({ user, children }: TeacherShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-68 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0f234b] text-white shadow-xl">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white">
              ADAM AMEYOUD
            </div>
            <div className="text-xs text-sky-200 font-medium">
              English Language Assessment
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-white/10 bg-[#152d5e]/60">
          <div className="text-[11px] uppercase tracking-wider text-sky-300 font-semibold">
            Examiner Console
          </div>
          <div className="text-sm font-semibold text-white truncate mt-0.5">
            {user.full_name}
          </div>
          <div className="text-xs text-sky-200/80 truncate">{user.email}</div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {teacherNav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/teacher/dashboard" &&
                item.href !== "/teacher/exams" &&
                pathname.startsWith(item.href)) ||
              (item.href === "/teacher/exams" &&
                pathname === "/teacher/exams");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-[#0f234b] font-semibold shadow-xs"
                    : "text-sky-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    active ? "text-[#0f234b]" : "text-sky-300"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <LogOut className="h-4 w-4 text-sky-300" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-68 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
              aria-label="Toggle Menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <div>
              <span className="block text-sm font-bold text-[#0f234b]">
                ADAM AMEYOUD
              </span>
              <span className="block text-[11px] text-slate-500">
                Examiner Console
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            Sign Out
          </button>
        </header>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden">
            <div className="w-72 bg-[#0f234b] h-full p-4 text-white flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="font-bold">ADAM AMEYOUD</span>
                <button onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 py-4 overflow-y-auto">
                {teacherNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sky-100 hover:bg-white/10"
                    >
                      <Icon className="h-4 w-4 text-sky-300" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
