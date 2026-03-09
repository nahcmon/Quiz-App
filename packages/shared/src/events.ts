import { z } from "zod";

import { APP_VERSION, QUIZ_LIMITS } from "./constants";
import {
  PublicQuestionPayloadSchema,
  QuizSnapshotSchema
} from "./quiz";
import {
  FinalSessionResultsSchema,
  PublicHostSessionStateSchema,
  PublicPlayerSessionStateSchema,
  PublicRosterEntrySchema,
  RevealPayloadSchema,
  SessionPhaseSchema
} from "./session";
import { zodJoinCode } from "./utils";

export const SessionProbeInputSchema = z.object({
  code: zodJoinCode()
});

export const SessionCreateInputSchema = z.object({
  hostName: z.string().trim().min(1).max(40),
  quiz: QuizSnapshotSchema,
  clientInfo: z.object({
    appVersion: z.string().default(APP_VERSION),
    reducedMotion: z.boolean(),
    publicAppUrl: z.string().url().optional()
  })
});

export const SessionReconnectInputSchema = z.object({
  code: zodJoinCode(),
  reconnectToken: z.string().min(12),
  role: z.enum(["host", "player"])
});

export const SessionJoinInputSchema = z.object({
  code: zodJoinCode(),
  requestedName: z.string().trim().min(1).max(32)
});

export const SessionStartInputSchema = z.object({
  code: zodJoinCode()
});

export const SessionOpenQuestionInputSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().min(0).max(QUIZ_LIMITS.maxQuestions - 1)
});

export const AnswerSubmitInputSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().min(0).max(QUIZ_LIMITS.maxQuestions - 1),
  optionId: z.string().min(1),
  clientSentAt: z.number().int().nonnegative()
});

export const SessionCloseQuestionInputSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().min(0).max(QUIZ_LIMITS.maxQuestions - 1)
});

export const SessionRevealAnswerInputSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().min(0).max(QUIZ_LIMITS.maxQuestions - 1)
});

export const SessionShowLeaderboardInputSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().min(0).max(QUIZ_LIMITS.maxQuestions - 1)
});

export const PlayerKickInputSchema = z.object({
  code: zodJoinCode(),
  playerId: z.string().min(1)
});

export const SessionEndInputSchema = z.object({
  code: zodJoinCode(),
  reason: z.enum(["host_ended", "host_timeout", "completed"])
});

export const SessionProbeResultSchema = z.object({
  ok: z.boolean(),
  code: zodJoinCode(),
  status: z.enum(["lobby", "live", "ended"]).optional(),
  message: z.string().optional()
});

export const SessionCreatedSchema = z.object({
  code: zodJoinCode(),
  joinUrl: z.string().url(),
  hostReconnectToken: z.string(),
  session: PublicHostSessionStateSchema
});

export const SessionJoinedSchema = z.object({
  code: zodJoinCode(),
  playerId: z.string(),
  playerName: z.string(),
  playerReconnectToken: z.string(),
  session: PublicPlayerSessionStateSchema
});

export const SessionUpdateSchema = z.object({
  code: zodJoinCode(),
  phase: SessionPhaseSchema,
  roster: z.array(PublicRosterEntrySchema).optional(),
  counts: z
    .object({
      connected: z.number().int().nonnegative(),
      total: z.number().int().nonnegative()
    })
    .optional()
});

export const QuestionOpenedSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().nonnegative(),
  question: PublicQuestionPayloadSchema,
  startedAt: z.number().int().positive(),
  endsAt: z.number().int().positive()
});

export const AnswerAcceptedSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().nonnegative(),
  lockedAt: z.number().int().positive()
});

export const AnswerRejectedSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().nonnegative(),
  reason: z.enum(["duplicate", "late", "invalid_option", "not_in_question"])
});

export const QuestionClosedSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().nonnegative(),
  closedAt: z.number().int().positive()
});

export const AnswerRevealedSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().nonnegative(),
  correctOptionId: z.string(),
  results: RevealPayloadSchema
});

export const LeaderboardShownSchema = z.object({
  code: zodJoinCode(),
  questionIndex: z.number().int().nonnegative(),
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
  )
});

export const PlayerKickedSchema = z.object({
  code: zodJoinCode(),
  playerId: z.string(),
  message: z.string()
});

export const SessionEndedSchema = z.object({
  code: zodJoinCode(),
  endedAt: z.number().int().positive(),
  reason: z.enum([
    "host_ended",
    "host_timeout",
    "completed",
    "server_restart_loss"
  ]),
  finalResults: FinalSessionResultsSchema
});

