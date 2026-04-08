import { useState } from "react";
import styles from "../../mockdata/mockdata.module.css";
import { STUDENTS } from "../../mockdata/app/_data/mock-data";
import {
  REPORT_TEMPLATES,
  type ParentReport,
  type ReportTemplate,
} from "../_lib/mock-reports";

type ReportCenterPanelProps = {
  selectedStudentId: string | null;
  studentReports: ParentReport[];
  isGenerating: boolean;
  /* editor */
  editingIndex: number | null;
  editBuffer: string;
  onStartEdit: (index: number, content: string) => void;
  onCancelEdit: () => void;
  onEditBuffer: (value: string) => void;
  /* actions */
  onGenerate: (studentId: string, studentName: string, template: ReportTemplate) => void;
  onUpdateSection: (reportId: string, sectionIndex: number, content: string) => void;
  onMarkAsSent: (reportId: string) => void;
  onOpenPreview: (reportId: string) => void;
};

export function ReportCenterPanel({
  selectedStudentId,
  studentReports,
  isGenerating,
  editingIndex,
  editBuffer,
  onStartEdit,
  onCancelEdit,
  onEditBuffer,
  onGenerate,
  onUpdateSection,
  onMarkAsSent,
  onOpenPreview,
}: ReportCenterPanelProps) {
  const student = STUDENTS.find((s) => s.id === selectedStudentId);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>("regular");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const activeReport =
    activeReportId
      ? studentReports.find((r) => r.id === activeReportId) ?? null
      : null;

  /* 학생 미선택 */
  if (!student) {
    return (
      <div className={styles.center} style={{ padding: 0 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-dim)",
            gap: 8,
          }}
        >
          <ReportIcon size={40} />
          <div style={{ fontSize: 15 }}>왼쪽에서 학생을 선택하세요</div>
          <div style={{ fontSize: 13 }}>수강생별 학습 리포트를 생성하고 관리합니다</div>
        </div>
      </div>
    );
  }

  /* 리포트 상세 보기 */
  if (activeReport) {
    return (
      <div className={styles.center} style={{ padding: 0 }}>
        <ReportDetail
          report={activeReport}
          editingIndex={editingIndex}
          editBuffer={editBuffer}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onEditBuffer={onEditBuffer}
          onUpdateSection={onUpdateSection}
          onMarkAsSent={onMarkAsSent}
          onOpenPreview={onOpenPreview}
          onBack={() => setActiveReportId(null)}
        />
      </div>
    );
  }

  /* 학생 선택됨 — 리포트 목록 + 생성 */
  return (
    <div className={styles.center} style={{ padding: 0, overflow: "auto" }}>
      {/* 학생 헤더 */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: student.gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 600,
            color: "#fff",
          }}
        >
          {student.initial}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{student.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {student.grade} · {student.school ?? "미입력"} · 상담 {student.counseling}회
          </div>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* 리포트 생성 카드 */}
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            새 리포트 생성
          </div>

          {/* 템플릿 선택 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {REPORT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.value}
                onClick={() => setSelectedTemplate(tmpl.value)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid",
                  borderColor:
                    selectedTemplate === tmpl.value
                      ? "var(--accent)"
                      : "var(--border)",
                  background:
                    selectedTemplate === tmpl.value
                      ? "var(--accent-dim)"
                      : "transparent",
                  color:
                    selectedTemplate === tmpl.value
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 500 }}>{tmpl.label}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                  {tmpl.desc}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() =>
              onGenerate(student.id, student.name, selectedTemplate)
            }
            disabled={isGenerating}
            style={{
              padding: "10px 24px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: isGenerating ? "var(--surface3)" : "var(--accent)",
              color: isGenerating ? "var(--text-dim)" : "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: isGenerating ? "default" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {isGenerating ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Spinner /> AI 리포트 생성 중...
              </span>
            ) : (
              "AI 리포트 생성"
            )}
          </button>
        </div>

        {/* 기존 리포트 목록 */}
        {studentReports.length > 0 && (
          <>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 12,
                color: "var(--text-secondary)",
              }}
            >
              기존 리포트 ({studentReports.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {studentReports.map((report) => {
                const tmpl = REPORT_TEMPLATES.find(
                  (t) => t.value === report.template,
                );
                return (
                  <div
                    key={report.id}
                    onClick={() => setActiveReportId(report.id)}
                    style={{
                      padding: "14px 18px",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border)")
                    }
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {tmpl?.label ?? report.template}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-dim)",
                          marginTop: 2,
                        }}
                      >
                        {report.createdAt} · {report.sections.length}개 섹션
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 12,
                        background:
                          report.status === "sent"
                            ? "var(--green-dim)"
                            : "var(--amber-dim)",
                        color:
                          report.status === "sent"
                            ? "var(--green)"
                            : "var(--amber)",
                        border: `1px solid ${
                          report.status === "sent"
                            ? "var(--green-border)"
                            : "var(--amber-border)"
                        }`,
                      }}
                    >
                      {report.status === "sent" ? "발송 완료" : "초안"}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── 리포트 상세 ── */

function ReportDetail({
  report,
  editingIndex,
  editBuffer,
  onStartEdit,
  onCancelEdit,
  onEditBuffer,
  onUpdateSection,
  onMarkAsSent,
  onOpenPreview,
  onBack,
}: {
  report: ParentReport;
  editingIndex: number | null;
  editBuffer: string;
  onStartEdit: (i: number, content: string) => void;
  onCancelEdit: () => void;
  onEditBuffer: (v: string) => void;
  onUpdateSection: (reportId: string, i: number, content: string) => void;
  onMarkAsSent: (reportId: string) => void;
  onOpenPreview: (reportId: string) => void;
  onBack: () => void;
}) {
  const tmpl = REPORT_TEMPLATES.find((t) => t.value === report.template);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      {/* 뒤로가기 + 헤더 */}
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "inherit",
          padding: 0,
          marginBottom: 16,
        }}
      >
        ← 목록으로
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            {report.studentName} — {tmpl?.label}
          </h2>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
            {report.createdAt} 생성 ·{" "}
            <span
              style={{
                color: report.status === "sent" ? "var(--green)" : "var(--amber)",
              }}
            >
              {report.status === "sent" ? "발송 완료" : "초안"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onOpenPreview(report.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            미리보기
          </button>
          {report.status === "draft" && (
            <button
              onClick={() => onMarkAsSent(report.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "var(--green)",
                color: "#000",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              발송하기
            </button>
          )}
        </div>
      </div>

      {/* 섹션들 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {report.sections.map((section, i) => (
          <div
            key={i}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
                {section.title}
              </div>
              {report.status === "draft" && editingIndex !== i && (
                <button
                  onClick={() => onStartEdit(i, section.content)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "inherit",
                  }}
                >
                  수정
                </button>
              )}
            </div>

            {editingIndex === i ? (
              <div>
                <textarea
                  value={editBuffer}
                  onChange={(e) => onEditBuffer(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 100,
                    padding: 12,
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--accent-border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                    resize: "vertical",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={onCancelEdit}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      onUpdateSection(report.id, i, editBuffer);
                      onCancelEdit();
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      background: "var(--accent)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 아이콘 ── */

function ReportIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid var(--text-dim)",
        borderTopColor: "var(--accent)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}
