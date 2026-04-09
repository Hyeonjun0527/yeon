import styles from "../../mockdata/mockdata.module.css";
import type { Student } from "../_hooks/use-students";

type StudentDetailProps = {
  student: Student;
  onBack: () => void;
};

export function StudentDetail({ student, onBack }: StudentDetailProps) {
  return (
    <>
      <div className={styles.flexCol}>
        {/* 뒤로가기 + 학생 헤더 */}
        <div style={{ padding: "16px 24px 0" }}>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary, #94a3b8)",
              cursor: "pointer",
              fontSize: 13,
              padding: 0,
              marginBottom: 12,
            }}
          >
            ← 목록으로
          </button>
        </div>

        <div className={styles.studentDetailHeader}>
          <div
            className={styles.studentDetailAvatar}
            style={{ background: student.gradient }}
          >
            {student.initial}
          </div>
          <div>
            <p className={styles.studentDetailName}>{student.name}</p>
            <p className={styles.studentDetailSub}>
              {student.tags.map((t) => (
                <span
                  key={t.label}
                  className={`${styles.tagSm} ${styles[t.cls]}`}
                >
                  {t.label}
                </span>
              ))}
              {" "}· {student.grade} · {student.registeredAt} 등록
            </p>
          </div>
        </div>

        {/* 통계 */}
        <div className={styles.studentDetailStats}>
          <div>
            <p className={styles.sdsLabel}>총 상담</p>
            <p className={styles.sdsValue}>
              {student.counseling}
              <span className={styles.sdsUnit}>회</span>
            </p>
          </div>
          <div>
            <p className={styles.sdsLabel}>이번 달</p>
            <p className={styles.sdsValue}>
              {student.monthCounseling}
              <span className={styles.sdsUnit}>회</span>
            </p>
          </div>
          <div>
            <p className={styles.sdsLabel}>마지막 상담</p>
            <p className={styles.sdsValue}>{student.lastDate}</p>
          </div>
          <div>
            <p className={styles.sdsLabel}>주요 이슈</p>
            <p
              className={styles.sdsValue}
              style={{ fontFamily: "inherit", fontSize: 13 }}
            >
              {student.mainIssue}
            </p>
          </div>
        </div>

        {/* 상담 이력 테이블 */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>날짜</th>
                <th>제목</th>
                <th>유형</th>
                <th>상태</th>
                <th>AI 요약</th>
              </tr>
            </thead>
            <tbody>
              {student.history.map((row) => (
                <tr key={row.date + row.title}>
                  <td className={styles.tdMono}>{row.date}</td>
                  <td className={styles.tdBold}>{row.title}</td>
                  <td>{row.type}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${styles.statusReady}`}
                    >
                      ✓ 완료
                    </span>
                  </td>
                  <td className={styles.tdTruncate}>{row.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI 종합 분석 패널 */}
      <div className={styles.aiPanel}>
        <div className={styles.aiHeader}>
          <span className={styles.aiHeaderDot} />
          AI 종합 분석
        </div>

        <div className={styles.aiSummary}>
          <div className={styles.aiSummaryBadge}>
            ✦ {student.name} 종합 리포트
          </div>
          <div className={styles.aiSummaryText}>
            <strong>주요 이슈:</strong> {student.mainIssue}
            <br />
            <br />
            <strong>상담 현황:</strong> 총 {student.counseling}회 상담 진행, 이번
            달 {student.monthCounseling}회. 마지막 상담일 {student.lastDate}.
            <br />
            <br />
            <strong>권장 조치:</strong>
            <br />
            • 정기 학습 점검 유지
            <br />
            • 보호자 면담 예정 확인
            <br />• 다음 상담 안건 사전 준비
          </div>
        </div>

        <div className={styles.aiMessages} style={{ flex: 1 }} />

        <div className={styles.aiQuick}>
          <button className={styles.aiChip}>보호자 상담일지 생성</button>
          <button className={styles.aiChip}>월간 리포트 PDF</button>
          <button className={styles.aiChip}>다음 상담 안건 제안</button>
        </div>
        <div className={styles.aiInputWrap}>
          <input
            className={styles.aiInput}
            placeholder="이 학생에 대해 질문하세요..."
          />
        </div>
      </div>
    </>
  );
}
