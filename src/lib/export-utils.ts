// ============================================================================
// ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT
// CSV, Excel-Compatible CSV & Professional PDF Export Utilities
// ============================================================================

import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadCSV(
  filename: string,
  rows: Record<string, unknown>[],
  excelCompatible = true
) {
  const csvString = Papa.unparse(rows);
  // Prepend UTF-8 BOM for Microsoft Excel compatibility
  const content = excelCompatible ? `\uFEFF${csvString}` : csvString;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface StudentResultPDFData {
  examTitle: string;
  examSubtitle?: string;
  studentName: string;
  studentNumber: string;
  groupName: string;
  submittedAt: string | null;
  grammarScore: number;
  readingScore: number;
  writingScore: number;
  regularTotal: number;
  bonusScore: number;
  finalTotal: number;
  teacherComments?: string | null;
}

export function generateStudentResultPDF(data: StudentResultPDFData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Top Navy Branding Header Bar
  doc.setFillColor(15, 35, 75); // Deep Navy (#0f234b)
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("ADAM AMEYOUD", 18, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(186, 214, 255);
  doc.text("English Language Assessment — Official Results Transcript", 18, 26);

  // Exam Title Banner
  doc.setFillColor(244, 247, 252);
  doc.setDrawColor(210, 220, 235);
  doc.roundedRect(18, 46, 174, 22, 2, 2, "FD");

  doc.setTextColor(15, 35, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.examTitle, 24, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(80, 95, 120);
  doc.text(
    data.examSubtitle || "Comprehensive English Proficiency Assessment",
    24,
    63
  );

  // Student Details Section
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("CANDIDATE INFORMATION", 18, 79);

  autoTable(doc, {
    startY: 82,
    margin: { left: 18, right: 18 },
    theme: "grid",
    styles: {
      fontSize: 9.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: [215, 224, 235],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 35, 75],
      fontStyle: "bold",
    },
    body: [
      [
        "Student Name",
        data.studentName,
        "Student ID",
        data.studentNumber || "N/A",
      ],
      [
        "Assigned Group",
        data.groupName || "Group B1",
        "Submission Date",
        data.submittedAt
          ? new Date(data.submittedAt).toLocaleString()
          : "Recorded",
      ],
    ],
  });

  // Section Marks Breakdown
  const afterInfoY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 35, 75);
  doc.text("ASSESSMENT BREAKDOWN", 18, afterInfoY);

  autoTable(doc, {
    startY: afterInfoY + 3,
    margin: { left: 18, right: 18 },
    theme: "striped",
    headStyles: {
      fillColor: [15, 35, 75],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    styles: {
      fontSize: 10,
      cellPadding: 4.5,
      textColor: [30, 41, 59],
    },
    head: [["Examination Component", "Awarded Marks", "Maximum Marks", "Notes"]],
    body: [
      [
        "Part One: Grammar",
        `${data.grammarScore} / 50`,
        "50",
        "Multiple Choice, Sentence Transformation, Error Correction, Verb Forms",
      ],
      [
        "Part Two: Reading Comprehension",
        `${data.readingScore} / 25`,
        "25",
        "Comprehension, True/False Justification, Vocabulary, Interpretation",
      ],
      [
        "Part Three: Writing",
        `${data.writingScore} / 25`,
        "25",
        "Academic / Reflective Essay (Rubric Evaluated)",
      ],
      [
        "Regular Total",
        `${data.regularTotal} / 100`,
        "100",
        `Regular Percentage: ${data.regularTotal}%`,
      ],
      [
        "Bonus Question (Words for the Teacher)",
        `+${data.bonusScore} / 2`,
        "2",
        "Extra Credit (Kept separate from regular percentage)",
      ],
      [
        "FINAL TOTAL (Including Bonus)",
        `${data.finalTotal} / 102`,
        "102",
        data.regularTotal >= 50 ? "Status: PASSED" : "Status: BELOW THRESHOLD",
      ],
    ],
  });

  const afterTableY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 12;

  // Teacher Comments Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 35, 75);
  doc.text("TEACHER COMMENTS & FEEDBACK", 18, afterTableY);

  doc.setFillColor(249, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(18, afterTableY + 3, 174, 34, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const feedbackLines = doc.splitTextToSize(
    data.teacherComments && data.teacherComments.trim()
      ? data.teacherComments
      : "Examination evaluated and verified by Adam Ameyoud.",
    162
  );
  doc.text(feedbackLines, 23, afterTableY + 11);

  // Footer Signature
  const footerY = 268;
  doc.setDrawColor(203, 213, 225);
  doc.line(18, footerY, 192, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 35, 75);
  doc.text("Authorized Examiner: Adam Ameyoud", 18, footerY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("English Language Assessment Platform", 18, footerY + 12);
  doc.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    152,
    footerY + 7
  );

  const safeName = data.studentName.replace(/[^a-z0-9]/gi, "_");
  doc.save(`Adam_Ameyoud_Result_${safeName}.pdf`);
}

export function generateGroupResultsPDF(params: {
  examTitle: string;
  groupLabel: string;
  rows: {
    studentName: string;
    studentNumber: string;
    groupName: string;
    grammarScore: number;
    readingScore: number;
    writingScore: number;
    regularTotal: number;
    bonusScore: number;
    finalTotal: number;
    resultsStatus: string;
  }[];
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFillColor(15, 35, 75);
  doc.rect(0, 0, 297, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("ADAM AMEYOUD — ENGLISH LANGUAGE ASSESSMENT", 15, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(186, 214, 255);
  doc.text(
    `${params.examTitle} • ${params.groupLabel} Official Summary Sheet`,
    15,
    22
  );

  autoTable(doc, {
    startY: 36,
    margin: { left: 15, right: 15 },
    headStyles: {
      fillColor: [15, 35, 75],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    head: [
      [
        "Student Name",
        "Student ID",
        "Group",
        "Grammar (/50)",
        "Reading (/25)",
        "Writing (/25)",
        "Regular (/100)",
        "Bonus (/2)",
        "Final (/102)",
        "Publication Status",
      ],
    ],
    body: params.rows.map((r) => [
      r.studentName,
      r.studentNumber,
      r.groupName,
      String(r.grammarScore),
      String(r.readingScore),
      String(r.writingScore),
      String(r.regularTotal),
      `+${r.bonusScore}`,
      String(r.finalTotal),
      r.resultsStatus.toUpperCase(),
    ]),
  });

  doc.save(
    `Adam_Ameyoud_Summary_${params.groupLabel.replace(/[^a-z0-9]/gi, "_")}.pdf`
  );
}
