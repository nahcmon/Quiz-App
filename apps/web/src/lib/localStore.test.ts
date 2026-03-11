import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@quiz/shared";

import {
  loadHostResults,
  loadSettings,
  loadQuizData,
  saveHostResults,
  saveSettings,
  saveQuizData
} from "./localStore";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("local storage helpers", () => {
  it("round-trips quiz storage", () => {
    saveQuizData({
      quizzes: [
        {
          id: "quiz-1",
          title: "Stored quiz",
          description: "desc",
          questions: [
            {
              id: "q-1",
              text: "Question",
              options: [
                { id: "a", text: "A" },
                { id: "b", text: "B" }
              ],
              correctOptionId: "a",
              timerSeconds: 20,
              basePoints: 1000,
              scoringMode: "speed"
            }
          ],
          createdAt: 1,
          updatedAt: 1
        }
      ]
    });

    expect(loadQuizData().quizzes).toHaveLength(1);
  });

  it("round-trips complete final session results with all players", () => {
    saveHostResults([
      {
        code: "ABC123",
        quizId: "quiz-1",
        quizTitle: "Fragerunde",
        startedAt: 1,
        endedAt: 2,
        reason: "completed",
        totalPlayers: 2,
        leaderboard: [
          {
            playerId: "p1",
            playerName: "Mila",
            score: 1500,
            rank: 1,
            correctCount: 2,
            cumulativeResponseMs: 4200,
            connected: true
          },
          {
            playerId: "p2",
            playerName: "Noah",
            score: 1000,
            rank: 2,
            correctCount: 1,
            cumulativeResponseMs: 5200,
            connected: true
          }
        ],
        players: [
          {
            playerId: "p1",
            playerName: "Mila",
            rank: 1,
            score: 1500,
            correctCount: 2,
            cumulativeResponseMs: 4200,
            joinedAt: 1,
            connectedAtEnd: true,
            answers: []
          },
          {
            playerId: "p2",
            playerName: "Noah",
            rank: 2,
            score: 1000,
            correctCount: 1,
            cumulativeResponseMs: 5200,
            joinedAt: 1,
            connectedAtEnd: true,
            answers: []
          }
        ],
        questions: [
          {
            questionId: "q1",
            questionText: "Frage 1",
            correctOptionId: "a",
            optionStats: { a: 1, b: 1 }
          }
        ]
      }
    ]);

    const [saved] = loadHostResults();
    expect(saved).toBeDefined();
    if (!saved) {
      throw new Error("Kein gespeichertes Ergebnis gefunden.");
    }

    expect(saved.totalPlayers).toBe(2);
    expect(saved.leaderboard).toHaveLength(2);
    expect(saved.players.map((player) => player.playerName)).toEqual(["Mila", "Noah"]);
  });

  it("drops corrupt quiz storage and dispatches a warning", () => {
    const listener = vi.fn();
    window.addEventListener("pulsequiz:storage-warning", listener);
    window.localStorage.setItem(STORAGE_KEYS.quizzes, "{broken");

    expect(loadQuizData().quizzes).toEqual([]);
    expect(listener).toHaveBeenCalled();
  });

  it("round-trips the last used join name in settings", () => {
    saveSettings({
      motion: "system",
      soundEnabled: true,
      theme: "light",
      hostDensity: "comfortable",
      autoAdvanceAfterReveal: true,
      lastJoinName: "Mila"
    });

    expect(loadSettings().lastJoinName).toBe("Mila");
  });

  it("defaults auto-advance to enabled when no settings are stored", () => {
    expect(loadSettings().autoAdvanceAfterReveal).toBe(true);
  });
});
