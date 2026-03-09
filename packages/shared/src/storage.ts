import { z } from "zod";

import { STORAGE_VERSION } from "./constants";
import { QuizSchema } from "./quiz";
import { FinalSessionResultsSchema } from "./session";

export function createVersionedEnvelopeSchema<T extends z.ZodTypeAny>(
  dataSchema: T
) {
  return z.object({
    version: z.literal(STORAGE_VERSION),
    updatedAt: z.number().int().positive(),
    data: dataSchema
  });
}

export const SettingsSchema = z.object({
  motion: z.enum(["system", "full", "reduced"]).default("system"),
  soundEnabled: z.boolean().default(true),
  theme: z.enum(["system", "light"]).default("light"),
  hostDensity: z.enum(["comfortable", "compact"]).default("comfortable"),
  autoAdvanceAfterReveal: z.boolean().default(false),
  lastJoinName: z.string().trim().max(32).default("")
});

export const ReconnectRecordSchema = z.object({
  code: z.string().length(6),
  role: z.enum(["host", "player"]),
  reconnectToken: z.string().min(12),
  actorId: z.string(),
  savedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  playerName: z.string().optional()
});

export const PlayerHistoryRecordSchema = z.object({
  code: z.string().length(6),
  quizId: z.string(),
  quizTitle: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  score: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
  correctCount: z.number().int().nonnegative(),
  joinedAt: z.number().int().positive(),
  endedAt: z.number().int().positive(),
  reason: z.enum([
    "host_ended",
    "host_timeout",
    "completed",
    "server_restart_loss"
  ])
});

export const QuizzesEnvelopeSchema = createVersionedEnvelopeSchema(
  z.object({
    quizzes: z.array(QuizSchema),
    draft: QuizSchema.optional()
  })
);

export const HostResultsEnvelopeSchema = createVersionedEnvelopeSchema(
  z.array(FinalSessionResultsSchema)
);

export const PlayerHistoryEnvelopeSchema = createVersionedEnvelopeSchema(
  z.array(PlayerHistoryRecordSchema)
);

export const SettingsEnvelopeSchema = createVersionedEnvelopeSchema(SettingsSchema);
export const ReconnectEnvelopeSchema = createVersionedEnvelopeSchema(
  ReconnectRecordSchema.nullable()
);

export const QuizExportSchema = z.object({
  kind: z.literal("pulse-quiz-export"),
  version: z.literal(STORAGE_VERSION),
  exportedAt: z.number().int().positive(),
  quizzes: z.array(QuizSchema)
});

export const ResultsExportSchema = z.object({
  kind: z.literal("pulse-results-export"),
  version: z.literal(STORAGE_VERSION),
  exportedAt: z.number().int().positive(),
  hostResults: z.array(FinalSessionResultsSchema),
  playerHistory: z.array(PlayerHistoryRecordSchema)
});

export type Settings = z.infer<typeof SettingsSchema>;
export type ReconnectRecord = z.infer<typeof ReconnectRecordSchema>;
export type PlayerHistoryRecord = z.infer<typeof PlayerHistoryRecordSchema>;
export type QuizzesEnvelope = z.infer<typeof QuizzesEnvelopeSchema>;
export type HostResultsEnvelope = z.infer<typeof HostResultsEnvelopeSchema>;
export type PlayerHistoryEnvelope = z.infer<typeof PlayerHistoryEnvelopeSchema>;
export type SettingsEnvelope = z.infer<typeof SettingsEnvelopeSchema>;
export type ReconnectEnvelope = z.infer<typeof ReconnectEnvelopeSchema>;
export type QuizExport = z.infer<typeof QuizExportSchema>;
export type ResultsExport = z.infer<typeof ResultsExportSchema>;
