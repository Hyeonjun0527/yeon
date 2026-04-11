import { Gnav } from "../../_components/gnav";
import styles from "../../mockdata.module.css";

const COUNSELING_HISTORY = [
  {
    date: "2026.04.08",
    title: "수학 과제 누락 상담",
    type: "대면",
    status: "ready",
    summary: "학원 일정으로 과제 시간 부족, 제출 기한 조정 합의",
  },
  {
    date: "2026.04.05",
    title: "월간 학습 점검",
    type: "대면",
    status: "ready",
    summary: "수학 중간고사 대비 계획 수립, 주 3회 자습 권장",
  },
  {
    date: "2026.03.28",
    title: "보호자 통화",
    type: "전화",
    status: "ready",
    summary: "학원-집 학습 연계 방안 논의, 부모 협조 요청",
  },
  {
    date: "2026.03.20",
    title: "수업 태도 점검",
    type: "대면",
    status: "ready",
    summary: "집중력 저하 원인 파악, 자리 배치 변경",
  },
];

export default function StudentDetailPage() {
  return (
    <div className={styles.appShell} style={{ minHeight: 520 }}>
      <Gnav activeMenu="students" />

      <div className={styles.flexCol}>
        {/* 학생 헤더 */}
        <div className={styles.studentDetailHeader}>
          <div
            className={styles.studentDetailAvatar}
            style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)" }}
          >
            민
          </div>
          <div>
            <p className={styles.studentDetailName}>김민수</p>
            <p className={styles.studentDetailSub}>
              <span className={`${styles.tagSm} ${styles.tagMath}`}>수학</span>
              <span className={`${styles.tagSm} ${styles.tagEng}`}>영어</span> ·
              중2 · 2026.03 등록
            </p>
          </div>
        </div>

        {/* 통계 */}
        <div className={styles.studentDetailStats}>
          <div>
            <p className={styles.sdsLabel}>총 상담</p>
            <p className={styles.sdsValue}>
              12<span className={styles.sdsUnit}>회</span>
            </p>
          </div>
          <div>
            <p className={styles.sdsLabel}>이번 달</p>
            <p className={styles.sdsValue}>
              3<span className={styles.sdsUnit}>회</span>
            </p>
          </div>
          <div>
            <p className={styles.sdsLabel}>마지막 상담</p>
            <p className={styles.sdsValue}>4.8</p>
          </div>
          <div>
            <p className={styles.sdsLabel}>주요 이슈</p>
            <p
              className={styles.sdsValue}
              style={{ fontFamily: "inherit", fontSize: 13 }}
            >
              과제 관리
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
              {COUNSELING_HISTORY.map((row) => (
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
          <div className={styles.aiSummaryBadge}>✦ 김민수 종합 리포트</div>
          <div className={styles.aiSummaryText}>
            <strong>핵심 패턴:</strong> 학원 일정 과밀로 자기주도 학습 시간
            부족. 과제 미제출이 반복되는 경향.
            <br />
            <br />
            <strong>개선 추이:</strong> 3월 대비 과제 완수율 향상 (60% → 80%).
            자리 배치 변경 후 수업 집중도 개선.
            <br />
            <br />
            <strong>권장 조치:</strong>
            <br />
            • 과제 양 조절 (현행 유지)
            <br />
            • 중간고사 전 보호자 면담 1회
            <br />• 월 2회 정기 학습 점검 유지
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
    </div>
  );
}
