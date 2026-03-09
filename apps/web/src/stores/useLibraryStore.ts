import { create } from "zustand";

import type {
  FinalSessionResults,
  PlayerHistoryRecord,
  Quiz,
  QuizExport,
  ResultsExport
} from "@quiz/shared";
import { QuizExportSchema, ResultsExportSchema } from "@quiz/shared";

import {
  STORAGE_WARNING_EVENT,
  buildQuizExport,
  buildResultsExport,
  loadHostResults,
  loadPlayerHistory,
  loadQuizData,
  saveHostResults,
  savePlayerHistory,
  saveQuizData
} from "../lib/localStore";
import { cloneQuiz } from "../lib/quiz";

interface LibraryState {
  initialized: boolean;
  quizzes: Quiz[];
  draft?: Quiz;
  hostResults: FinalSessionResults[];
  playerHistory: PlayerHistoryRecord[];
  storageWarnings: string[];
  hydrate: () => void;
  setDraft: (draft?: Quiz) => void;
  saveQuiz: (quiz: Quiz) => void;
  deleteQuiz: (quizId: string) => void;
  duplicateQuiz: (quizId: string) => void;
  saveHostResult: (result: FinalSessionResults) => void;
  savePlayerRecord: (record: PlayerHistoryRecord) => void;
  importQuizExport: (payload: QuizExport) => void;
  importResultsExport: (payload: ResultsExport) => void;
  exportQuizData: () => QuizExport;
  exportResultsData: () => ResultsExport;
  findQuiz: (quizId: string) => Quiz | undefined;
}

function persistQuizState(quizzes: Quiz[], draft?: Quiz) {
  saveQuizData({
    quizzes,
    draft
  });
}

function sortByUpdatedAt(quizzes: Quiz[]) {
  return [...quizzes].sort((left, right) => right.updatedAt - left.updatedAt);
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  initialized: false,
  quizzes: [],
  draft: undefined,
  hostResults: [],
  playerHistory: [],
  storageWarnings: [],
  hydrate: () => {
    if (get().initialized) {
      return;
    }

    const quizData = loadQuizData();
    set({
      initialized: true,
      quizzes: sortByUpdatedAt(quizData.quizzes),
      draft: quizData.draft,
      hostResults: loadHostResults().sort((left, right) => right.endedAt - left.endedAt),
      playerHistory: loadPlayerHistory().sort((left, right) => right.endedAt - left.endedAt)
    });

    window.addEventListener(STORAGE_WARNING_EVENT, (event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      set((state) => ({
        storageWarnings: [...state.storageWarnings, customEvent.detail.message]
      }));
    });
  },
  setDraft: (draft) =>
    set((state) => {
      persistQuizState(state.quizzes, draft);
      return { draft };
    }),
  saveQuiz: (quiz) =>
    set((state) => {
      const nextQuiz = {
        ...quiz,
        updatedAt: Date.now()
      };
      const others = state.quizzes.filter((candidate) => candidate.id !== quiz.id);
      const quizzes = sortByUpdatedAt([nextQuiz, ...others]);
      persistQuizState(quizzes, undefined);
      return {
        quizzes,
        draft: undefined
      };
    }),
  deleteQuiz: (quizId) =>
    set((state) => {
      const quizzes = state.quizzes.filter((quiz) => quiz.id !== quizId);
      persistQuizState(quizzes, state.draft?.id === quizId ? undefined : state.draft);
      return {
        quizzes,
        draft: state.draft?.id === quizId ? undefined : state.draft
      };
    }),
  duplicateQuiz: (quizId) =>
    set((state) => {
      const original = state.quizzes.find((quiz) => quiz.id === quizId);
      if (!original) {
        return state;
      }

      const quizzes = sortByUpdatedAt([cloneQuiz(original), ...state.quizzes]);
      persistQuizState(quizzes, state.draft);
      return { quizzes };
    }),
  saveHostResult: (result) =>
    set((state) => {
      const hostResults = [
        result,
        ...state.hostResults.filter(
          (candidate) =>
            !(candidate.code === result.code && candidate.endedAt === result.endedAt)
        )
      ].sort((left, right) => right.endedAt - left.endedAt);
      saveHostResults(hostResults);
      return { hostResults };
    }),
  savePlayerRecord: (record) =>
    set((state) => {
      const playerHistory = [
        record,
        ...state.playerHistory.filter(
          (candidate) =>
            !(
              candidate.code === record.code &&
              candidate.playerId === record.playerId &&
              candidate.endedAt === record.endedAt
            )
        )
      ].sort((left, right) => right.endedAt - left.endedAt);
      savePlayerHistory(playerHistory);
      return { playerHistory };
    }),
  importQuizExport: (payload) =>
    set((state) => {
      const parsed = QuizExportSchema.parse(payload);
      const map = new Map(state.quizzes.map((quiz) => [quiz.id, quiz]));
      for (const quiz of parsed.quizzes) {
        map.set(quiz.id, quiz);
      }
      const quizzes = sortByUpdatedAt([...map.values()]);
      persistQuizState(quizzes, state.draft);
      return { quizzes };
    }),
  importResultsExport: (payload) =>
    set((state) => {
      const parsed = ResultsExportSchema.parse(payload);
      const hostResults = [...parsed.hostResults, ...state.hostResults].sort(
        (left, right) => right.endedAt - left.endedAt
      );
      const playerHistory = [...parsed.playerHistory, ...state.playerHistory].sort(
        (left, right) => right.endedAt - left.endedAt
      );
      saveHostResults(hostResults);
      savePlayerHistory(playerHistory);
      return { hostResults, playerHistory };
    }),
  exportQuizData: () => buildQuizExport(get().quizzes),
  exportResultsData: () =>
    buildResultsExport(get().hostResults, get().playerHistory),
  findQuiz: (quizId) => get().quizzes.find((quiz) => quiz.id === quizId)
}));
