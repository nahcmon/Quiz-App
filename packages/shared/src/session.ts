import { z } from "zod";

import { SESSION_DEFAULTS } from "./constants";
import { PublicQuestionPayloadSchema, QuizSnapshotSchema } from "./quiz";
import { type LeaderboardEntry } from "./scoring";

export const SessionPhaseSchema = z.enum([
  "lobby",
  "countdown",
  "question_open",
  "question_closed",
  "answer_reveal",
  "leaderboard",
  "final"
]);

export const PublicRosterEntrySchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  score: z.number().int(),
  connected: z.boolean(),
  joinedAt: z.number().int().positive(),
  rank: z.number().int().positive().optional()
});

export const PlayerAnswerRecordSchema = z.object({
  questionId: z.string(),
  optionId: z.string(),
  submittedAt: z.number().int().positive(),
  responseMs: z.number().int().nonnegative(),
  isCorrect: z.boolean(),
  pointsAwarded: z.number().int().nonnegative(),
  accepted: z.boolean()
});

export const FinalQuestionOutcomeSchema = z.object({
  questionId: z.string(),
  questionText: z.string(),
  correctOptionId: z.string(),
  optionStats: z.record(z.string(), z.number().int().nonnegative())
});

export const FinalPlayerResultSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  rank: z.number().int().positive(),
  score: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  cumulativeResponseMs: z.number().int().nonnegative(),
  joinedAt: z.number().int().positive(),
  connectedAtEnd: z.boolean(),
  answers: z.array(PlayerAnswerRecordSchema)
});

export const FinalSessionResultsSchema = z.object({
  code: z.string().length(6),
  quizId: z.string(),
  quizTitle: z.string(),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive(),
  reason: z.enum([
    "host_ended",
    "host_timeout",
    "completed",
    "server_restart_loss"
  ]),
  totalPlayers: z.number().int().nonnegative(),
  leaderboard: z.array(
    z.object({
      playerId: z.string(),
      playerName: z.string(),
      score: z.number().int().nonnegative(),
      rank: z.number().int().positive(),
      correctCount: z.number().int().nonnegative(),
      cumulativeResponseMs: z.number().int().nonnegative(),
      connected: z.boolean(),
      previousRank: z.number().int().positive().optional(),
      delta: z.number().int().optional()
    })
  ),
  players: z.array(FinalPlayerResultSchema),
  questions: z.array(FinalQuestionOutcomeSchema)
});

export const RevealResultSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  selectedOptionId: z.string().nullable(),
  isCorrect: z.boolean(),
  pointsAwarded: z.number().int().nonnegative(),
  score: z.number().int().nonnegative()
});

export const RevealPayloadSchema = z.object({
  optionStats: z.record(z.string(), z.number().int().nonnegative()),
  playerResults: z.array(RevealResultSchema)
});

