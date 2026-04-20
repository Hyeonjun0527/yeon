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

    private headlineLabel?: Phaser.GameObjects.Text;

    private subheadlineLabel?: Phaser.GameObjects.Text;

    private statusPill?: Phaser.GameObjects.Text;

    private currentSnapshot = initialSnapshot;

    private detachSnapshot?: () => void;

    constructor() {
      super("typing-race-start-line");
    }

    preload() {
      this.load.spritesheet("camel-run", "/sprites/camel-run.png", {
        frameWidth: 96,
        frameHeight: 96,
      });
    }

    create() {
      this.cameras.main.setBackgroundColor("#07131f");

      this.anims.create({
        key: "camel-run",
        frames: this.anims.generateFrameNumbers("camel-run", {
          start: 0,
          end: 5,
        }),
        frameRate: 10,
        repeat: -1,
      });

      this.drawChrome();
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

    private drawChrome() {
      const graphics = this.add.graphics();
      const width = this.scale.width;
      const height = this.scale.height;

      graphics.fillGradientStyle(0x081827, 0x07131f, 0x0b2134, 0x0b2134, 1);
      graphics.fillRect(0, 0, width, height);

      graphics.fillStyle(0x10263a, 0.92);
      graphics.fillRoundedRect(32, 28, width - 64, height - 56, 32);

      graphics.lineStyle(2, 0x18354d, 1);
      graphics.strokeRoundedRect(32, 28, width - 64, height - 56, 32);

      this.statusPill = this.add.text(58, 52, "START LINE", {
        color: "#9dcfff",
        fontFamily: "Outfit, sans-serif",
        fontSize: "14px",
        fontStyle: "700",
      });

      this.headlineLabel = this.add.text(56, 88, "", {
        color: "#f3f7fb",
        fontFamily: "Outfit, sans-serif",
        fontSize: "38px",
        fontStyle: "900",
      });

      this.subheadlineLabel = this.add.text(58, 134, "", {
        color: "#90acc4",
        fontFamily: "Pretendard, sans-serif",
        fontSize: "16px",
      });

      this.countdownLabel = this.add.text(width - 160, 82, "", {
        color: "#f9fbff",
        fontFamily: "Outfit, sans-serif",
        fontSize: "84px",
        fontStyle: "900",
      });
      this.countdownLabel.setOrigin(0.5, 0);

      const laneStartY = 220;
      const laneGap = 62;
      const trackStartX = 226;
      const trackWidth = width - 320;

      for (let index = 0; index < 6; index += 1) {
        const y = laneStartY + index * laneGap;

        graphics.lineStyle(2, 0x284663, 1);
        graphics.strokeLineShape(
          new Phaser.Geom.Line(trackStartX, y, trackStartX + trackWidth, y),
        );
      }

      graphics.fillStyle(0xffda59, 0.85);
      graphics.fillRect(trackStartX - 8, laneStartY - 32, 6, laneGap * 5 + 8);
    }

    private renderSnapshot(snapshot: TypingRaceSnapshot) {
      this.headlineLabel?.setText(snapshot.headline);
      this.subheadlineLabel?.setText(snapshot.subheadline);
      this.countdownLabel?.setText(
        snapshot.stage === TYPING_RACE_STAGE.COUNTDOWN
          ? `:${String(snapshot.countdownRemaining).padStart(2, "0")}`
          : snapshot.stage === TYPING_RACE_STAGE.FINISHED
            ? "FIN"
            : "GO",
      );
      this.statusPill?.setText(snapshot.roundLabel.toUpperCase());

      this.syncLanes(snapshot.lanes);
    }

    private syncLanes(lanes: readonly TypingRaceLaneSnapshot[]) {
      const laneStartY = 220;
      const laneGap = 62;
      const trackStartX = 226;
      const trackWidth = this.scale.width - 320;

      lanes.forEach((lane, index) => {
        const y = laneStartY + index * laneGap;
        const existing = this.laneVisuals.get(lane.id);

        if (!existing) {
          const label = this.add.text(56, y - 22, lane.label, {
            color: lane.role === "benchmark" ? "#8bb0cd" : "#eef5ff",
            fontFamily: "Pretendard, sans-serif",
            fontSize: "26px",
            fontStyle: lane.role === "local" ? "700" : "500",
          });

          const car = this.add.sprite(trackStartX, y, "camel-run");
          car.setOrigin(0, 0.5);
          car.setScale(0.52);
          car.play("camel-run");

          const speed = this.add.text(
            trackStartX + trackWidth + 22,
            y - 22,
            "",
            {
              color: "#90acc4",
              fontFamily: "Outfit, sans-serif",
              fontSize: "20px",
              fontStyle: "700",
            },
          );

          this.laneVisuals.set(lane.id, {
            car,
            label,
            speed,
            trackWidth,
            startX: trackStartX,
          });
        }

        const visual = this.laneVisuals.get(lane.id);

        if (!visual) {
          return;
        }

        visual.label.setText(lane.label);
        visual.speed.setText(`${lane.wpm} wpm`);
        const spriteWidth = visual.car.displayWidth;
        visual.car.x =
          visual.startX +
          (visual.trackWidth - spriteWidth) *
            (clampRaceProgress(lane.progress) / 100);
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
