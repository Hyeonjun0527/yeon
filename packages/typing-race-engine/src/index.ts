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
    backgroundColor: "#07131f",
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

// 배경 이미지 1536x1024 기준 레인 Y 비율 (캔버스 height=520 기준으로 환산)
// 각 트랙(흙길) 중심 Y / 1024 * 520
const LANE_Y_RATIOS = [0.303, 0.445, 0.587, 0.726] as const;
const TRACK_START_X_RATIO = 0.075; // 깃발 오른쪽
const TRACK_END_X_RATIO = 0.97;

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
    private lanesCreated = false;

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

      // 카운트다운 (하늘 영역)
      this.countdownLabel = this.add.text(width / 2, 36, "", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "42px",
        fontStyle: "900",
        stroke: "#000000",
        strokeThickness: 6,
      });
      this.countdownLabel.setOrigin(0.5, 0);
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
      this.countdownLabel?.setText(
        snapshot.stage === TYPING_RACE_STAGE.COUNTDOWN
          ? `${snapshot.countdownRemaining}`
          : snapshot.stage === TYPING_RACE_STAGE.FINISHED
            ? "FINISH"
            : "",
      );

      this.syncLanes(snapshot.lanes);
    }

    private syncLanes(lanes: readonly TypingRaceLaneSnapshot[]) {
      const width = this.scale.width;
      const height = this.scale.height;
      const trackStartX = width * TRACK_START_X_RATIO;
      const trackEndX = width * TRACK_END_X_RATIO;
      const trackWidth = trackEndX - trackStartX;

      lanes.forEach((lane, index) => {
        const laneY = height * (LANE_Y_RATIOS[index] ?? 0.5);
        const existing = this.laneVisuals.get(lane.id);

        if (!existing && !this.lanesCreated) {
          const label = this.add.text(trackStartX - 4, laneY - 28, lane.label, {
            color: lane.role === "local" ? "#ffffff" : "#ffe97a",
            fontFamily: "monospace",
            fontSize: "13px",
            fontStyle: lane.role === "local" ? "700" : "400",
            stroke: "#000000",
            strokeThickness: 3,
          });
          label.setOrigin(0, 1);
          label.setDepth(5);

          const car = this.add.sprite(trackStartX, laneY, "camel-run");
          car.setOrigin(0, 0.5);
          car.setScale(0.48);
          car.setDepth(5);
          car.play("camel-run");

          const speed = this.add.text(trackEndX + 6, laneY, "", {
            color: "#ffffff",
            fontFamily: "monospace",
            fontSize: "12px",
            stroke: "#000000",
            strokeThickness: 3,
          });
          speed.setOrigin(0, 0.5);
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

        visual.speed.setText(`${lane.wpm}wpm`);
        const spriteW = visual.car.displayWidth;
        visual.car.x =
          visual.startX +
          (visual.trackWidth - spriteW) *
            (clampRaceProgress(lane.progress) / 100);
      });

      if (!this.lanesCreated && lanes.length > 0) {
        this.lanesCreated = true;
      }
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
      createFallbackLane("local", "Guest (you)", "#f4b5ff", 0, 0),
      createFallbackLane("bench-1", "Benchmark Guest", "#62c5ff", 0, 0),
      createFallbackLane("bench-2", "Benchmark Guest", "#93d63f", 0, 0),
      createFallbackLane("bench-3", "Benchmark Guest", "#ff925b", 0, 0),
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
