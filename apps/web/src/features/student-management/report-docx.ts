import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import type { StudentReportDocument } from "./report-builder";

function sectionHeading(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "818CF8" },
    },
  });
}

function bodyParagraph(text: string, bold = false) {
  return new Paragraph({
    children: [
      new TextRun({ text, size: 22, bold, color: bold ? "1A1A2E" : undefined }),
    ],
    spacing: { after: 80 },
  });
}

function bulletParagraph(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 50 },
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportStudentReportDocx(report: StudentReportDocument) {
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      children: [
        new TextRun({
          text: report.title,
          bold: true,
          size: 36,
          color: "1A1A2E",
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    bodyParagraph(report.summary),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: report.meta.map(
        (item) =>
          new TableRow({
            children: [
              new TableCell({
                children: [bodyParagraph(item.label, true)],
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: "F4F4FF" },
              }),
              new TableCell({
                children: [bodyParagraph(item.value)],
                width: { size: 78, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
      ),
    }),
  ];

  report.sections.forEach((section) => {
    children.push(sectionHeading(section.title));
    section.bullets.forEach((bullet) => children.push(bulletParagraph(bullet)));
  });

  const doc = new Document({
    creator: "YEON",
    title: report.title,
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = report.title.replace(/[/\\:*?"<>|]/g, "_");
  downloadBlob(blob, `${safeTitle}.docx`);
}
