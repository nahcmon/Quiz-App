import { create } from "zustand";

import type {
  PlayerHistoryRecord,
  PublicHostSessionState,
  PublicPlayerSessionState,
  Quiz,
  RevealPayload
} from "@quiz/shared";
import {
  APP_VERSION,
  ReconnectRecordSchema,
  SessionProbeResultSchema,
  type SessionProbeResult,
  normalizeJoinCode
} from "@quiz/shared";

import {
  loadReconnectRecord,
  saveReconnectRecord
} from "../lib/localStore";
import { env } from "../lib/env";
import { getSocket } from "../lib/socket";
import { useLibraryStore } from "./useLibraryStore";
import { useSettingsStore } from "./useSettingsStore";

type SessionRole = "host" | "player" | null;
type SessionView = PublicHostSessionState | PublicPlayerSessionState | null;
type SessionPatch =
  | Partial<PublicHostSessionState>
  | Partial<PublicPlayerSessionState>;

interface SessionState {
  initialized: boolean;
  connected: boolean;
  loading: boolean;
  role: SessionRole;
  code: string | null;
  actorId: string | null;
  reconnectToken: string | null;
  session: SessionView;
  reveal: RevealPayload | null;
  probeResult: SessionProbeResult | null;
  error: string | null;
  pendingAnswerOptionId: string | null;
  initialize: () => void;
  clearError: () => void;
  probeCode: (code: string) => void;
  createSession: (quiz: Quiz, hostName?: string) => void;
  joinSession: (code: string, displayName: string) => void;
  attemptReconnect: (code: string, role: "host" | "player") => boolean;
  startSession: () => void;
  openQuestion: (questionIndex: number) => void;
  closeQuestion: (questionIndex: number) => void;
  revealAnswer: (questionIndex: number) => void;
  showLeaderboard: (questionIndex: number) => void;
  kickPlayer: (playerId: string) => void;
  endSession: (reason: "host_ended" | "completed") => void;
  submitAnswer: (questionIndex: number, optionId: string) => void;
  reset: () => void;
}

function mergeSessionPatch(current: SessionView, patch: SessionPatch): SessionView {
  if (!current) {
    return current;
  }
  if (current.role === "host") {
    return {
      ...current,
      ...patch
    } as PublicHostSessionState;
  }
  return {
    ...current,
    ...patch
  } as PublicPlayerSessionState;
}

function persistReconnect(
  code: string,
  role: "host" | "player",
  reconnectToken: string,
  actorId: string,
  playerName?: string
) {
  saveReconnectRecord(
    ReconnectRecordSchema.parse({
      code,
      role,
      reconnectToken,
      actorId,
      savedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60_000,
      playerName
    })
  );
}

