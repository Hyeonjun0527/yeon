import {
  TYPING_RACE_DEFAULTS,
  TYPING_RACE_STAGE,
  clampRaceProgress,
  type TypingRaceLaneSnapshot,
  type TypingRaceSnapshot,
} from "@yeon/race-shared";

type PhaserModule = typeof import("phaser");

export type TypingRaceEngineMountOptions = {
  container: HTMLElement;
  snapshot?: TypingRaceSnapshot;
};

export type TypingRaceEngineController = {
  destroy: () => void;
  setSnapshot: (snapshot: TypingRaceSnapshot) => void;
};

const SNAPSHOT_EVENT = "typing-race:snapshot";

export async function mountTypingRaceEngine(
  options: TypingRaceEngineMountOptions,
): Promise<TypingRaceEngineController> {
  const Phaser = await import("phaser");
  const snapshotBus = new EventTarget();
  let currentSnapshot = options.snapshot ?? createFallbackSnapshot();
  const scene = createStartLineScene(Phaser, snapshotBus, currentSnapshot);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.container,
    backgroundColor: "#a8d8f0",
    width: Math.max(options.container.clientWidth, 960),
    height: 520,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: "100%",
      height: 520,
    },
    scene: [scene],
  });

  const handleResize = () => {
    const nextWidth = Math.max(options.container.clientWidth, 960);
    game.scale.resize(nextWidth, 520);
  };

  window.addEventListener("resize", handleResize);

  return {
    destroy() {
      window.removeEventListener("resize", handleResize);
      game.destroy(true);
    },
    setSnapshot(snapshot) {
      currentSnapshot = snapshot;
      snapshotBus.dispatchEvent(
        new CustomEvent<TypingRaceSnapshot>(SNAPSHOT_EVENT, {
          detail: snapshot,
        }),
      );
    },
  };
}

// 배경 이미지 레인 Y 비율 (캔버스 height=520 기준)
// 새 배경: 하늘 28% + 4개 흙길 레인 균등 배치, 좌측 컬러 깃발·우측 체크무늬 결승선 내장
const LANE_Y_RATIOS = [0.325, 0.475, 0.625, 0.775] as const;
const TRACK_START_X_RATIO = 0.08; // 좌측 깃발 오른쪽
const TRACK_END_X_RATIO = 0.99;   // 우측 체크무늬 왼쪽

