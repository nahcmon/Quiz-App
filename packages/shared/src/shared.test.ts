import { describe, expect, it } from "vitest";

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH, STORAGE_VERSION } from "./constants";
import { SessionJoinInputSchema } from "./events";
import { QuizSchema, QuizSnapshotSchema } from "./quiz";
import { calculateScore, rankLeaderboard } from "./scoring";
import {
  HostResultsEnvelopeSchema,
  QuizzesEnvelopeSchema
} from "./storage";

describe("shared score helpers", () => {
  it("calculates a speed bonus from remaining time", () => {
    expect(
      calculateScore({ basePoints: 1000, durationMs: 20_000, remainingMs: 10_000 })
    ).toBe(1250);
  });

  it("returns fixed points when speed should not matter", () => {
    expect(
      calculateScore({
        basePoints: 1000,
        durationMs: 20_000,
        remainingMs: 19_500,
        scoringMode: "fixed"
      })
    ).toBe(1000);
  });

  it("keeps leaderboard sorting deterministic", () => {
    const ranked = rankLeaderboard(
      [
        {
          playerId: "b",
          playerName: "B",
          score: 2000,
          correctCount: 2,
          cumulativeResponseMs: 2000,
          connected: true
        },
        {
          playerId: "a",
          playerName: "A",
          score: 2000,
          correctCount: 2,
          cumulativeResponseMs: 2000,
          connected: true
        }
      ],
      { a: 0, b: 1 }
    );

    expect(ranked.map((entry) => entry.playerId)).toEqual(["a", "b"]);
  });
});

describe("quiz schema", () => {
  it("allows authored quizzes without any saved questions", () => {
    const result = QuizSchema.safeParse({
      id: "quiz-1",
      title: "Example",
      questions: [],
      createdAt: 1,
      updatedAt: 1
    });

    expect(result.success).toBe(true);
  });

  it("requires at least one question for a live quiz snapshot", () => {
    const result = QuizSnapshotSchema.safeParse({
      id: "quiz-1",
      title: "Example",
      questions: [],
      createdAt: 1,
      updatedAt: 1
    });

    expect(result.success).toBe(false);
  });

  it("requires the correct answer to exist", () => {
    const result = QuizSchema.safeParse({
      id: "quiz-1",
      title: "Example",
      questions: [
        {
          id: "q1",
          text: "Capital?",
          options: [
            { id: "a", text: "Berlin" },
            { id: "b", text: "Paris" }
          ],
          correctOptionId: "missing",
          timerSeconds: 20,
          basePoints: 1000,
          scoringMode: "speed"
        }
      ],
      createdAt: 1,
      updatedAt: 1
    });

    expect(result.success).toBe(false);
  });

  it("defaults question scoring mode to speed", () => {
    const result = QuizSchema.parse({
      id: "quiz-1",
      title: "Example",
      questions: [
        {
          id: "q1",
          text: "Capital?",
          options: [
            { id: "a", text: "Berlin" },
            { id: "b", text: "Paris" }
          ],
          correctOptionId: "a",
          timerSeconds: 20,
          basePoints: 1000,
          scoringMode: "speed"
        }
      ],
      createdAt: 1,
      updatedAt: 1
    });

    expect(result.questions[0]?.scoringMode).toBe("speed");
  });
});

describe("storage envelopes", () => {
  it("parses authored quizzes envelope", () => {
    expect(
      QuizzesEnvelopeSchema.parse({
        version: STORAGE_VERSION,
        updatedAt: Date.now(),
        data: { quizzes: [] }
      }).data.quizzes
    ).toEqual([]);
  });

  it("parses host results envelope", () => {
    expect(
      HostResultsEnvelopeSchema.parse({
        version: STORAGE_VERSION,
        updatedAt: Date.now(),
        data: []
      }).data
    ).toEqual([]);
  });
});

describe("join input normalization", () => {
  it("normalizes codes to uppercase", () => {
    const parsed = SessionJoinInputSchema.parse({
      code: "ab23cd",
      requestedName: "Player"
    });

    expect(parsed.code).toHaveLength(JOIN_CODE_LENGTH);
    for (const character of parsed.code) {
      expect(JOIN_CODE_ALPHABET.includes(character)).toBe(true);
    }
  });
});
