import React from "react";
import { requireStudent } from "@/lib/auth";

export default async function StudentRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudent();
  return <>{children}</>;
}
