import {
  RACE_EVENTS,
  TYPING_RACE_DEFAULTS,
  TYPING_RACE_LANE_ACCENTS,
  TYPING_RACE_LANE_ROLE,
  TYPING_RACE_STAGE,
  TYPING_RACE_ROOM_NAME,
  clampRaceProgress,
  type MatchJoinMessage,
  type RaceFinishMessage,
  type RaceProgressMessage,
  type TypingRaceLaneSnapshot,
  type TypingRaceSnapshot,
  type TypingRaceStage,
} from "@yeon/race-shared";
import { type Client, Room } from "colyseus";

type RoomLocale = "ko" | "en";

type RoomParticipant = {
  id: string;
  label: string;
  accent: string;
  role: "local" | "benchmark";
  progress: number;
  wpm: number;
  accuracy: number;
  joinedAt: number;
};

const DEMO_PROMPTS: Record<RoomLocale, string> = {
  ko: "열 초 카운트다운이 끝나면 눈보다 손이 먼저 나가지 않게 문장을 끝까지 밀어 보세요.",
  en: "Once the ten second countdown ends, let your fingers move forward through the sentence with a steady rhythm.",
};

const ROUND_LABEL_ID = "flow-focus"; // 클라이언트가 번역해 표시

const BENCHMARKS = [
  { id: "benchmark-1", label: "Guest", accent: TYPING_RACE_LANE_ACCENTS[1], wpm: 265 },
  { id: "benchmark-2", label: "Guest", accent: TYPING_RACE_LANE_ACCENTS[2], wpm: 241 },
  { id: "benchmark-3", label: "Guest", accent: TYPING_RACE_LANE_ACCENTS[3], wpm: 227 },
] as const;

// 엔진 레인 수가 4개라 maxClients도 4로 고정 (LANE_Y_RATIOS 길이와 일치시켜 5~6번째 참여자 누락 방지)
const MAX_PLAYERS_PER_ROOM = 4;

export class TypingRaceRoom extends Room {
  maxClients = MAX_PLAYERS_PER_ROOM;

  private readonly participants = new Map<string, RoomParticipant>();

  private readonly benchmarks = new Map<string, RoomParticipant>();

  private stage: TypingRaceStage = TYPING_RACE_STAGE.COUNTDOWN;

  private countdownRemaining: number = TYPING_RACE_DEFAULTS.countdownSeconds;

  private startedAt: number = Date.now();

  private countdownAccumulator: number = 0;

  private finishCount: number = 0;

  private locale: RoomLocale = "ko";

  onCreate(options?: { locale?: string }) {
    this.roomName = TYPING_RACE_ROOM_NAME;
    this.locale = options?.locale === "en" ? "en" : "ko";
    this.setMetadata({ mode: "typing-race", locale: this.locale });
    this.resetRaceClock();
    this.bootstrapBenchmarks();

    this.onMessage(RACE_EVENTS.RACE_PROGRESS, (client, message) => {
      this.updateParticipantProgress(client, message as RaceProgressMessage);
    });

    this.onMessage(RACE_EVENTS.RACE_FINISH, (client, message) => {
      this.finishParticipant(client, message as RaceFinishMessage);
    });

    this.setSimulationInterval(
      (deltaTime) => {
        this.tick(deltaTime);
      },
      Math.round(1000 / TYPING_RACE_DEFAULTS.roomTickRate),
    );
  }

  onJoin(client: Client, options: MatchJoinMessage) {
    this.registerParticipant(client, options);
    client.send(RACE_EVENTS.RACE_SEED, {
      passageId: ROUND_LABEL_ID,
      prompt: DEMO_PROMPTS[this.locale],
      roundLabel: ROUND_LABEL_ID,
    });
    client.send(RACE_EVENTS.RACE_STATE, this.createSnapshot());
  }

  onLeave(client: Client) {
    this.participants.delete(client.sessionId);
    this.broadcast(RACE_EVENTS.RACE_STATE, this.createSnapshot());
  }

  private registerParticipant(client: Client, message?: MatchJoinMessage) {
    if (this.participants.has(client.sessionId)) {
      return;
    }

    const participant: RoomParticipant = {
      id: client.sessionId,
      label: message?.playerLabel || "Guest",
      accent: TYPING_RACE_LANE_ACCENTS[0],
      role: TYPING_RACE_LANE_ROLE.LOCAL,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      joinedAt: Date.now(),
    };

    this.participants.set(client.sessionId, participant);
    this.broadcast(RACE_EVENTS.RACE_STATE, this.createSnapshot());
  }

