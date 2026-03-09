import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@quiz/shared";

import {
  loadSettings,
  loadQuizData,
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
      autoAdvanceAfterReveal: false,
      lastJoinName: "Mila"
    });

    expect(loadSettings().lastJoinName).toBe("Mila");
  });
});
