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

const DEMO_PROMPT =
  "열 초 카운트다운이 끝나면 눈보다 손이 먼저 나가지 않게 문장을 끝까지 밀어 보세요.";

const BENCHMARKS = [
  {
    id: "benchmark-1",
    label: "Benchmark Guest",
    accent: TYPING_RACE_LANE_ACCENTS[1],
    wpm: 265,
  },
  {
    id: "benchmark-2",
    label: "Benchmark Guest",
    accent: TYPING_RACE_LANE_ACCENTS[2],
    wpm: 241,
  },
  {
    id: "benchmark-3",
    label: "Benchmark Guest",
    accent: TYPING_RACE_LANE_ACCENTS[3],
    wpm: 227,
  },
] as const;

export class TypingRaceRoom extends Room {
  maxClients = TYPING_RACE_DEFAULTS.maxPlayers;

  private readonly participants = new Map<string, RoomParticipant>();

  private readonly benchmarks = new Map<string, RoomParticipant>();

  private stage: TypingRaceStage = TYPING_RACE_STAGE.COUNTDOWN;

  private countdownRemaining: number = TYPING_RACE_DEFAULTS.countdownSeconds;

  private startedAt: number = Date.now();

  private countdownAccumulator: number = 0;

  onCreate() {
    this.roomName = TYPING_RACE_ROOM_NAME;
    this.setMetadata({ mode: "typing-race" });
    this.resetRaceClock();
    this.bootstrapBenchmarks();

    this.onMessage(RACE_EVENTS.MATCH_JOIN, (client, message) => {
      this.registerParticipant(client, message as MatchJoinMessage);
    });

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
    client.send(RACE_EVENTS.MATCH_ACCEPTED, {
      roomId: this.roomId,
      roomName: TYPING_RACE_ROOM_NAME,
      seat: client.sessionId,
    });
    client.send(RACE_EVENTS.RACE_SEED, {
      passageId: "flow-focus",
      prompt: DEMO_PROMPT,
      roundLabel: "Flow Focus",
    });
    client.send(RACE_EVENTS.RACE_COUNTDOWN, {
      countdownSeconds: this.countdownRemaining,
      startedAt: this.startedAt,
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

    client.send(RACE_EVENTS.RACE_RESULT, {
      placement: 1,
      totalPlayers: this.participants.size + this.benchmarks.size,
      completedAt: Date.now(),
    });
  }

  private tick(deltaTime: number) {
    if (this.stage === TYPING_RACE_STAGE.COUNTDOWN) {
      this.countdownAccumulator += deltaTime;

      if (this.countdownAccumulator >= 1000) {
        this.countdownAccumulator -= 1000;
        this.countdownRemaining = Math.max(0, this.countdownRemaining - 1);

        if (this.countdownRemaining === 0) {
          this.stage = TYPING_RACE_STAGE.LIVE;
        }
      }
    }

    if (this.stage === TYPING_RACE_STAGE.LIVE) {
      const elapsedSeconds = (Date.now() - this.startedAt) / 1000;
      let benchmarkOffset = 0;

      this.benchmarks.forEach((benchmark) => {
        const baseProgress =
          elapsedSeconds * (benchmark.wpm / 12.4) + benchmarkOffset * 3;
        benchmark.progress = clampRaceProgress(baseProgress);
        benchmarkOffset += 1;
      });
    }

    this.broadcast(RACE_EVENTS.RACE_STATE, this.createSnapshot());
  }

  private createSnapshot(): TypingRaceSnapshot {
    const lanes: TypingRaceLaneSnapshot[] = [
      ...this.participants.values(),
      ...this.benchmarks.values(),
    ]
      .slice(0, 4)
      .map((participant) => ({
        id: participant.id,
        label:
          participant.role === TYPING_RACE_LANE_ROLE.LOCAL
            ? `${participant.label} (you)`
            : participant.label,
        accent: participant.accent,
        progress: participant.progress,
        wpm: participant.wpm,
        role: participant.role,
      }));

    return {
      stage: this.stage,
      countdownRemaining: this.countdownRemaining,
      headline:
        this.stage === TYPING_RACE_STAGE.COUNTDOWN
          ? "출발선 정렬 중"
          : "레이스 진행 중",
      subheadline:
        this.stage === TYPING_RACE_STAGE.COUNTDOWN
          ? "카운트다운이 끝나면 입력 진행률에 맞춰 lane이 움직입니다."
          : "로컬 입력과 benchmark lane이 같은 룸 상태를 기준으로 움직입니다.",
      roundLabel: "Flow Focus",
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
