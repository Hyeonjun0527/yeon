import styles from "./life-os.module.css";
import { LIFE_OS_HOUR_BLOCKS, LIFE_OS_ROWS } from "./constants";
import { classifyLifeOsHourOutcome } from "./utils";

const sampleHours = Array.from({ length: 24 }, (_, hour) => {
  const goal = hour % 3 === 0 ? "코딩" : hour % 3 === 1 ? "문서" : "휴식";
  const action = hour % 5 === 0 ? "휴식" : goal;
  const outcome = classifyLifeOsHourOutcome({
    goal,
    action,
    goalCategory: goal === "휴식" ? "rest" : "work",
    actionCategory: action === "휴식" ? "rest" : "work",
    previousActionCategory: hour > 0 ? (hour % 5 === 0 ? "rest" : "work") : null,
  });

  return {
    hour,
    goal,
    action,
    outcome: outcome.outcome,
  };
});

function DayBlock({ side }: { side: "left" | "right" }) {
  return (
    <section className={styles.sheetBlock} aria-label={`${side} day block`}>
      {LIFE_OS_HOUR_BLOCKS.map((block, blockIndex) => (
        <div key={`${side}-${block.label}-${blockIndex}`}>
          <div className={styles.dayBand}>
            2026-04-30 · {side === "left" ? "LEFT" : "RIGHT"} · {block.label}
          </div>
          {LIFE_OS_ROWS.map((row, rowIndex) => (
            <div className={styles.row} key={`${block.label}-${row}-${rowIndex}`}>
              <div className={styles.rowLabel}>{row}</div>
              {block.hours.map((hour) => {
                const sample = sampleHours[hour];
                const content =
                  row === "MINDSET"
                    ? "집중"
                    : row === "TIME"
                      ? `${hour}:00`
                      : row === "GOAL"
                        ? sample.goal
                        : sample.action;

                return (
                  <div className={styles.cell} key={`${side}-${block.label}-${row}-${hour}`}>
                    {content}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

export function LifeOsScreen() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Life OS</h1>
            <p className={styles.subtitle}>
              Wide spreadsheet canvas, deterministic overplanning report, private-first MVP.
            </p>
          </div>
          <span className={styles.badge}>/life-os</span>
        </header>

        <div className={styles.canvasWrap}>
          <div className={styles.canvas}>
            <DayBlock side="left" />

            <section className={styles.memoZone} aria-label="central memo backlog">
              <div className={styles.memoCard}>
                <strong>Memo / Backlog</strong>
                <p>중앙 메모 공간은 생각, 미해결 항목, 다음 행동을 적는 곳입니다.</p>
              </div>
              <div className={styles.memoCard}>
                <strong>Deterministic report</strong>
                <p>report UI는 캔버스를 대체하지 않고, overplanning evidence를 보조합니다.</p>
              </div>
              <div className={styles.reportPanel}>
                <div className={styles.reportCard}>
                  <strong>Daily report</strong>
                  <p>planned: 8h · matched: 5h · overplanned: 2h</p>
                </div>
                <div className={styles.reportCard}>
                  <strong>Weekly pattern</strong>
                  <p>Rest 대신 업무가 밀린 블록을 식별합니다.</p>
                </div>
              </div>
            </section>

            <DayBlock side="right" />
          </div>
        </div>
      </div>
    </main>
  );
}

