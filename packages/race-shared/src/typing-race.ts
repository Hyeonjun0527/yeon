export const TYPING_RACE_ROOM_NAME = "typing_race_public";

export const TYPING_RACE_STAGE = {
  COUNTDOWN: "countdown",
  LIVE: "live",
  FINISHED: "finished",
} as const;

export type TypingRaceStage =
  (typeof TYPING_RACE_STAGE)[keyof typeof TYPING_RACE_STAGE];

export const TYPING_RACE_LANE_ROLE = {
  LOCAL: "local",
  GUEST: "guest",
  BENCHMARK: "benchmark",
} as const;

export type TypingRaceLaneRole =
  (typeof TYPING_RACE_LANE_ROLE)[keyof typeof TYPING_RACE_LANE_ROLE];

export const TYPING_RACE_DEFAULTS = {
  countdownSeconds: 10,
  minPlayers: 2,
  maxPlayers: 6,
  roomTickRate: 15,
  progressBroadcastRate: 8,
} as const;

export const TYPING_RACE_LANE_ACCENTS = [
  "#f4b5ff",
  "#62c5ff",
  "#93d63f",
  "#ff925b",
  "#ff5f73",
  "#ffd148",
] as const;

export const RACE_EVENTS = {
  MATCH_JOIN: "match.join",
  MATCH_ACCEPTED: "match.accepted",
  RACE_READY: "race.ready",
  RACE_SEED: "race.seed",
  RACE_COUNTDOWN: "race.countdown",
  RACE_PROGRESS: "race.progress",
  RACE_STATE: "race.state",
  RACE_FINISH: "race.finish",
  RACE_RESULT: "race.result",
  RACE_ERROR: "race.error",
  RACE_PING: "race.ping",
} as const;

export type TypingRaceLaneSnapshot = {
  id: string;
  label: string;
  role: TypingRaceLaneRole;
  progress: number;
  wpm: number;
  accent: string;
  isReady?: boolean;
};

export type TypingRaceSnapshot = {
  stage: TypingRaceStage;
  countdownRemaining: number;
  headline: string;
  subheadline: string;
  roundLabel: string;
  lanes: readonly TypingRaceLaneSnapshot[];
  speedUnit?: string;
};

export type MatchJoinMessage = {
  difficulty?: string;
  playerLabel: string;
  playerId?: string;
  locale?: "ko" | "en";
};

export type MatchAcceptedMessage = {
  roomId: string;
  roomName: string;
  seat: string;
};

export type RaceSeedMessage = {
  passageId: string;
  prompt: string;
  roundLabel: string;
};

export type RaceCountdownMessage = {
  countdownSeconds: number;
  startedAt: number;
};

export type RaceProgressMessage = {
  progress: number;
  wpm: number;
  accuracy: number;
};

export type RaceFinishMessage = {
  progress: number;
  wpm: number;
  accuracy: number;
  finishedAt: number;
};

export type RaceResultMessage = {
  placement: number;
  totalPlayers: number;
  completedAt: number;
};

export function clampRaceProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}
