import { Gnav } from "../_components/gnav";
import styles from "../mockdata.module.css";
import { AudioPlayer } from "./_components/audio-player";

const TRANSCRIPT = [
  {
    time: "00:00",
    speaker: "teacher",
    label: "교사",
    text: "민수야, 오늘 수학 과제가 제출이 안 됐더라. 혹시 무슨 일 있었어?",
  },
  {
    time: "00:08",
    speaker: "student",
    label: "학생",
    text: "아... 네, 어제 학원이 늦게 끝나서 못 했어요.",
  },
  {
    time: "00:15",
    speaker: "teacher",
    label: "교사",
    text: "그랬구나. 학원 스케줄이 빡빡한 편이야?",
  },
  {
    time: "00:22",
    speaker: "student",
    label: "학생",
    text: "네, 월수금 수학이랑 화목 영어 다녀요.",
  },
  {
    time: "00:30",
    speaker: "teacher",
    label: "교사",
    text: "그러면 과제 제출 시간을 조정해볼까? 다음날 아침까지로 여유를 주면 어때?",
  },
  {
    time: "00:42",
    speaker: "student",
    label: "학생",
    text: "그러면 할 수 있을 것 같아요. 감사합니다 선생님.",
  },
];

const SIDEBAR_ITEMS = [
  {
    title: "수학 과제 누락 상담",
    status: "ready",
    meta: "김민수 · 4.8",
    active: true,
  },
  {
    title: "교우 관계 고민 상담",
    status: "ready",
    meta: "이서윤 · 4.7",
    active: false,
  },
  {
    title: "녹음 2026.04.08 10:30",
    status: "processing",
    meta: "",
    active: false,
  },
];

export default function ResultPage() {
  return (
    <div className={styles.appShell}>
      <Gnav activeMenu="records" />

      {/* 사이드바 */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>상담 기록</span>
          <button className={styles.btnNew}>+ 새 녹음</button>
        </div>
        <input
          className={styles.sidebarSearch}
          placeholder="학생, 제목 검색..."
        />
        <div className={styles.sidebarList}>
          {SIDEBAR_ITEMS.map((item) => (
            <div
              key={item.title}
              className={`${styles.sidebarItem} ${item.active ? styles.sidebarItemActive : ""}`}
            >
              <div className={styles.sidebarItemTitle}>{item.title}</div>
              <div className={styles.sidebarItemMeta}>
                <span
                  className={`${styles.statusBadge} ${item.status === "ready" ? styles.statusReady : styles.statusProcessing}`}
                >
                  {item.status === "ready" ? "✓ 완료" : "● 전사 중"}
                </span>
                {item.meta}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 센터 — 전사 원문 */}
      <div className={styles.center}>
        <div className={styles.centerHeader}>
          <div>
            <p className={styles.centerTitle}>
              <span className={styles.editable}>수학 과제 누락 상담</span>
            </p>
            <p className={styles.centerMeta}>
              <span className={styles.editable}>김민수</span> ·{" "}
              <span className={styles.editable}>대면 상담</span> · 2분 34초 ·
              원문 완료
            </p>
          </div>
          <div className={styles.centerActions}>
            <button className={styles.iconBtn}>🔊</button>
            <button className={styles.iconBtn}>📋</button>
            <button className={`${styles.iconBtn} ${styles.iconRed}`}>
              🗑
            </button>
          </div>
        </div>
        <div className={styles.centerBody}>
          <AudioPlayer />

          {/* 전사 세그먼트 */}
          {TRANSCRIPT.map((seg) => (
            <div key={seg.time} className={styles.segment}>
              <span className={styles.segTime}>{seg.time}</span>
              <span
                className={`${styles.segSpeaker} ${seg.speaker === "teacher" ? styles.segTeacher : styles.segStudent}`}
              >
                {seg.label}
              </span>
              <span className={styles.segText}>{seg.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI 패널 */}
      <div className={styles.aiPanel}>
        <div className={styles.aiHeader}>
          <span className={styles.aiHeaderDot} />
          AI 어시스턴트
        </div>

        {/* AI 요약 카드 */}
        <div className={styles.aiSummary}>
          <div className={styles.aiSummaryBadge}>✦ AI 상담 요약</div>
          <div className={styles.aiKv}>
            <span className={styles.aiKvLabel}>학생</span>
            <span className={styles.aiKvValue}>김민수</span>
          </div>
          <div className={styles.aiKv}>
            <span className={styles.aiKvLabel}>유형</span>
            <span className={styles.aiKvValue}>대면 상담</span>
          </div>
          <div className={styles.aiKv}>
            <span className={styles.aiKvLabel}>주제</span>
            <span className={styles.aiKvValue}>수학 과제 미제출</span>
          </div>
          <div className={styles.aiDivider} />
          <div className={styles.aiSummaryText}>
            학원 일정(주 5회)으로 과제 시간 부족. 제출 기한을 익일 오전으로
            조정하기로 합의. 2주 후 학습 루틴 재점검 예정.
          </div>
        </div>

        {/* 채팅 */}
        <div className={styles.aiMessages} style={{ flex: 1 }}>
          <div className={`${styles.aiMsg} ${styles.aiMsgUser}`}>
            보호자 안내 문자 초안 만들어줘
          </div>
          <div className={`${styles.aiMsg} ${styles.aiMsgAssistant}`}>
            [학원명] 김민수 학생 상담 안내
            <br />
            <br />
            안녕하세요. 오늘 민수와 수학 과제 제출 관련 상담을 진행했습니다.
            <br />
            <br />
            학원 일정이 빡빡해 과제 시간 확보가 어려운 상황이라, 제출 기한을
            익일 오전으로 조정했습니다. 2주간 적용 후 다시 점검하겠습니다.
            <br />
            <br />
            문의사항은 편하게 연락주세요.
          </div>
        </div>

        <div className={styles.aiQuick}>
          <button className={styles.aiChip}>후속 조치 정리</button>
          <button className={styles.aiChip}>이전 상담 비교</button>
          <button className={styles.aiChip}>학습 루틴 제안</button>
        </div>
        <div className={styles.aiInputWrap}>
          <input
            className={styles.aiInput}
            placeholder="질문을 입력하세요..."
          />
        </div>
      </div>
    </div>
  );
}