  private updateParticipantProgress(
    client: Client,
    message: RaceProgressMessage,
  ) {
    const participant = this.participants.get(client.sessionId);

    if (!participant) {
      return;
    }

    participant.progress = clampRaceProgress(message.progress);
    participant.wpm = Math.max(0, Math.round(message.wpm));
    participant.accuracy = Math.max(
      0,
      Math.min(100, Math.round(message.accuracy)),
    );
  }

  private finishParticipant(client: Client, message: RaceFinishMessage) {
    const participant = this.participants.get(client.sessionId);

    if (!participant) {
      return;
    }

    participant.progress = clampRaceProgress(message.progress);
    participant.wpm = Math.max(0, Math.round(message.wpm));
    participant.accuracy = Math.max(
      0,
      Math.min(100, Math.round(message.accuracy)),
    );

    this.finishCount += 1;
    client.send(RACE_EVENTS.RACE_RESULT, {
      placement: this.finishCount,
      totalPlayers: this.participants.size + this.benchmarks.size,
      completedAt: Date.now(),
    });

    // 실제 참여자 모두 완주 시 FINISHED 전환 (벤치마크 제외)
    const allFinished = Array.from(this.participants.values()).every(
      (p) => p.progress >= 100,
    );
    if (allFinished && this.participants.size > 0) {
      this.stage = TYPING_RACE_STAGE.FINISHED;
    }
  }

  private tick(deltaTime: number) {
    if (this.stage === TYPING_RACE_STAGE.COUNTDOWN) {
      this.countdownAccumulator += deltaTime;

      if (this.countdownAccumulator >= 1000) {
        this.countdownAccumulator -= 1000;
        this.countdownRemaining = Math.max(0, this.countdownRemaining - 1);

        if (this.countdownRemaining === 0) {
          this.stage = TYPING_RACE_STAGE.LIVE;
          // LIVE 전환 시 룸 잠금: 이후 joinOrCreate는 새 룸 생성
          this.lock();
        }
      }
    }

    if (this.stage === TYPING_RACE_STAGE.LIVE) {
      const elapsedSeconds = (Date.now() - this.startedAt) / 1000;
      const promptChars = Math.max(1, Array.from(DEMO_PROMPTS[this.locale]).length);

      this.benchmarks.forEach((benchmark) => {
        const charsTyped = elapsedSeconds * (benchmark.wpm / 60);
        benchmark.progress = clampRaceProgress((charsTyped / promptChars) * 100);
      });
    }

    this.broadcast(RACE_EVENTS.RACE_STATE, this.createSnapshot());
  }

  private createSnapshot(): TypingRaceSnapshot {
    const lanes: TypingRaceLaneSnapshot[] = [
      ...this.participants.values(),
      ...this.benchmarks.values(),
    ]
      .slice(0, MAX_PLAYERS_PER_ROOM)
      .map((participant) => ({
        id: participant.id,
        label: participant.label,
        accent: participant.accent,
        progress: participant.progress,
        wpm: participant.wpm,
        role: participant.role,
      }));

    return {
      stage: this.stage,
      countdownRemaining: this.countdownRemaining,
      headline: "",
      subheadline: "",
      roundLabel: ROUND_LABEL_ID,
      lanes,
    };
  }

  private bootstrapBenchmarks() {
    BENCHMARKS.forEach((benchmark) => {
      this.benchmarks.set(benchmark.id, {
        id: benchmark.id,
        label: benchmark.label,
        accent: benchmark.accent,
        role: TYPING_RACE_LANE_ROLE.BENCHMARK,
        progress: 0,
        wpm: benchmark.wpm,
        accuracy: 100,
        joinedAt: Date.now(),
      });
    });
  }

  private resetRaceClock() {
    this.stage = TYPING_RACE_STAGE.COUNTDOWN;
    this.countdownRemaining = TYPING_RACE_DEFAULTS.countdownSeconds;
    this.startedAt = Date.now();
    this.countdownAccumulator = 0;
  }
}
