import { useEffect, useRef, useState } from "react";
import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";
import type { Message } from "../types";
import { formatDateTimeLabel, formatTranscriptTime } from "../utils";

export function useExport(
  selectedRecord: CounselingRecordListItem | null,
  selectedRecordDetail: CounselingRecordDetail | null,
  assistantMessagesByRecord: Record<string, Message[]>,
  setSaveToast: (message: string) => void,
) {
  const [isAiExportOpen, setIsAiExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  // 77차: 내보내기 드롭다운 바깥 클릭 닫기
  useEffect(() => {
    if (!isAiExportOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAiExportOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAiExportOpen]);

  // 41차: 클립보드 내보내기
  async function handleExportClipboard() {
    if (!selectedRecordDetail || !selectedRecord) {
      return;
    }

    const lines = selectedRecordDetail.transcriptSegments.map(
      (segment) =>
        `[${formatTranscriptTime(segment.startMs)}] ${segment.speakerLabel}: ${segment.text}`,
    );
    const text = `${selectedRecord.studentName} — ${selectedRecord.sessionTitle}\n\n${lines.join("\n")}`;

    try {
      await navigator.clipboard.writeText(text);
      setSaveToast("원문이 클립보드에 복사되었습니다.");
    } catch {
      setSaveToast("클립보드 복사에 실패했습니다.");
    }
  }

  // 77차: AI 분석 내보내기 텍스트 빌더
  function buildAiExportText() {
    if (!selectedRecord) {
      return "";
    }

    const messages = assistantMessagesByRecord[selectedRecord.id] ?? [];
    const aiMessages = messages
      .filter((m) => m.role === "assistant" && !m.isStreaming)
      .map((m) => m.content);

    if (aiMessages.length === 0) {
      return "";
    }

    const header = [
      "[상담 분석 보고서]",
      `학생: ${selectedRecord.studentName}`,
      `상담 제목: ${selectedRecord.sessionTitle}`,
      `일시: ${formatDateTimeLabel(selectedRecord.createdAt)}`,
    ].join("\n");

    const aiSection = `--- AI 분석 ---\n${aiMessages.join("\n\n")}`;

    const segmentCount = selectedRecordDetail?.transcriptSegments.length ?? 0;
    const textLength = selectedRecordDetail?.transcriptText.length ?? 0;
    const summary = `--- 원문 요약 ---\n세그먼트 ${segmentCount}개 · ${textLength}자`;

    return `${header}\n\n${aiSection}\n\n${summary}`;
  }

  // 77차: 종합 보고서 마크다운 빌더
  function buildComprehensiveReportMarkdown() {
    if (!selectedRecord || !selectedRecordDetail) {
      return "";
    }

    const messages = assistantMessagesByRecord[selectedRecord.id] ?? [];
    const aiContent = messages
      .filter((m) => m.role === "assistant" && !m.isStreaming)
      .map((m) => m.content)
      .join("\n\n");

    const transcriptLines = selectedRecordDetail.transcriptSegments.map(
      (segment) =>
        `[${formatTranscriptTime(segment.startMs)}] ${segment.speakerLabel}: ${segment.text}`,
    );

    return [
      "# 상담 기록 종합 보고서",
      "",
      "## 기본 정보",
      `- **학생**: ${selectedRecord.studentName}`,
      `- **상담 유형**: ${selectedRecord.counselingType}`,
      `- **상담 제목**: ${selectedRecord.sessionTitle}`,
      `- **일시**: ${formatDateTimeLabel(selectedRecord.createdAt)}`,
      "",
      "## AI 분석",
      aiContent || "(AI 분석 내용이 없습니다)",
      "",
      "## 상담 원문",
      ...transcriptLines,
    ].join("\n");
  }

  async function handleAiExportClipboard() {
    const text = buildAiExportText();

    if (!text) {
      setSaveToast("내보낼 AI 분석이 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setSaveToast("AI 분석이 클립보드에 복사되었습니다.");
    } catch {
      setSaveToast("클립보드 복사에 실패했습니다.");
    }

    setIsAiExportOpen(false);
  }

  function handleAiExportTextFile() {
    const text = buildAiExportText();

    if (!text) {
      setSaveToast("내보낼 AI 분석이 없습니다.");
      return;
    }

    const fileName = `상담분석_${selectedRecord?.studentName ?? "분석"}_${new Date().toISOString().slice(0, 10)}.txt`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setSaveToast("텍스트 파일을 다운로드했습니다.");
    setIsAiExportOpen(false);
  }

  async function handleComprehensiveReportClipboard() {
    const text = buildComprehensiveReportMarkdown();

    if (!text) {
      setSaveToast("내보낼 내용이 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setSaveToast("종합 보고서가 클립보드에 복사되었습니다.");
    } catch {
      setSaveToast("클립보드 복사에 실패했습니다.");
    }

    setIsAiExportOpen(false);
  }

  function handleComprehensiveReportTextFile() {
    const text = buildComprehensiveReportMarkdown();

    if (!text) {
      setSaveToast("내보낼 내용이 없습니다.");
      return;
    }

    const fileName = `종합보고서_${selectedRecord?.studentName ?? "보고서"}_${new Date().toISOString().slice(0, 10)}.md`;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setSaveToast("종합 보고서를 다운로드했습니다.");
    setIsAiExportOpen(false);
  }

  return {
    isAiExportOpen,
    setIsAiExportOpen,
    exportDropdownRef,
    handleExportClipboard,
    handleAiExportClipboard,
    handleAiExportTextFile,
    handleComprehensiveReportClipboard,
    handleComprehensiveReportTextFile,
  };
}
