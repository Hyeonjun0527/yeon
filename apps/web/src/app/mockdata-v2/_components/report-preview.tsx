import type { ParentReport } from "../_lib/mock-reports";
import { REPORT_TEMPLATES } from "../_lib/mock-reports";
import { STUDENTS } from "../../mockdata/app/_data/mock-data";

type ReportPreviewOverlayProps = {
  report: ParentReport;
  onClose: () => void;
};

export function ReportPreviewOverlay({
  report,
  onClose,
}: ReportPreviewOverlayProps) {
  const student = STUDENTS.find((s) => s.id === report.studentId);
  const tmpl = REPORT_TEMPLATES.find((t) => t.value === report.template);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "85vh",
          overflow: "auto",
          background: "#fafafa",
          color: "#1a1a1a",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* 수강생 리포트 프리뷰 */}
        <div style={{ padding: "32px 36px" }}>
          {/* 로고 + 기관명 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: "2px solid #818cf8",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              Y
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>YEON 부트캠프</div>
              <div style={{ fontSize: 11, color: "#888" }}>
                {tmpl?.label} · {report.createdAt}
              </div>
            </div>
          </div>

          {/* 인사 */}
          <div style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>
            <strong>{student?.name ?? report.studentName}</strong>님,
            <br />
            최근 학습 및 멘토링 현황을 정리한 리포트입니다.
          </div>

          {/* 섹션들 */}
          {report.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#6366f1",
                  marginBottom: 8,
                  paddingBottom: 4,
                  borderBottom: "1px solid #e5e5e5",
                }}
              >
                {section.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#444",
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {section.content}
              </div>
            </div>
          ))}

          {/* 마무리 */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid #e5e5e5",
              fontSize: 14,
              color: "#666",
              lineHeight: 1.7,
            }}
          >
            궁금한 점이 있으면 멘토에게 편하게 연락 주세요.
            <br />
            <strong>YEON 부트캠프 운영팀</strong>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <div
          style={{
            padding: "12px 36px 20px",
            textAlign: "center",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 32px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#333",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