export const SessionErrorSchema = z.object({
  code: zodJoinCode().optional(),
  event: z.string(),
  message: z.string()
});

export const ReconnectAcceptedSchema = z.object({
  code: zodJoinCode(),
  role: z.enum(["host", "player"]),
  session: z.union([PublicHostSessionStateSchema, PublicPlayerSessionStateSchema])
});

export interface ClientToServerEvents {
  "session:probe": (payload: z.infer<typeof SessionProbeInputSchema>) => void;
  "session:create": (payload: z.infer<typeof SessionCreateInputSchema>) => void;
  "session:reconnect": (
    payload: z.infer<typeof SessionReconnectInputSchema>
  ) => void;
  "session:join": (payload: z.infer<typeof SessionJoinInputSchema>) => void;
  "session:start": (payload: z.infer<typeof SessionStartInputSchema>) => void;
  "session:openQuestion": (
    payload: z.infer<typeof SessionOpenQuestionInputSchema>
  ) => void;
  "answer:submit": (payload: z.infer<typeof AnswerSubmitInputSchema>) => void;
  "session:closeQuestion": (
    payload: z.infer<typeof SessionCloseQuestionInputSchema>
  ) => void;
  "session:revealAnswer": (
    payload: z.infer<typeof SessionRevealAnswerInputSchema>
  ) => void;
  "session:showLeaderboard": (
    payload: z.infer<typeof SessionShowLeaderboardInputSchema>
  ) => void;
  "player:kick": (payload: z.infer<typeof PlayerKickInputSchema>) => void;
  "session:end": (payload: z.infer<typeof SessionEndInputSchema>) => void;
}

export interface ServerToClientEvents {
  "session:probeResult": (
    payload: z.infer<typeof SessionProbeResultSchema>
  ) => void;
  "session:created": (payload: z.infer<typeof SessionCreatedSchema>) => void;
  "session:joined": (payload: z.infer<typeof SessionJoinedSchema>) => void;
  "session:update": (payload: z.infer<typeof SessionUpdateSchema>) => void;
  "question:opened": (payload: z.infer<typeof QuestionOpenedSchema>) => void;
  "answer:accepted": (payload: z.infer<typeof AnswerAcceptedSchema>) => void;
  "answer:rejected": (payload: z.infer<typeof AnswerRejectedSchema>) => void;
  "question:closed": (payload: z.infer<typeof QuestionClosedSchema>) => void;
  "answer:revealed": (payload: z.infer<typeof AnswerRevealedSchema>) => void;
  "leaderboard:shown": (
    payload: z.infer<typeof LeaderboardShownSchema>
  ) => void;
  "player:kicked": (payload: z.infer<typeof PlayerKickedSchema>) => void;
  "session:ended": (payload: z.infer<typeof SessionEndedSchema>) => void;
  "session:error": (payload: z.infer<typeof SessionErrorSchema>) => void;
  "reconnect:accepted": (
    payload: z.infer<typeof ReconnectAcceptedSchema>
  ) => void;
}

export interface SocketData {
  code?: string;
  role?: "host" | "player";
  actorId?: string;
  clientIp?: string;
}

export type SessionProbeInput = z.infer<typeof SessionProbeInputSchema>;
export type SessionProbeResult = z.infer<typeof SessionProbeResultSchema>;
export type SessionCreateInput = z.infer<typeof SessionCreateInputSchema>;
export type SessionReconnectInput = z.infer<typeof SessionReconnectInputSchema>;
export type SessionJoinInput = z.infer<typeof SessionJoinInputSchema>;
export type SessionStartInput = z.infer<typeof SessionStartInputSchema>;
export type SessionOpenQuestionInput = z.infer<
  typeof SessionOpenQuestionInputSchema
>;
export type AnswerSubmitInput = z.infer<typeof AnswerSubmitInputSchema>;
export type SessionCloseQuestionInput = z.infer<
  typeof SessionCloseQuestionInputSchema
>;
export type SessionRevealAnswerInput = z.infer<
  typeof SessionRevealAnswerInputSchema
>;
export type SessionShowLeaderboardInput = z.infer<
  typeof SessionShowLeaderboardInputSchema
>;
export type PlayerKickInput = z.infer<typeof PlayerKickInputSchema>;
export type SessionEndInput = z.infer<typeof SessionEndInputSchema>;
