import styles from "./page.module.css";

const rebuildSteps = [
  {
    title: "로그인",
    description: "운영자가 먼저 인증을 통과한 뒤에만 다음 흐름으로 진입합니다.",
  },
  {
    title: "프로젝트 생성",
    description:
      "새 프로젝트를 만들고 운영 대상과 기본 메타데이터를 고정합니다.",
  },
  {
    title: "학생 정보 파일 업로드",
    description: "학생 파일을 받아 기본 학생 정보를 한 번에 채웁니다.",
  },
  {
    title: "과제 할당과 진행 파악",
    description:
      "프로젝트 안에서 과제를 배정하고, 학생별 진행상황과 미완료 상태를 한눈에 확인합니다.",
  },
] as const;

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>YEON RESET</p>
          <h1 className={styles.title}>로그인부터 다시 시작합니다.</h1>
          <p className={styles.description}>
            학생 큐, 학생 상세, 오늘 액션보드, 최근 기록을 한 화면에 밀어넣은
            기존 데모 UI는 모두 걷어냈습니다. 현재 홈은 로그인 우선 구조로
            리셋된 초기 진입 화면만 남겨둔 상태입니다.
          </p>
        </header>

        <section className={styles.panel} aria-labelledby="login-reset-heading">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionLabel}>첫 단계</p>
            <h2 id="login-reset-heading" className={styles.sectionTitle}>
              로그인 게이트
            </h2>
            <p className={styles.sectionDescription}>
              실제 인증 연결은 다음 차수에서 붙입니다. 이번 차수는 기존 프론트
              화면 철거와 진입 흐름 초기화까지만 적용했습니다.
            </p>
          </div>

          <form className={styles.form}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>이메일</span>
              <input
                className={styles.input}
                type="email"
                name="email"
                placeholder="operator@yeon.world"
                autoComplete="email"
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>비밀번호</span>
              <input
                className={styles.input}
                type="password"
                name="password"
                placeholder="비밀번호"
                autoComplete="current-password"
              />
            </label>

            <button className={styles.button} type="button" disabled>
              로그인 연결 준비중
            </button>

            <p className={styles.note}>
              기존 `contest`, `student-management` 화면은 모두 홈으로 되돌리도록
              정리했습니다.
            </p>
          </form>
        </section>

        <section
          className={styles.panel}
          aria-labelledby="rebuild-flow-heading"
        >
          <div className={styles.sectionHeader}>
            <p className={styles.sectionLabel}>다음 흐름</p>
            <h2 id="rebuild-flow-heading" className={styles.sectionTitle}>
              다시 쌓을 운영 순서
            </h2>
          </div>

          <ol className={styles.flowList}>
            {rebuildSteps.map((step) => (
              <li key={step.title} className={styles.flowItem}>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
