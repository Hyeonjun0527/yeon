import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";
import type { RecordItem, AnalysisResult, TranscriptSegment } from "./types";
import type { MemberWithStatus } from "../_hooks/use-space-members";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function fmtDuration(ms: number): string {
  if (!ms) return "-";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}분 ${String(sec).padStart(2, "0")}초`;
}

function fmtMs(ms: number | null): string {
  if (!ms) return "";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `[${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}]`;
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "818CF8" },
    },
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
  });
}

function bodyParagraph(text: string, options?: { bold?: boolean; color?: string }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        color: options?.color,
        size: 22,
      }),
    ],
    spacing: { after: 80 },
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

function buildAnalysisSection(analysis: AnalysisResult): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(sectionHeading("AI 분석 결과"));

  // 핵심 요약
  paragraphs.push(subHeading("핵심 요약"));
  paragraphs.push(bodyParagraph(analysis.summary));

  // 수강생 정보
  if (analysis.member.name) {
    paragraphs.push(subHeading("수강생 정보"));
    paragraphs.push(bodyParagraph(`이름: ${analysis.member.name}`, { bold: true }));
    paragraphs.push(bodyParagraph(`감정/태도: ${analysis.member.emotion}`));
    if (analysis.member.traits.length > 0) {
      paragraphs.push(bodyParagraph(`특성: ${analysis.member.traits.join(", ")}`));
    }
  }

  // 주요 이슈
  if (analysis.issues.length > 0) {
    paragraphs.push(subHeading("주요 이슈"));
    analysis.issues.forEach((issue, i) => {
      paragraphs.push(bodyParagraph(`${i + 1}. ${issue.title}`, { bold: true }));
      paragraphs.push(bodyParagraph(issue.detail));
      if (issue.timestamp) {
        paragraphs.push(bodyParagraph(`시각: ${issue.timestamp}`, { color: "888888" }));
      }
    });
  }

  // 후속 조치
  paragraphs.push(subHeading("후속 조치"));
  if (analysis.actions.mentor.length > 0) {
    paragraphs.push(bodyParagraph("멘토 액션", { bold: true }));
    analysis.actions.mentor.forEach((a) => paragraphs.push(bulletParagraph(a)));
  }
  if (analysis.actions.member.length > 0) {
    paragraphs.push(bodyParagraph("수강생 과제", { bold: true }));
    analysis.actions.member.forEach((a) => paragraphs.push(bulletParagraph(a)));
  }
  if (analysis.actions.nextSession.length > 0) {
    paragraphs.push(bodyParagraph("다음 상담 방향", { bold: true }));
    analysis.actions.nextSession.forEach((a) => paragraphs.push(bulletParagraph(a)));
  }

  // 키워드
  if (analysis.keywords.length > 0) {
    paragraphs.push(subHeading("키워드"));
    paragraphs.push(bodyParagraph(analysis.keywords.map((k) => `#${k}`).join("  ")));
  }

  return paragraphs;
}