function createStartLineScene(
  Phaser: PhaserModule,
  snapshotBus: EventTarget,
  initialSnapshot: TypingRaceSnapshot,
) {
  return class TypingRaceStartLineScene extends Phaser.Scene {
    private readonly laneVisuals = new Map<
      string,
      {
        car: Phaser.GameObjects.Sprite;
        label: Phaser.GameObjects.Text;
        speed: Phaser.GameObjects.Text;
        trackWidth: number;
        startX: number;
      }
    >();

    private countdownLabel?: Phaser.GameObjects.Text;
    private currentSnapshot = initialSnapshot;
    private detachSnapshot?: () => void;
    private previousStage?: string;

    constructor() {
      super("typing-race-start-line");
    }

    preload() {
      this.load.image("race-bg", "/sprites/race-bg.png");
      this.load.spritesheet("camel-run", "/sprites/camel-run.png", {
        frameWidth: 96,
        frameHeight: 96,
      });
    }

    create() {
      const width = this.scale.width;
      const height = this.scale.height;

      // 배경
      const bg = this.add.image(0, 0, "race-bg");
      bg.setOrigin(0, 0);
      bg.setDisplaySize(width, height);

      // 애니메이션 (중복 등록 방지)
      if (!this.anims.exists("camel-run")) {
        this.anims.create({
          key: "camel-run",
          frames: this.anims.generateFrameNumbers("camel-run", {
            start: 0,
            end: 5,
          }),
          frameRate: 10,
          repeat: -1,
        });
      }

      // 카운트다운 (캔버스 중앙)
      this.countdownLabel = this.add.text(width / 2, height / 2, "", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "96px",
        fontStyle: "900",
        stroke: "#000000",
        strokeThickness: 10,
      });
      this.countdownLabel.setOrigin(0.5, 0.5);
      this.countdownLabel.setDepth(10);

      this.renderSnapshot(this.currentSnapshot);

      const handleSnapshot = (event: Event) => {
        const customEvent = event as CustomEvent<TypingRaceSnapshot>;
        this.currentSnapshot = customEvent.detail;
        this.renderSnapshot(customEvent.detail);
      };

      snapshotBus.addEventListener(SNAPSHOT_EVENT, handleSnapshot);
      this.detachSnapshot = () =>
        snapshotBus.removeEventListener(SNAPSHOT_EVENT, handleSnapshot);

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.detachSnapshot?.();
      });
    }

    private renderSnapshot(snapshot: TypingRaceSnapshot) {
      const wasCountdown = this.previousStage === TYPING_RACE_STAGE.COUNTDOWN;
      const isNowLive = snapshot.stage === TYPING_RACE_STAGE.LIVE;

      if (wasCountdown && isNowLive) {
        this.countdownLabel?.setText("START!");
        this.time.delayedCall(900, () => {
          if (this.countdownLabel?.text === "START!") {
            this.countdownLabel.setText("");
          }
        });
      } else if (snapshot.stage === TYPING_RACE_STAGE.COUNTDOWN) {
        this.countdownLabel?.setText(`${snapshot.countdownRemaining}`);
      } else if (snapshot.stage === TYPING_RACE_STAGE.FINISHED) {
        this.countdownLabel?.setText("FINISH");
      } else if (!wasCountdown) {
        this.countdownLabel?.setText("");
      }

      this.previousStage = snapshot.stage;
      this.syncLanes(snapshot.lanes, snapshot.speedUnit);

      // 레이스 시작 시 낙타 애니메이션 보장
      if (snapshot.stage !== TYPING_RACE_STAGE.COUNTDOWN) {
        for (const visual of this.laneVisuals.values()) {
          if (!visual.car.anims.isPlaying) {
            visual.car.play("camel-run");
          }
        }
      }
    }

    private syncLanes(lanes: readonly TypingRaceLaneSnapshot[], speedUnit?: string) {
      const width = this.scale.width;
      const height = this.scale.height;
      const trackStartX = width * TRACK_START_X_RATIO;
      const trackEndX = width * TRACK_END_X_RATIO;
      const trackWidth = trackEndX - trackStartX;

      // 스냅샷에 없는 오래된 레인 정리 (rejoin/참여자 이탈 시 stale 누적 방지)
      const activeIds = new Set(lanes.map((lane) => lane.id));
      for (const [id, visual] of this.laneVisuals.entries()) {
        if (!activeIds.has(id)) {
          visual.car.destroy();
          visual.label.destroy();
          visual.speed.destroy();
          this.laneVisuals.delete(id);
        }
      }

      lanes.forEach((lane, index) => {
        const laneY = height * (LANE_Y_RATIOS[index] ?? 0.5);
        const existing = this.laneVisuals.get(lane.id);

        if (!existing) {
          const label = this.add.text(trackStartX, laneY + 28, lane.label, {
            color: lane.role === "local" ? "#ffffff" : "#ffe97a",
            fontFamily: "monospace",
            fontSize: "13px",
            fontStyle: lane.role === "local" ? "700" : "400",
            stroke: "#000000",
            strokeThickness: 3,
          });
          label.setOrigin(0.5, 0);
          label.setDepth(5);

          const car = this.add.sprite(trackStartX, laneY, "camel-run");
          car.setOrigin(0, 0.5);
          car.setScale(0.48);
          car.setDepth(5);
          car.play("camel-run");

          const speed = this.add.text(trackEndX - 50, laneY + 14, "", {
            color: "#ffffff",
            fontFamily: "monospace",
            fontSize: "12px",
            stroke: "#000000",
            strokeThickness: 3,
          });
          speed.setOrigin(1, 0.5);
          speed.setDepth(5);

          this.laneVisuals.set(lane.id, {
            car,
            label,
            speed,
            trackWidth,
            startX: trackStartX,
          });
        }

        const visual = this.laneVisuals.get(lane.id);
        if (!visual) return;

        // 참여자 이탈로 index가 바뀌면 Y 위치도 재배치 (기존 생성 시 Y가 고정되던 버그 수정)
        visual.car.y = laneY;
        visual.label.y = laneY + 28;
        visual.speed.y = laneY + 14;

        visual.label.setText(lane.label);
        visual.speed.setText(lane.progress >= 100 ? `${lane.wpm}${speedUnit ?? "타"}` : "");
        const spriteW = visual.car.displayWidth;
        visual.car.x =
          visual.startX +
          (visual.trackWidth - spriteW) *
            (clampRaceProgress(lane.progress) / 100);
        visual.label.x = visual.car.x + spriteW / 2 - 7;
      });

    }
  };
}

function createFallbackSnapshot(): TypingRaceSnapshot {
  return {
    stage: TYPING_RACE_STAGE.COUNTDOWN,
    countdownRemaining: TYPING_RACE_DEFAULTS.countdownSeconds,
    headline: "레이스 준비 중",
    subheadline: "엔진이 출발선을 구성하고 있습니다.",
    roundLabel: "Typing Race",
    lanes: [
      createFallbackLane("local-player", "You", "#f4b5ff", 0, 0),
      createFallbackLane("benchmark-1", "Guest", "#62c5ff", 0, 0),
      createFallbackLane("benchmark-2", "Guest", "#93d63f", 0, 0),
      createFallbackLane("benchmark-3", "Guest", "#ff925b", 0, 0),
    ],
  };
}

function createFallbackLane(
  id: string,
  label: string,
  accent: string,
  progress: number,
  wpm: number,
): TypingRaceLaneSnapshot {
  return {
    id,
    label,
    accent,
    progress,
    wpm,
    role: id === "local" ? "local" : "benchmark",
  };
}
