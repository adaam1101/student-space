import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adam Ameyoud — English Language Assessment",
  description:
    "Professional Online Examination Platform for English Language Assessment (A1, A2, B1, B2, C1) by Adam Ameyoud.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased selection:bg-[#1e3a8a] selection:text-white">
        {children}
      </body>
    </html>
  );
}
