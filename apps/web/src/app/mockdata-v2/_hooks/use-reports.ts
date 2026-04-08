import { useState, useCallback, useRef } from "react";
import {
  MOCK_REPORTS,
  generateMockReportSections,
  type ParentReport,
  type ReportTemplate,
} from "../_lib/mock-reports";

export function useReports() {
  const [reports, setReports] = useState<ParentReport[]>(MOCK_REPORTS);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const studentReports = selectedStudentId
    ? reports.filter((r) => r.studentId === selectedStudentId)
    : [];

  const selectStudent = useCallback((id: string | null) => {
    setSelectedStudentId(id);
  }, []);

  const generateReport = useCallback(
    (studentId: string, studentName: string, template: ReportTemplate) => {
      setIsGenerating(true);
      clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        const newReport: ParentReport = {
          id: `rpt_${Date.now()}`,
          studentId,
          studentName,
          template,
          status: "draft",
          createdAt: "2026.04.09",
          sections: generateMockReportSections(studentName, template),
        };
        setReports((prev) => [newReport, ...prev]);
        setIsGenerating(false);
      }, 2000);
    },
    [],
  );

  const updateSection = useCallback(
    (reportId: string, sectionIndex: number, content: string) => {
      setReports((prev) =>
        prev.map((r) => {
          if (r.id !== reportId) return r;
          const sections = r.sections.map((s, i) =>
            i === sectionIndex ? { ...s, content } : s,
          );
          return { ...r, sections };
        }),
      );
    },
    [],
  );

  const markAsSent = useCallback((reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: "sent" as const } : r)),
    );
  }, []);

  return {
    reports,
    selectedStudentId,
    studentReports,
    isGenerating,
    selectStudent,
    generateReport,
    updateSection,
    markAsSent,
  } as const;
}
