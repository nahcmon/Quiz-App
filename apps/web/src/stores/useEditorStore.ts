import { create } from "zustand";

import { QuizSchema, type Quiz } from "@quiz/shared";

import { useLibraryStore } from "./useLibraryStore";
import {
  createQuestion,
  createQuiz,
  reorderList,
  sanitizeQuizForSave,
  summarizeValidation
} from "../lib/quiz";

interface EditorState {
  draft: Quiz;
  validationMessage: string | null;
  lastSavedAt: number | null;
  startNew: () => void;
  loadQuiz: (quiz?: Quiz) => void;
  updateMeta: (patch: Partial<Pick<Quiz, "title" | "description" | "coverImage">>) => void;
  addQuestion: () => void;
  updateQuestion: (
    questionId: string,
    updater: (question: Quiz["questions"][number]) => Quiz["questions"][number]
  ) => void;
  removeQuestion: (questionId: string) => void;
  moveQuestion: (questionId: string, direction: -1 | 1) => void;
  saveDraftLocally: () => void;
  saveQuiz: () => { ok: boolean; quizId?: string };
  clearValidation: () => void;
}

function bump(quiz: Quiz): Quiz {
  return {
    ...quiz,
    updatedAt: Date.now()
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  draft: createQuiz(),
  validationMessage: null,
  lastSavedAt: null,
  startNew: () =>
    set({
      draft: createQuiz(),
      validationMessage: null,
      lastSavedAt: null
    }),
  loadQuiz: (quiz) =>
    set({
      draft: structuredClone(quiz ?? createQuiz()),
      validationMessage: null,
      lastSavedAt: null
    }),
  updateMeta: (patch) =>
    set((state) => ({
      draft: bump({
        ...state.draft,
        ...patch
      })
    })),
  addQuestion: () =>
    set((state) => ({
      draft: bump({
        ...state.draft,
        questions: [...state.draft.questions, createQuestion()]
      })
    })),
  updateQuestion: (questionId, updater) =>
    set((state) => ({
      draft: bump({
        ...state.draft,
        questions: state.draft.questions.map((question) =>
          question.id === questionId ? updater(question) : question
        )
      })
    })),
  removeQuestion: (questionId) =>
    set((state) => ({
      draft: bump({
        ...state.draft,
        questions:
          state.draft.questions.length === 1
            ? state.draft.questions
            : state.draft.questions.filter((question) => question.id !== questionId)
      })
    })),
  moveQuestion: (questionId, direction) =>
    set((state) => {
      const currentIndex = state.draft.questions.findIndex(
        (question) => question.id === questionId
      );
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= state.draft.questions.length) {
        return state;
      }
      return {
        draft: bump({
          ...state.draft,
          questions: reorderList(state.draft.questions, currentIndex, nextIndex)
        })
      };
    }),
  saveDraftLocally: () =>
    set((state) => {
      useLibraryStore.getState().setDraft(state.draft);
      return {
        lastSavedAt: Date.now()
      };
    }),
  saveQuiz: () => {
    const sanitizedDraft = sanitizeQuizForSave(get().draft);
    const parsed = QuizSchema.safeParse(sanitizedDraft);
    if (!parsed.success) {
      set({
        validationMessage: summarizeValidation(parsed.error)
      });
      return { ok: false };
    }

    useLibraryStore.getState().saveQuiz(parsed.data);
    set({
      validationMessage: null,
      lastSavedAt: Date.now(),
      draft: parsed.data
    });
    return {
      ok: true,
      quizId: parsed.data.id
    };
  },
  clearValidation: () => set({ validationMessage: null })
}));
