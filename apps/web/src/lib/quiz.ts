import {
  QUIZ_LIMITS,
  generateId,
  type Quiz,
  QuizSchema,
  type QuizQuestion
} from "@quiz/shared";

export function createQuestion(): QuizQuestion {
  const firstOptionId = generateId();
  const secondOptionId = generateId();

  return {
    id: generateId(),
    text: "",
    options: [
      { id: firstOptionId, text: "" },
      { id: secondOptionId, text: "" }
    ],
    correctOptionId: firstOptionId,
    timerSeconds: QUIZ_LIMITS.defaultTimerSeconds,
    basePoints: QUIZ_LIMITS.defaultBasePoints,
    scoringMode: "speed"
  };
}

export function createQuiz(): Quiz {
  const now = Date.now();

  return {
    id: generateId(),
    title: "Unbenanntes Quiz",
    description: "",
    questions: [createQuestion()],
    createdAt: now,
    updatedAt: now
  };
}

export function cloneQuiz(quiz: Quiz): Quiz {
  const now = Date.now();

  return QuizSchema.parse({
    ...structuredClone(quiz),
    id: generateId(),
    title: `${quiz.title} Kopie`,
    createdAt: now,
    updatedAt: now
  });
}

export function isQuestionEmpty(question: QuizQuestion): boolean {
  const textEmpty = question.text.trim().length === 0;
  const answersEmpty = question.options.every((option) => option.text.trim().length === 0);
  return textEmpty && answersEmpty && !question.image;
}

export function sanitizeQuizForSave(quiz: Quiz): Quiz {
  return {
    ...structuredClone(quiz),
    questions: quiz.questions.filter((question) => !isQuestionEmpty(question))
  };
}

export function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  if (item === undefined) {
    return next;
  }
  next.splice(toIndex, 0, item);
  return next;
}

export function summarizeValidation(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "issues" in error) {
    return "Bitte behebe die markierten Validierungsfehler im Quiz.";
  }
  return "Das Quiz konnte nicht gespeichert werden. Bitte prüfe die Felder und versuche es erneut.";
}
