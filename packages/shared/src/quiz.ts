import { z } from "zod";

import { QUIZ_LIMITS } from "./constants";

export const ImageAssetSchema = z.object({
  dataUrl: z.string().startsWith("data:image/"),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
  alt: z.string().max(160).optional()
});

export const AnswerOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(140)
});

export const QuestionScoringModeSchema = z.enum(["speed", "fixed"]);

const QuizQuestionBaseSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(240),
  image: ImageAssetSchema.optional(),
  options: z
    .array(AnswerOptionSchema)
    .min(QUIZ_LIMITS.minAnswers)
    .max(QUIZ_LIMITS.maxAnswers),
  correctOptionId: z.string().min(1),
  timerSeconds: z
    .number()
    .int()
    .min(QUIZ_LIMITS.minTimerSeconds)
    .max(QUIZ_LIMITS.maxTimerSeconds),
  basePoints: z
    .number()
    .int()
    .min(QUIZ_LIMITS.minBasePoints)
    .max(QUIZ_LIMITS.maxBasePoints)
    .default(QUIZ_LIMITS.defaultBasePoints),
  scoringMode: QuestionScoringModeSchema.default("speed")
});

export const QuizQuestionSchema = QuizQuestionBaseSchema.superRefine((value, ctx) => {
    const optionIds = new Set<string>();
    for (const option of value.options) {
      if (optionIds.has(option.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Answer option ids must be unique."
        });
      }
      optionIds.add(option.id);
    }

    if (!optionIds.has(value.correctOptionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctOptionId"],
        message: "Correct answer must reference one of the options."
      });
    }
  });

const AuthoredQuestionsSchema = z
  .array(QuizQuestionSchema)
  .max(QUIZ_LIMITS.maxQuestions);

const QuizSnapshotQuestionsSchema = z
  .array(QuizQuestionSchema)
  .min(1)
  .max(QUIZ_LIMITS.maxQuestions);

export const QuizSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().max(400).optional(),
  coverImage: ImageAssetSchema.optional(),
  questions: AuthoredQuestionsSchema,
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive()
});

export const QuizSnapshotSchema = QuizSchema.extend({
  questions: QuizSnapshotQuestionsSchema
});

export const PublicQuestionPayloadSchema = QuizQuestionBaseSchema.omit({
  correctOptionId: true
}).extend({
  order: z.number().int().nonnegative()
});

export type ImageAsset = z.infer<typeof ImageAssetSchema>;
export type AnswerOption = z.infer<typeof AnswerOptionSchema>;
export type QuestionScoringMode = z.infer<typeof QuestionScoringModeSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type QuizSnapshot = z.infer<typeof QuizSnapshotSchema>;
export type PublicQuestionPayload = z.infer<typeof PublicQuestionPayloadSchema>;
