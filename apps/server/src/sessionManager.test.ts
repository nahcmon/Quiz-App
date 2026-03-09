import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuizSnapshot } from "@quiz/shared";

import { SessionManager } from "./sessionManager";

function createQuiz(): QuizSnapshot {
  return {
    id: "quiz-1",
    title: "General Knowledge",
    description: "A simple quiz",
    questions: [
      {
        id: "q-1",
        text: "Which color is the sky?",
        options: [
          { id: "a", text: "Blue" },
          { id: "b", text: "Orange" }
        ],
        correctOptionId: "a",
        timerSeconds: 10,
        basePoints: 1000,
        scoringMode: "speed"
      }
    ],
    createdAt: 1,
    updatedAt: 1
  };
}

function createFixedScoreQuiz(): QuizSnapshot {
  return {
    ...createQuiz(),
    questions: [
      {
        ...createQuiz().questions[0]!,
        scoringMode: "fixed"
      }
    ]
  };
}

describe("SessionManager", () => {
  const roomEvents: Array<{ event: string; payload: unknown }> = [];
  const socketEvents: Array<{ socketId: string; event: string; payload: unknown }> = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T10:00:00Z"));
    roomEvents.length = 0;
    socketEvents.length = 0;
  });

  it("creates a session and allows a player to join", () => {
    const manager = new SessionManager({
      joinUrlBase: "https://quiz.example.com",
      emitter: {
        emitToRoom(code, event, payload) {
          roomEvents.push({ event: `${code}:${event}`, payload });
        },
        emitToSocket(socketId, event, payload) {
          socketEvents.push({ socketId, event, payload });
        },
        disconnectSocket() {}
      }
    });

    const created = manager.createSession({
      hostName: "Host",
      quiz: createQuiz(),
      socketId: "host-socket"
    });
    const joined = manager.joinSession({
      code: created.code,
      requestedName: "Alex",
      socketId: "player-socket"
    });

    expect(created.session.joinUrl).toBe(`https://quiz.example.com/join/${created.code}`);
    expect(joined.playerName).toBe("Alex");
    expect(joined.session.roster).toHaveLength(1);
  });

  it("rejects duplicate answer submissions", () => {
    const manager = new SessionManager({
      joinUrlBase: "https://quiz.example.com",
      emitter: {
        emitToRoom(code, event, payload) {
          roomEvents.push({ event: `${code}:${event}`, payload });
        },
        emitToSocket(socketId, event, payload) {
          socketEvents.push({ socketId, event, payload });
        },
        disconnectSocket() {}
      }
    });

    const created = manager.createSession({
      hostName: "Host",
      quiz: createQuiz(),
      socketId: "host-socket"
    });
    const joined = manager.joinSession({
      code: created.code,
      requestedName: "Alex",
      socketId: "player-socket"
    });

    manager.startSession(created.code, created.hostId);
    vi.advanceTimersByTime(3_000);

    const accepted = manager.submitAnswer(created.code, joined.playerId, {
      code: created.code,
      questionIndex: 0,
      optionId: "a",
      clientSentAt: Date.now()
    });
    const duplicate = manager.submitAnswer(created.code, joined.playerId, {
      code: created.code,
      questionIndex: 0,
      optionId: "a",
      clientSentAt: Date.now()
    });

    expect(accepted.accepted).toBe(true);
    expect(duplicate).toEqual({ accepted: false, reason: "duplicate" });
  });

  it("reveals the correct answer automatically when question time expires", () => {
    const manager = new SessionManager({
      joinUrlBase: "https://quiz.example.com",
      emitter: {
        emitToRoom(code, event, payload) {
          roomEvents.push({ event: `${code}:${event}`, payload });
        },
        emitToSocket(socketId, event, payload) {
          socketEvents.push({ socketId, event, payload });
        },
        disconnectSocket() {}
      }
    });

    const created = manager.createSession({
      hostName: "Host",
      quiz: createQuiz(),
      socketId: "host-socket"
    });

    manager.startSession(created.code, created.hostId);
    vi.advanceTimersByTime(3_000);
    roomEvents.length = 0;

    vi.advanceTimersByTime(10_000);

    const session = manager.getSession(created.code);
    const currentSessionEvents = roomEvents.filter((entry) =>
      entry.event.startsWith(`${created.code}:`)
    );
    expect(session?.phase).toBe("answer_reveal");
    expect(currentSessionEvents.map((entry) => entry.event)).toEqual([
      `${created.code}:question:closed`,
      `${created.code}:session:update`,
      `${created.code}:answer:revealed`,
      `${created.code}:session:update`
    ]);
  });

  it("awards fixed points without a speed bonus when configured", () => {
    const manager = new SessionManager({
      joinUrlBase: "https://quiz.example.com",
      emitter: {
        emitToRoom(code, event, payload) {
          roomEvents.push({ event: `${code}:${event}`, payload });
        },
        emitToSocket(socketId, event, payload) {
          socketEvents.push({ socketId, event, payload });
        },
        disconnectSocket() {}
      }
    });

    const created = manager.createSession({
      hostName: "Host",
      quiz: createFixedScoreQuiz(),
      socketId: "host-socket"
    });
    const joined = manager.joinSession({
      code: created.code,
      requestedName: "Alex",
      socketId: "player-socket"
    });

    manager.startSession(created.code, created.hostId);
    vi.advanceTimersByTime(3_000);
    vi.advanceTimersByTime(1_000);

    const accepted = manager.submitAnswer(created.code, joined.playerId, {
      code: created.code,
      questionIndex: 0,
      optionId: "a",
      clientSentAt: Date.now()
    });

    expect(accepted.accepted).toBe(true);
    expect(manager.getSession(created.code)?.players[joined.playerId]?.score).toBe(1000);
  });

  it("ends the session if the host does not reconnect in time", () => {
    const manager = new SessionManager({
      joinUrlBase: "https://quiz.example.com",
      emitter: {
        emitToRoom(code, event, payload) {
          roomEvents.push({ event: `${code}:${event}`, payload });
        },
        emitToSocket(socketId, event, payload) {
          socketEvents.push({ socketId, event, payload });
        },
        disconnectSocket() {}
      }
    });

    const created = manager.createSession({
      hostName: "Host",
      quiz: createQuiz(),
      socketId: "host-socket"
    });

    manager.handleDisconnect({
      code: created.code,
      role: "host",
      actorId: created.hostId
    });
    vi.advanceTimersByTime(30_001);

    const session = manager.getSession(created.code);
    expect(session?.phase).toBe("final");
    expect(session?.finalResults?.reason).toBe("host_timeout");
  });
});