function buildTranscriptSection(segments: TranscriptSegment[]): Paragraph[] {
  if (segments.length === 0) return [];

  const paragraphs: Paragraph[] = [];
  paragraphs.push(sectionHeading("전사 내용"));

  segments.forEach((seg) => {
    const timeStr = fmtMs(seg.startMs);
    const speaker = seg.speakerLabel || (seg.speakerTone === "teacher" ? "멘토" : "수강생");
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${timeStr} ${speaker}  `, bold: true, size: 20, color: "5B5BD6" }),
          new TextRun({ text: seg.text, size: 20 }),
        ],
        spacing: { after: 60 },
      }),
    );
  });

  return paragraphs;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportRecordDocx(record: RecordItem): Promise<void> {
  const paragraphs: (Paragraph | Table)[] = [];

  // 문서 제목
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: record.title, bold: true, size: 36, color: "1A1A2E" })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
  );

  // 메타 정보 테이블
  const metaRows = [
    ["날짜", fmtDate(record.createdAt)],
    ["수강생", record.studentName || "미지정"],
    ["유형", record.type || "-"],
    ["녹음 길이", fmtDuration(record.durationMs)],
  ];

  paragraphs.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metaRows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: "F4F4FF" },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
                width: { size: 80, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
      ),
    }),
  );

  paragraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));

  // AI 분석
  if (record.analysisResult) {
    paragraphs.push(...buildAnalysisSection(record.analysisResult));
  } else {
    paragraphs.push(sectionHeading("AI 분석 결과"));
    paragraphs.push(bodyParagraph("분석 결과가 없습니다.", { color: "888888" }));
  }

  // 전사
  paragraphs.push(...buildTranscriptSection(record.transcript));

  const doc = new Document({
    creator: "YEON",
    title: record.title,
    sections: [{ properties: {}, children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = record.title.replace(/[/\\:*?"<>|]/g, "_");
  downloadBlob(blob, `${safeTitle}_${fmtDate(record.createdAt)}.docx`);
}

export async function exportMemberReportDocx(
  member: MemberWithStatus,
  records: RecordItem[],
): Promise<void> {
  const memberRecords = records
    .filter((r) => r.memberId === member.id && r.status === "ready")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const paragraphs: (Paragraph | Table)[] = [];

  // 제목
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: `${member.name} 수강생 리포트`, bold: true, size: 36, color: "1A1A2E" })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
  );

  // 상태 요약
  const statusLabel =
    member.indicator === "recent" ? "관리 중" : member.indicator === "warning" ? "주의 필요" : "상담 필요";
  const statusColor =
    member.indicator === "recent" ? "22C55E" : member.indicator === "warning" ? "F59E0B" : "888888";

  paragraphs.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "상태", bold: true, size: 20 })] })],
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: "F4F4FF" },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: statusLabel, size: 20, color: statusColor, bold: true })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "총 상담", bold: true, size: 20 })] })],
              shading: { type: ShadingType.CLEAR, fill: "F4F4FF" },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${member.counselingCount}건`, size: 20 })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "마지막 상담", bold: true, size: 20 })] })],
              shading: { type: ShadingType.CLEAR, fill: "F4F4FF" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: member.lastCounselingAt ? fmtDate(member.lastCounselingAt) : "없음",
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  paragraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));

  // 상담 기록 목록
  paragraphs.push(sectionHeading(`상담 기록 (${memberRecords.length}건)`));

  if (memberRecords.length === 0) {
    paragraphs.push(bodyParagraph("상담 기록이 없습니다.", { color: "888888" }));
  } else {
    memberRecords.forEach((rec, i) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. ${rec.title}`, bold: true, size: 24, color: "1A1A2E" }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
        }),
      );
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `날짜: ${fmtDate(rec.createdAt)}`, size: 20, color: "888888" }),
            ...(rec.durationMs > 0
              ? [new TextRun({ text: `   |   길이: ${fmtDuration(rec.durationMs)}`, size: 20, color: "888888" })]
              : []),
            ...(rec.type ? [new TextRun({ text: `   |   유형: ${rec.type}`, size: 20, color: "888888" })] : []),
          ],
          spacing: { after: 80 },
        }),
      );

      if (rec.analysisResult) {
        paragraphs.push(bodyParagraph(rec.analysisResult.summary));

        if (rec.analysisResult.actions.nextSession.length > 0) {
          paragraphs.push(bodyParagraph("다음 상담 방향", { bold: true }));
          rec.analysisResult.actions.nextSession.forEach((a) => paragraphs.push(bulletParagraph(a)));
        }
      } else if (rec.aiSummary) {
        paragraphs.push(bodyParagraph(rec.aiSummary));
      }
    });
  }

  const doc = new Document({
    creator: "YEON",
    title: `${member.name} 수강생 리포트`,
    sections: [{ properties: {}, children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = member.name.replace(/[/\\:*?"<>|]/g, "_");
  downloadBlob(blob, `${safeTitle}_리포트_${fmtDate(new Date().toISOString())}.docx`);
}
