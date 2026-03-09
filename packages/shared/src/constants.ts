export const APP_NAME = "Pulse Quiz";
export const APP_VERSION = "0.1.0";

export const STORAGE_VERSION = 1 as const;

export const STORAGE_KEYS = {
  quizzes: "quizapp_v1_quizzes",
  hostResults: "quizapp_v1_host_results",
  playerHistory: "quizapp_v1_player_history",
  settings: "quizapp_v1_settings",
  reconnect: "quizapp_v1_reconnect"
} as const;

export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const QUIZ_LIMITS = {
  maxQuestions: 100,
  minAnswers: 2,
  maxAnswers: 6,
  minTimerSeconds: 5,
  maxTimerSeconds: 120,
  minBasePoints: 100,
  maxBasePoints: 5000,
  defaultTimerSeconds: 20,
  defaultBasePoints: 1000,
  maxRawImageBytes: 8 * 1024 * 1024,
  maxQuizSnapshotBytes: Math.floor(3.5 * 1024 * 1024),
  maxCoverBytes: 220 * 1024,
  maxQuestionImageBytes: 160 * 1024
} as const;

export const SESSION_DEFAULTS = {
  maxReconnectGraceMs: 30_000,
  endedSessionRetentionMs: 300_000,
  idleLobbyExpiryMs: 7_200_000,
  countdownSeconds: 3,
  autoAdvanceAfterRevealMs: 5_000
} as const;
