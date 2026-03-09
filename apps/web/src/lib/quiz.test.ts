import { describe, expect, it } from "vitest";

import { sanitizeQuizForSave } from "./quiz";

describe("sanitizeQuizForSave", () => {
  it("removes fully empty question cards before saving", () => {
    const result = sanitizeQuizForSave({
      id: "quiz-1",
      title: "Beispiel",
      description: "",
      createdAt: 1,
      updatedAt: 1,
      questions: [
        {
          id: "q-empty",
          text: "   ",
          options: [
            { id: "a", text: " " },
            { id: "b", text: "" }
          ],
          correctOptionId: "a",
          timerSeconds: 20,
          basePoints: 1000,
          scoringMode: "speed"
        },
        {
          id: "q-filled",
          text: "Hauptstadt von Deutschland?",
          options: [
            { id: "c", text: "Berlin" },
            { id: "d", text: "Hamburg" }
          ],
          correctOptionId: "c",
          timerSeconds: 20,
          basePoints: 1000,
          scoringMode: "speed"
        }
      ]
    });

    expect(result.questions.map((question) => question.id)).toEqual(["q-filled"]);
  });
});