export const PublicBaseSessionStateSchema = z.object({
  code: z.string().length(6),
  phase: SessionPhaseSchema,
  joinUrl: z.string().url(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  quizTitle: z.string(),
  quizDescription: z.string().optional(),
  coverImage: z
    .object({
      dataUrl: z.string(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      mimeType: z.string(),
      bytes: z.number().int().positive(),
      alt: z.string().optional()
    })
    .optional(),
  totalQuestions: z.number().int().positive(),
  currentQuestionIndex: z.number().int().nonnegative(),
  roster: z.array(PublicRosterEntrySchema),
  counts: z.object({
    connected: z.number().int().nonnegative(),
    total: z.number().int().nonnegative()
  }),
  startedAt: z.number().int().positive().optional(),
  endedAt: z.number().int().positive().optional(),
  questionStartedAt: z.number().int().positive().optional(),
  questionEndsAt: z.number().int().positive().optional(),
  leaderboard: z
    .array(
      z.object({
        playerId: z.string(),
        playerName: z.string(),
        score: z.number().int().nonnegative(),
        rank: z.number().int().positive(),
        correctCount: z.number().int().nonnegative(),
        cumulativeResponseMs: z.number().int().nonnegative(),
        connected: z.boolean(),
        previousRank: z.number().int().positive().optional(),
        delta: z.number().int().optional()
      })
    )
    .optional(),
  question: PublicQuestionPayloadSchema.optional(),
  revealedCorrectOptionId: z.string().optional(),
  finalResults: FinalSessionResultsSchema.optional()
});

export const PublicHostSessionStateSchema = PublicBaseSessionStateSchema.extend({
  role: z.literal("host"),
  hostConnected: z.boolean()
});

export const PublicPlayerSessionStateSchema = PublicBaseSessionStateSchema.extend({
  role: z.literal("player"),
  playerId: z.string(),
  playerName: z.string(),
  playerScore: z.number().int().nonnegative(),
  playerRank: z.number().int().positive().optional(),
  lockedAnswerOptionId: z.string().nullable().optional()
});

export type SessionPhase = z.infer<typeof SessionPhaseSchema>;
export type PublicRosterEntry = z.infer<typeof PublicRosterEntrySchema>;
export type PlayerAnswerRecord = z.infer<typeof PlayerAnswerRecordSchema>;
export type FinalQuestionOutcome = z.infer<typeof FinalQuestionOutcomeSchema>;
export type FinalPlayerResult = z.infer<typeof FinalPlayerResultSchema>;
export type FinalSessionResults = z.infer<typeof FinalSessionResultsSchema>;
export type RevealPayload = z.infer<typeof RevealPayloadSchema>;
export type PublicHostSessionState = z.infer<typeof PublicHostSessionStateSchema>;
export type PublicPlayerSessionState = z.infer<
  typeof PublicPlayerSessionStateSchema
>;

export interface QuestionRuntimeState {
  questionId: string;
  questionIndex: number;
  status: "countdown" | "open" | "closed" | "revealed";
  startedAt: number;
  endsAt: number;
  closedAt: number | null;
  revealAt: number | null;
  submissionsByPlayerId: Record<string, PlayerAnswerRecord>;
  optionStats: Record<string, number>;
}

export interface ServerPlayerState {
  playerId: string;
  socketId: string | null;
  reconnectToken: string;
  requestedName: string;
  effectiveName: string;
  normalizedKey: string;
  connected: boolean;
  joinedAt: number;
  disconnectedAt: number | null;
  lastSeenAt: number;
  score: number;
  correctCount: number;
  cumulativeResponseMs: number;
  answers: Record<string, PlayerAnswerRecord>;
  kickedAt: number | null;
}

export interface ServerSessionState {
  code: string;
  createdAt: number;
  updatedAt: number;
  phase: SessionPhase;
  host: {
    hostId: string;
    socketId: string | null;
    reconnectToken: string;
    displayName: string;
    connected: boolean;
    disconnectedAt: number | null;
    disconnectDeadline: number | null;
  };
  quiz: z.infer<typeof QuizSnapshotSchema>;
  rosterOrder: string[];
  players: Record<string, ServerPlayerState>;
  questionOrder: string[];
  currentQuestionIndex: number;
  currentQuestion?: QuestionRuntimeState;
  leaderboard: LeaderboardEntry[];
  finalResults?: FinalSessionResults;
  startedAt?: number;
  endedAt?: number;
  settings: {
    joinUrl: string;
    maxReconnectGraceMs: typeof SESSION_DEFAULTS.maxReconnectGraceMs;
    endedSessionRetentionMs: typeof SESSION_DEFAULTS.endedSessionRetentionMs;
    idleLobbyExpiryMs: typeof SESSION_DEFAULTS.idleLobbyExpiryMs;
  };
  housekeeping: {
    lastNonHostActivityAt: number;
    lastHostActivityAt: number;
    expiryAt: number | null;
  };
}