export const useSessionStore = create<SessionState>((set, get) => ({
  initialized: false,
  connected: false,
  loading: false,
  role: null,
  code: null,
  actorId: null,
  reconnectToken: null,
  session: null,
  reveal: null,
  probeResult: null,
  error: null,
  pendingAnswerOptionId: null,
  initialize: () => {
    if (get().initialized) {
      return;
    }

    const socket = getSocket();
    socket.on("connect", () => set({ connected: true }));
    socket.on("disconnect", () => set({ connected: false }));
    socket.on("session:error", (payload) =>
      set({
        error: payload.message,
        loading: false
      })
    );
    socket.on("session:probeResult", (payload) =>
      set({
        probeResult: SessionProbeResultSchema.parse(payload),
        loading: false
      })
    );
    socket.on("session:created", (payload) => {
      persistReconnect(
        payload.code,
        "host",
        payload.hostReconnectToken,
        `host:${payload.code}`
      );
      set({
        loading: false,
        role: "host",
        code: payload.code,
        actorId: `host:${payload.code}`,
        reconnectToken: payload.hostReconnectToken,
        session: payload.session,
        reveal: null,
        error: null
      });
    });
    socket.on("session:joined", (payload) => {
      persistReconnect(
        payload.code,
        "player",
        payload.playerReconnectToken,
        payload.playerId,
        payload.playerName
      );
      set({
        loading: false,
        role: "player",
        code: payload.code,
        actorId: payload.playerId,
        reconnectToken: payload.playerReconnectToken,
        session: payload.session,
        reveal: null,
        error: null
      });
    });
    socket.on("reconnect:accepted", (payload) => {
      const reconnect = loadReconnectRecord();
      set({
        loading: false,
        role: payload.role,
        code: payload.code,
        actorId: reconnect?.actorId ?? null,
        reconnectToken: reconnect?.reconnectToken ?? null,
        session: payload.session,
        error: null
      });
    });
    socket.on("session:update", (payload) =>
      set((state) => ({
        session:
          state.code === payload.code
            ? mergeSessionPatch(state.session, {
                phase: payload.phase,
                roster: payload.roster ?? state.session?.roster,
                counts: payload.counts ?? state.session?.counts
              })
            : state.session
      }))
    );
    socket.on("question:opened", (payload) =>
      set((state) => ({
        reveal: null,
        session:
          state.code === payload.code
            ? mergeSessionPatch(state.session, {
                phase: "question_open",
                currentQuestionIndex: payload.questionIndex,
                question: payload.question,
                questionStartedAt: payload.startedAt,
                questionEndsAt: payload.endsAt,
                revealedCorrectOptionId: undefined,
                lockedAnswerOptionId:
                  state.role === "player" ? null : undefined
              })
            : state.session
      }))
    );
    socket.on("answer:accepted", (payload) =>
      set((state) => ({
        pendingAnswerOptionId: null,
        session:
          state.code === payload.code && state.role === "player"
            ? mergeSessionPatch(state.session, {
                lockedAnswerOptionId: state.pendingAnswerOptionId
              })
            : state.session
      }))
    );
    socket.on("question:closed", (payload) =>
      set((state) => ({
        session:
          state.code === payload.code
            ? mergeSessionPatch(state.session, {
                phase: "question_closed"
              })
            : state.session
      }))
    );
    socket.on("answer:revealed", (payload) =>
      set((state) => ({
        reveal: payload.results,
        session:
          state.code === payload.code
            ? mergeSessionPatch(state.session, {
                phase: "answer_reveal",
                revealedCorrectOptionId: payload.correctOptionId
              })
            : state.session
      }))
    );
    socket.on("leaderboard:shown", (payload) =>
      set((state) => ({
        session:
          state.code === payload.code
            ? mergeSessionPatch(state.session, {
                phase: "leaderboard",
                leaderboard: payload.leaderboard
              })
            : state.session
      }))
    );
    socket.on("session:ended", (payload) => {
      const state = get();
      const library = useLibraryStore.getState();
      if (state.role === "host") {
        library.saveHostResult(payload.finalResults);
      } else if (state.role === "player" && state.actorId) {
        const player = payload.finalResults.players.find(
          (candidate) => candidate.playerId === state.actorId
        );
        if (player) {
          const record: PlayerHistoryRecord = {
            code: payload.code,
            quizId: payload.finalResults.quizId,
            quizTitle: payload.finalResults.quizTitle,
            playerId: player.playerId,
            playerName: player.playerName,
            score: player.score,
            rank: player.rank,
            correctCount: player.correctCount,
            joinedAt: player.joinedAt,
            endedAt: payload.endedAt,
            reason: payload.reason
          };
          library.savePlayerRecord(record);
        }
      }

      set((current) => ({
        reveal: null,
        session:
          current.code === payload.code
            ? mergeSessionPatch(current.session, {
                phase: "final",
                endedAt: payload.endedAt,
                finalResults: payload.finalResults,
                leaderboard: payload.finalResults.leaderboard
              })
            : current.session
      }));
    });
    socket.on("player:kicked", (payload) => {
      saveReconnectRecord(null);
      set((state) => ({
        error:
          state.code === payload.code ? payload.message : state.error,
        role: state.code === payload.code ? null : state.role,
        code: state.code === payload.code ? null : state.code,
        actorId: state.code === payload.code ? null : state.actorId,
        reconnectToken:
          state.code === payload.code ? null : state.reconnectToken,
        session: state.code === payload.code ? null : state.session
      }));
    });

    set({ initialized: true });
  },
  clearError: () => set({ error: null }),
  probeCode: (code) => {
    get().initialize();
    set({
      loading: true,
      error: null,
      probeResult: null
    });
    getSocket().emit("session:probe", {
      code: normalizeJoinCode(code)
    });
  },
  createSession: (quiz, hostName = "Moderator") => {
    get().initialize();
    if (quiz.questions.length === 0) {
      set({
        loading: false,
        error:
          "Dieses Quiz enthält keine Fragen. Füge mindestens eine nicht-leere Frage hinzu, bevor du live gehst.",
        reveal: null
      });
      return;
    }
    const settings = useSettingsStore.getState().settings;
    set({
      loading: true,
      error: null,
      reveal: null
    });
    getSocket().emit("session:create", {
      hostName,
      quiz,
      clientInfo: {
        appVersion: APP_VERSION,
        reducedMotion: settings.motion === "reduced",
        publicAppUrl: env.publicAppUrl
      }
    });
  },
  joinSession: (code, displayName) => {
    get().initialize();
    set({
      loading: true,
      error: null
    });
    getSocket().emit("session:join", {
      code: normalizeJoinCode(code),
      requestedName: displayName
    });
  },
  attemptReconnect: (code, role) => {
    get().initialize();
    const reconnect = loadReconnectRecord();
    if (
      !reconnect ||
      reconnect.code !== normalizeJoinCode(code) ||
      reconnect.role !== role ||
      reconnect.expiresAt < Date.now()
    ) {
      return false;
    }

    set({
      loading: true,
      error: null
    });
    getSocket().emit("session:reconnect", {
      code: reconnect.code,
      reconnectToken: reconnect.reconnectToken,
      role
    });
    return true;
  },
  startSession: () => {
    const { code } = get();
    if (!code) {
      return;
    }
    getSocket().emit("session:start", { code });
  },
  openQuestion: (questionIndex) => {
    const { code } = get();
    if (!code) {
      return;
    }
    getSocket().emit("session:openQuestion", { code, questionIndex });
  },
  closeQuestion: (questionIndex) => {
    const { code } = get();
    if (!code) {
      return;
    }
    getSocket().emit("session:closeQuestion", { code, questionIndex });
  },
  revealAnswer: (questionIndex) => {
    const { code } = get();
    if (!code) {
      return;
    }
    getSocket().emit("session:revealAnswer", { code, questionIndex });
  },
  showLeaderboard: (questionIndex) => {
    const { code } = get();
    if (!code) {
      return;
    }
    getSocket().emit("session:showLeaderboard", { code, questionIndex });
  },
  kickPlayer: (playerId) => {
    const { code } = get();
    if (!code) {
      return;
    }
    getSocket().emit("player:kick", { code, playerId });
  },
  endSession: (reason) => {
    const { code } = get();
    if (!code) {
      return;
    }
    getSocket().emit("session:end", { code, reason });
  },
  submitAnswer: (questionIndex, optionId) => {
    const { code } = get();
    if (!code) {
      return;
    }
    set({
      pendingAnswerOptionId: optionId
    });
    getSocket().emit("answer:submit", {
      code,
      questionIndex,
      optionId,
      clientSentAt: Date.now()
    });
  },
  reset: () => {
    saveReconnectRecord(null);
    set({
      loading: false,
      role: null,
      code: null,
      actorId: null,
      reconnectToken: null,
      session: null,
      reveal: null,
      probeResult: null,
      error: null,
      pendingAnswerOptionId: null
    });
  }
}));
