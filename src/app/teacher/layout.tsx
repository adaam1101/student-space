import React from "react";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTeacher();
  return <>{children}</>;
}
