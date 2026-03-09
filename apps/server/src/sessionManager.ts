import {
  type AnswerSubmitInput,
  type ClientToServerEvents,
  type FinalPlayerResult,
  FinalSessionResultsSchema,
  type FinalSessionResults,
  type LeaderboardEntry,
  type PlayerAnswerRecord,
  PublicHostSessionStateSchema,
  type PublicHostSessionState,
  type PublicPlayerSessionState,
  PublicPlayerSessionStateSchema,
  type PublicQuestionPayload,
  type PublicRosterEntry,
  QUIZ_LIMITS,
  type QuizQuestion,
  type QuizSnapshot,
  QuizSnapshotSchema,
  type RevealPayload,
  RevealPayloadSchema,
  SESSION_DEFAULTS,
  SessionPhaseSchema,
  type ServerPlayerState,
  type ServerSessionState,
  calculateScore,
  normalizeName,
  rankLeaderboard,
  serializeBytes
} from "@quiz/shared";

import { createActorId, createReconnectToken, generateJoinCode, probeStatus } from "./code";

type OutboundEvent = Extract<
  keyof import("@quiz/shared").ServerToClientEvents,
  string
>;

interface SessionTimers {
  countdown?: NodeJS.Timeout;
  question?: NodeJS.Timeout;
  hostDisconnect?: NodeJS.Timeout;
  cleanup?: NodeJS.Timeout;
  lobbyExpiry?: NodeJS.Timeout;
}

export interface SessionEmitter {
  emitToRoom(
    code: string,
    event: OutboundEvent,
    payload: unknown
  ): void;
  emitToSocket(
    socketId: string,
    event: OutboundEvent,
    payload: unknown
  ): void;
  disconnectSocket(socketId: string): void;
}

export class SessionManagerError extends Error {
  constructor(
    public readonly event: keyof ClientToServerEvents | "internal",
    message: string
  ) {
    super(message);
  }
}

export interface SessionManagerOptions {
  joinUrlBase: string;
  emitter: SessionEmitter;
  now?: () => number;
}

export class SessionManager {
  private readonly sessions = new Map<string, ServerSessionState>();
  private readonly timers = new Map<string, SessionTimers>();
  private readonly now: () => number;

  constructor(private readonly options: SessionManagerOptions) {
    this.now = options.now ?? (() => Date.now());
  }

  listCodes(): string[] {
    return [...this.sessions.keys()];
  }

  getProbeResult(code: string) {
    const session = this.sessions.get(code);
    if (!session) {
      return {
        ok: false,
        code,
        message: "Für diesen Code gibt es keine aktive Sitzung."
      };
    }

    const status = probeStatus(session.phase);
    if (status !== "lobby") {
      return {
        ok: false,
        code,
        status,
        message:
          status === "live"
            ? "Diese Sitzung läuft bereits."
            : "Diese Sitzung ist bereits beendet."
      };
    }

    return {
      ok: true,
      code,
      status
    };
  }

  createSession(input: {
    hostName: string;
    quiz: QuizSnapshot;
    socketId: string;
    joinUrlBase?: string;
  }): {
    code: string;
    hostId: string;
    hostReconnectToken: string;
    session: PublicHostSessionState;
  } {
    const quiz = QuizSnapshotSchema.parse(input.quiz);
    this.assertValidQuizSnapshot(quiz);

    const now = this.now();
    const code = generateJoinCode(new Set(this.sessions.keys()));
    const hostId = createActorId();
    const hostReconnectToken = createReconnectToken();
    const joinUrl = this.buildJoinUrl(code, input.joinUrlBase);

    const session: ServerSessionState = {
      code,
      createdAt: now,
      updatedAt: now,
      phase: SessionPhaseSchema.parse("lobby"),
      host: {
        hostId,
        socketId: input.socketId,
        reconnectToken: hostReconnectToken,
        displayName: normalizeName(input.hostName),
        connected: true,
        disconnectedAt: null,
        disconnectDeadline: null
      },
      quiz,
      rosterOrder: [],
      players: {},
      questionOrder: quiz.questions.map((question) => question.id),
      currentQuestionIndex: 0,
      currentQuestion: undefined,
      leaderboard: [],
      settings: {
        joinUrl,
        maxReconnectGraceMs: SESSION_DEFAULTS.maxReconnectGraceMs,
        endedSessionRetentionMs: SESSION_DEFAULTS.endedSessionRetentionMs,
        idleLobbyExpiryMs: SESSION_DEFAULTS.idleLobbyExpiryMs
      },
      housekeeping: {
        lastNonHostActivityAt: now,
        lastHostActivityAt: now,
        expiryAt: now + SESSION_DEFAULTS.idleLobbyExpiryMs
      }
    };

    this.sessions.set(code, session);
    this.scheduleLobbyExpiry(session);

    return {
      code,
      hostId,
      hostReconnectToken,
      session: this.buildHostSessionState(session)
    };
  }

  joinSession(input: {
    code: string;
    requestedName: string;
    socketId: string;
  }): {
    playerId: string;
    playerReconnectToken: string;
    playerName: string;
    session: PublicPlayerSessionState;
  } {
    const session = this.requireSession(input.code, "session:join");
    if (session.phase !== "lobby") {
      throw new SessionManagerError(
        "session:join",
        "Spieler können nur beitreten, solange sich die Sitzung noch in der Lobby befindet."
      );
    }

    const now = this.now();
    const playerId = createActorId();
    const reconnectToken = createReconnectToken();
    const requestedName = normalizeName(input.requestedName);
    const effectiveName = this.allocatePlayerName(session, requestedName);
    const normalizedKey = effectiveName.toLowerCase();

    session.players[playerId] = {
      playerId,
      socketId: input.socketId,
      reconnectToken,
      requestedName,
      effectiveName,
      normalizedKey,
      connected: true,
      joinedAt: now,
      disconnectedAt: null,
      lastSeenAt: now,
      score: 0,
      correctCount: 0,
      cumulativeResponseMs: 0,
      answers: {},
      kickedAt: null
    };
    session.rosterOrder.push(playerId);
    session.updatedAt = now;
    session.housekeeping.lastNonHostActivityAt = now;

    return {
      playerId,
      playerReconnectToken: reconnectToken,
      playerName: effectiveName,
      session: this.buildPlayerSessionState(session, playerId)
    };
  }

  reconnectSession(input: {
    code: string;
    reconnectToken: string;
    role: "host" | "player";
    socketId: string;
  }): {
    role: "host" | "player";
    actorId: string;
    session: PublicHostSessionState | PublicPlayerSessionState;
  } {
    const session = this.requireSession(input.code, "session:reconnect");
    const now = this.now();

    if (input.role === "host") {
      if (session.host.reconnectToken !== input.reconnectToken) {
        throw new SessionManagerError("session:reconnect", "Reconnect-Token stimmt nicht überein.");
      }

      session.host.socketId = input.socketId;
      session.host.connected = true;
      session.host.disconnectedAt = null;
      session.host.disconnectDeadline = null;
      session.updatedAt = now;
      session.housekeeping.lastHostActivityAt = now;
      this.clearTimer(input.code, "hostDisconnect");

      return {
        role: "host",
        actorId: session.host.hostId,
        session: this.buildHostSessionState(session)
      };
    }

    const player = Object.values(session.players).find(
      (candidate) => candidate.reconnectToken === input.reconnectToken
    );

    if (!player || player.kickedAt) {
      throw new SessionManagerError("session:reconnect", "Reconnect-Token stimmt nicht überein.");
    }

    player.socketId = input.socketId;
    player.connected = true;
    player.disconnectedAt = null;
    player.lastSeenAt = now;
    session.updatedAt = now;
    session.housekeeping.lastNonHostActivityAt = now;

    return {
      role: "player",
      actorId: player.playerId,
      session: this.buildPlayerSessionState(session, player.playerId)
    };
  }

  startSession(code: string, hostId: string): void {
    const session = this.requireHostSession(code, hostId, "session:start");
    if (session.phase !== "lobby") {
      throw new SessionManagerError("session:start", "Die Sitzung wurde bereits gestartet.");
    }

    const now = this.now();
    session.phase = "countdown";
    session.startedAt = now;
    session.updatedAt = now;
    session.housekeeping.lastHostActivityAt = now;
    this.clearTimer(code, "lobbyExpiry");
    this.broadcastSessionUpdate(session);

    const timers = this.ensureTimers(code);
    timers.countdown = setTimeout(() => {
      if (!this.sessions.has(code)) {
        return;
      }
      try {
        this.openQuestion(code, session.host.hostId, 0);
      } catch {
        // Session could have been ended during countdown.
      }
    }, SESSION_DEFAULTS.countdownSeconds * 1000);
  }

  openQuestion(code: string, hostId: string, questionIndex: number): void {
    const session = this.requireHostSession(code, hostId, "session:openQuestion");
    if (!session.quiz.questions[questionIndex]) {
      throw new SessionManagerError("session:openQuestion", "Die Frage existiert nicht.");
    }
    if (session.phase === "final") {
      throw new SessionManagerError("session:openQuestion", "Die Sitzung ist bereits beendet.");
    }

    const now = this.now();
    const question = session.quiz.questions[questionIndex];
    const endsAt = now + question.timerSeconds * 1000;

    session.phase = "question_open";
    session.currentQuestionIndex = questionIndex;
    session.currentQuestion = {
      questionId: question.id,
      questionIndex,
      status: "open",
      startedAt: now,
      endsAt,
      closedAt: null,
      revealAt: null,
      submissionsByPlayerId: {},
      optionStats: Object.fromEntries(question.options.map((option) => [option.id, 0]))
    };
    session.updatedAt = now;
    session.housekeeping.lastHostActivityAt = now;

    this.clearTimer(code, "countdown");
    this.clearTimer(code, "question");
    const timers = this.ensureTimers(code);
    timers.question = setTimeout(() => {
      try {
        this.closeQuestion(code, session.host.hostId, questionIndex);
        this.revealAnswer(code, session.host.hostId, questionIndex);
      } catch {
        // Session may have ended or question changed.
      }
    }, question.timerSeconds * 1000);

    const payload = {
      code,
      questionIndex,
      question: this.toPublicQuestion(question, questionIndex),
      startedAt: now,
      endsAt
    };

    this.options.emitter.emitToRoom(code, "question:opened", payload);
    this.broadcastSessionUpdate(session);
  }

  submitAnswer(code: string, playerId: string, input: AnswerSubmitInput): {
    accepted: boolean;
    lockedAt?: number;
    reason?: "duplicate" | "late" | "invalid_option" | "not_in_question";
  } {
    const session = this.requireSession(code, "answer:submit");
    const player = session.players[playerId];
    if (!player || player.kickedAt) {
      throw new SessionManagerError("answer:submit", "Der Spieler ist in dieser Sitzung nicht aktiv.");
    }
    if (session.phase !== "question_open" || !session.currentQuestion) {
      return { accepted: false, reason: "not_in_question" };
    }
    if (input.questionIndex !== session.currentQuestion.questionIndex) {
      return { accepted: false, reason: "not_in_question" };
    }
    if (session.currentQuestion.submissionsByPlayerId[playerId]) {
      return { accepted: false, reason: "duplicate" };
    }

    const question = session.quiz.questions[input.questionIndex];
    if (!question) {
      return { accepted: false, reason: "not_in_question" };
    }
    const option = question.options.find((candidate) => candidate.id === input.optionId);
    if (!option) {
      return { accepted: false, reason: "invalid_option" };
    }

    const now = this.now();
    if (now > session.currentQuestion.endsAt) {
      return { accepted: false, reason: "late" };
    }

    const responseMs = now - session.currentQuestion.startedAt;
    const remainingMs = Math.max(0, session.currentQuestion.endsAt - now);
    const isCorrect = question.correctOptionId === input.optionId;
    const pointsAwarded = isCorrect
      ? calculateScore({
          basePoints: question.basePoints,
          durationMs: question.timerSeconds * 1000,
          remainingMs,
          scoringMode: question.scoringMode
        })
      : 0;

    const record: PlayerAnswerRecord = {
      questionId: question.id,
      optionId: input.optionId,
      submittedAt: now,
      responseMs,
      isCorrect,
      pointsAwarded,
      accepted: true
    };

    session.currentQuestion.submissionsByPlayerId[playerId] = record;
    session.currentQuestion.optionStats[input.optionId] =
      (session.currentQuestion.optionStats[input.optionId] ?? 0) + 1;
    player.answers[question.id] = record;
    player.score += pointsAwarded;
    player.correctCount += isCorrect ? 1 : 0;
    player.cumulativeResponseMs += responseMs;
    player.lastSeenAt = now;
    session.updatedAt = now;
    session.housekeeping.lastNonHostActivityAt = now;

    return {
      accepted: true,
      lockedAt: now
    };
  }

  closeQuestion(code: string, hostId: string, questionIndex: number): void {
    const session = this.requireHostSession(code, hostId, "session:closeQuestion");
    if (!session.currentQuestion || session.phase !== "question_open") {
      throw new SessionManagerError(
        "session:closeQuestion",
        "Es gibt keine offene Frage zum Schließen."
      );
    }
    if (session.currentQuestion.questionIndex !== questionIndex) {
      throw new SessionManagerError(
        "session:closeQuestion",
        "Der Fragenindex passt nicht zur aktiven Frage."
      );
    }

    const now = this.now();
    session.phase = "question_closed";
    session.currentQuestion.status = "closed";
    session.currentQuestion.closedAt = now;
    session.updatedAt = now;
    session.housekeeping.lastHostActivityAt = now;
    this.clearTimer(code, "question");

    this.options.emitter.emitToRoom(code, "question:closed", {
      code,
      questionIndex,
      closedAt: now
    });
    this.broadcastSessionUpdate(session);
  }

  revealAnswer(code: string, hostId: string, questionIndex: number): RevealPayload {
    const session = this.requireHostSession(code, hostId, "session:revealAnswer");
    if (!session.currentQuestion) {
      throw new SessionManagerError("session:revealAnswer", "Es wurde noch keine Frage geöffnet.");
    }
    if (session.currentQuestion.questionIndex !== questionIndex) {
      throw new SessionManagerError(
        "session:revealAnswer",
        "Der Fragenindex passt nicht zur aktiven Frage."
      );
    }

    const question = session.quiz.questions[questionIndex];
    if (!question) {
      throw new SessionManagerError("session:revealAnswer", "Die Frage existiert nicht.");
    }
    const now = this.now();
    session.phase = "answer_reveal";
    session.currentQuestion.status = "revealed";
    session.currentQuestion.revealAt = now;
    session.updatedAt = now;
    session.housekeeping.lastHostActivityAt = now;

    const payload = RevealPayloadSchema.parse({
      optionStats: session.currentQuestion.optionStats,
      playerResults: this.buildRevealRows(session, question.id)
    });

    this.options.emitter.emitToRoom(code, "answer:revealed", {
      code,
      questionIndex,
      correctOptionId: question.correctOptionId,
      results: payload
    });
    this.broadcastSessionUpdate(session);
    return payload;
  }

  showLeaderboard(code: string, hostId: string, questionIndex: number): LeaderboardEntry[] {
    const session = this.requireHostSession(code, hostId, "session:showLeaderboard");
    if (!session.currentQuestion || session.currentQuestion.questionIndex !== questionIndex) {
      throw new SessionManagerError(
        "session:showLeaderboard",
        "Der Fragenindex passt nicht zur aktiven Frage."
      );
    }

    const now = this.now();
    const previousRanks = Object.fromEntries(
      session.leaderboard.map((entry) => [entry.playerId, entry.rank])
    );
    const scoreDeltas = Object.fromEntries(
      Object.values(session.currentQuestion.submissionsByPlayerId).map((record) => {
        const player = this.findPlayerIdByQuestionAnswer(session, record);
        return [player ?? "", record.pointsAwarded];
      })
    );

    session.leaderboard = rankLeaderboard(
      this.activePlayers(session).map((player) => ({
        playerId: player.playerId,
        playerName: player.effectiveName,
        score: player.score,
        correctCount: player.correctCount,
        cumulativeResponseMs: player.cumulativeResponseMs,
        connected: player.connected
      })),
      this.rosterOrderLookup(session),
      previousRanks,
      scoreDeltas
    );

    session.phase = "leaderboard";
    session.updatedAt = now;
    session.housekeeping.lastHostActivityAt = now;

    this.options.emitter.emitToRoom(code, "leaderboard:shown", {
      code,
      questionIndex,
      leaderboard: session.leaderboard
    });
    this.broadcastSessionUpdate(session);
    return session.leaderboard;
  }

  kickPlayer(code: string, hostId: string, playerId: string): void {
    const session = this.requireHostSession(code, hostId, "player:kick");
    const player = session.players[playerId];
    if (!player || player.kickedAt) {
      throw new SessionManagerError("player:kick", "Der Spieler ist in dieser Sitzung nicht aktiv.");
    }

    player.kickedAt = this.now();
    player.connected = false;
    player.disconnectedAt = player.kickedAt;
    session.updatedAt = player.kickedAt;
    session.housekeeping.lastHostActivityAt = player.kickedAt;

    if (player.socketId) {
      this.options.emitter.emitToSocket(player.socketId, "player:kicked", {
        code,
        playerId,
        message: "Der Moderator hat dich aus dieser Sitzung entfernt."
      });
      this.options.emitter.disconnectSocket(player.socketId);
    }

    this.broadcastSessionUpdate(session);
  }

  endSession(code: string, hostId: string, reason: "host_ended" | "host_timeout" | "completed"): FinalSessionResults {
    const session = this.requireHostSession(code, hostId, "session:end");
    return this.finishSession(session, reason);
  }

  handleDisconnect(data: { code?: string; role?: "host" | "player"; actorId?: string }): void {
    if (!data.code || !data.role || !data.actorId) {
      return;
    }
    const session = this.sessions.get(data.code);
    if (!session) {
      return;
    }

    const now = this.now();
    if (data.role === "host") {
      session.host.connected = false;
      session.host.disconnectedAt = now;
      session.host.disconnectDeadline = now + session.settings.maxReconnectGraceMs;
      session.updatedAt = now;
      this.broadcastSessionUpdate(session);

      const timers = this.ensureTimers(data.code);
      this.clearTimer(data.code, "hostDisconnect");
      timers.hostDisconnect = setTimeout(() => {
        const current = this.sessions.get(data.code ?? "");
        if (!current || current.host.connected) {
          return;
        }
        this.finishSession(current, "host_timeout");
      }, session.settings.maxReconnectGraceMs);
      return;
    }

    const player = session.players[data.actorId];
    if (!player) {
      return;
    }
    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = now;
    player.lastSeenAt = now;
    session.updatedAt = now;
    this.broadcastSessionUpdate(session);
  }

  broadcastSessionUpdateByCode(code: string): void {
    const session = this.sessions.get(code);
    if (session) {
      this.broadcastSessionUpdate(session);
    }
  }

  getSession(code: string): ServerSessionState | undefined {
    return this.sessions.get(code);
  }

  private finishSession(
    session: ServerSessionState,
    reason: "host_ended" | "host_timeout" | "completed"
  ): FinalSessionResults {
    if (session.phase === "final" && session.finalResults) {
      return session.finalResults;
    }

    const now = this.now();
    session.phase = "final";
    session.endedAt = now;
    session.updatedAt = now;
    this.clearTimer(session.code, "countdown");
    this.clearTimer(session.code, "question");
    this.clearTimer(session.code, "hostDisconnect");
    this.clearTimer(session.code, "lobbyExpiry");

    if (session.leaderboard.length === 0) {
      session.leaderboard = rankLeaderboard(
        this.activePlayers(session).map((player) => ({
          playerId: player.playerId,
          playerName: player.effectiveName,
          score: player.score,
          correctCount: player.correctCount,
          cumulativeResponseMs: player.cumulativeResponseMs,
          connected: player.connected
        })),
        this.rosterOrderLookup(session)
      );
    }

    const finalResults = FinalSessionResultsSchema.parse({
      code: session.code,
      quizId: session.quiz.id,
      quizTitle: session.quiz.title,
      startedAt: session.startedAt ?? session.createdAt,
      endedAt: now,
      reason,
      totalPlayers: Object.keys(session.players).length,
      leaderboard: session.leaderboard,
      players: this.buildFinalPlayerResults(session),
      questions: session.quiz.questions.map((question) => ({
        questionId: question.id,
        questionText: question.text,
        correctOptionId: question.correctOptionId,
        optionStats: this.buildQuestionOptionStats(session, question)
      }))
    });

    session.finalResults = finalResults;
    this.options.emitter.emitToRoom(session.code, "session:ended", {
      code: session.code,
      endedAt: now,
      reason,
      finalResults
    });
    this.broadcastSessionUpdate(session);
    this.scheduleCleanup(session);
    return finalResults;
  }

  private buildHostSessionState(session: ServerSessionState): PublicHostSessionState {
    return PublicHostSessionStateSchema.parse({
      ...this.buildBaseSessionState(session),
      role: "host",
      hostConnected: session.host.connected
    });
  }

  private buildPlayerSessionState(
    session: ServerSessionState,
    playerId: string
  ): PublicPlayerSessionState {
    const player = session.players[playerId];
    if (!player) {
      throw new SessionManagerError("internal", "Eine Spieler-Sitzung konnte ohne Spieler nicht aufgebaut werden.");
    }
    const rank = session.leaderboard.find((entry) => entry.playerId === playerId)?.rank;
    const lockedAnswerOptionId =
      session.currentQuestion?.submissionsByPlayerId[playerId]?.optionId ?? null;

    return PublicPlayerSessionStateSchema.parse({
      ...this.buildBaseSessionState(session),
      role: "player",
      playerId,
      playerName: player.effectiveName,
      playerScore: player.score,
      playerRank: rank,
      lockedAnswerOptionId
    });
  }

  private buildBaseSessionState(session: ServerSessionState) {
    return {
      code: session.code,
      phase: session.phase,
      joinUrl: session.settings.joinUrl,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      quizTitle: session.quiz.title,
      quizDescription: session.quiz.description,
      coverImage: session.quiz.coverImage,
      totalQuestions: session.quiz.questions.length,
      currentQuestionIndex: session.currentQuestionIndex,
      roster: this.buildRoster(session),
      counts: {
        connected: this.activePlayers(session).filter((player) => player.connected).length,
        total: this.activePlayers(session).length
      },
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      questionStartedAt: session.currentQuestion?.startedAt,
      questionEndsAt: session.currentQuestion?.endsAt,
      leaderboard: session.leaderboard.length > 0 ? session.leaderboard : undefined,
      question: session.currentQuestion
        ? this.toPublicQuestion(
            session.quiz.questions[session.currentQuestion.questionIndex] ??
              session.quiz.questions[session.currentQuestionIndex]!,
            session.currentQuestion.questionIndex
          )
        : undefined,
      revealedCorrectOptionId:
        session.phase === "answer_reveal" ||
        session.phase === "leaderboard" ||
        session.phase === "final"
          ? session.quiz.questions[session.currentQuestionIndex]?.correctOptionId
          : undefined,
      finalResults: session.finalResults
    };
  }

  private buildRoster(session: ServerSessionState): PublicRosterEntry[] {
    const rankLookup = Object.fromEntries(
      session.leaderboard.map((entry) => [entry.playerId, entry.rank])
    );

    return session.rosterOrder
      .map((playerId) => session.players[playerId] ?? null)
      .filter(
        (player): player is ServerPlayerState =>
          player !== null && player.kickedAt === null
      )
      .map((player) => ({
        playerId: player.playerId,
        playerName: player.effectiveName,
        score: player.score,
        connected: player.connected,
        joinedAt: player.joinedAt,
        rank: rankLookup[player.playerId]
      }));
  }

  private buildRevealRows(session: ServerSessionState, questionId: string) {
    return this.activePlayers(session).map((player) => {
      const answer = player.answers[questionId];
      return {
        playerId: player.playerId,
        playerName: player.effectiveName,
        selectedOptionId: answer?.optionId ?? null,
        isCorrect: answer?.isCorrect ?? false,
        pointsAwarded: answer?.pointsAwarded ?? 0,
        score: player.score
      };
    });
  }

  private buildFinalPlayerResults(session: ServerSessionState): FinalPlayerResult[] {
    const rankLookup = Object.fromEntries(
      session.leaderboard.map((entry) => [entry.playerId, entry.rank])
    );

    return Object.values(session.players).map((player) => ({
      playerId: player.playerId,
      playerName: player.effectiveName,
      rank: rankLookup[player.playerId] ?? session.leaderboard.length + 1,
      score: player.score,
      correctCount: player.correctCount,
      cumulativeResponseMs: player.cumulativeResponseMs,
      joinedAt: player.joinedAt,
      connectedAtEnd: player.connected,
      answers: session.questionOrder
        .map((questionId) => player.answers[questionId])
        .filter((value): value is PlayerAnswerRecord => Boolean(value))
    }));
  }

  private buildQuestionOptionStats(
    session: ServerSessionState,
    question: QuizQuestion
  ): Record<string, number> {
    const stats = Object.fromEntries(question.options.map((option) => [option.id, 0]));
    for (const player of Object.values(session.players)) {
      const answer = player.answers[question.id];
      if (answer) {
        stats[answer.optionId] = (stats[answer.optionId] ?? 0) + 1;
      }
    }
    return stats;
  }

  private scheduleCleanup(session: ServerSessionState): void {
    const timers = this.ensureTimers(session.code);
    this.clearTimer(session.code, "cleanup");
    timers.cleanup = setTimeout(() => {
      this.clearAllTimers(session.code);
      this.sessions.delete(session.code);
      this.timers.delete(session.code);
    }, session.settings.endedSessionRetentionMs);
  }

  private scheduleLobbyExpiry(session: ServerSessionState): void {
    const timers = this.ensureTimers(session.code);
    this.clearTimer(session.code, "lobbyExpiry");
    timers.lobbyExpiry = setTimeout(() => {
      const current = this.sessions.get(session.code);
      if (!current || current.phase !== "lobby") {
        return;
      }
      this.finishSession(current, "host_timeout");
    }, session.settings.idleLobbyExpiryMs);
  }

  private ensureTimers(code: string): SessionTimers {
    const existing = this.timers.get(code);
    if (existing) {
      return existing;
    }
    const created: SessionTimers = {};
    this.timers.set(code, created);
    return created;
  }

  private clearTimer(code: string, key: keyof SessionTimers): void {
    const timers = this.timers.get(code);
    const timer = timers?.[key];
    if (timer) {
      clearTimeout(timer);
      delete timers[key];
    }
  }

  private clearAllTimers(code: string): void {
    for (const key of ["countdown", "question", "hostDisconnect", "cleanup", "lobbyExpiry"] as const) {
      this.clearTimer(code, key);
    }
  }

  private requireSession(code: string, event: keyof ClientToServerEvents): ServerSessionState {
    const session = this.sessions.get(code);
    if (!session) {
      throw new SessionManagerError(event, "Sitzung nicht gefunden.");
    }
    return session;
  }

  private requireHostSession(
    code: string,
    hostId: string,
    event: keyof ClientToServerEvents
  ): ServerSessionState {
    const session = this.requireSession(code, event);
    if (session.host.hostId !== hostId) {
      throw new SessionManagerError(event, "Das darf nur der Moderator tun.");
    }
    return session;
  }

  private broadcastSessionUpdate(session: ServerSessionState): void {
    this.options.emitter.emitToRoom(session.code, "session:update", {
      code: session.code,
      phase: session.phase,
      roster: this.buildRoster(session),
      counts: {
        connected: this.activePlayers(session).filter((player) => player.connected).length,
        total: this.activePlayers(session).length
      }
    });
  }

  private buildJoinUrl(code: string, joinUrlBase?: string): string {
    return new URL(`/join/${code}`, joinUrlBase ?? this.options.joinUrlBase).toString();
  }

  private activePlayers(session: ServerSessionState): ServerPlayerState[] {
    return Object.values(session.players).filter((player) => player.kickedAt === null);
  }

  private rosterOrderLookup(session: ServerSessionState): Record<string, number> {
    return Object.fromEntries(session.rosterOrder.map((playerId, index) => [playerId, index]));
  }

  private allocatePlayerName(session: ServerSessionState, requestedName: string): string {
    const base = normalizeName(requestedName);
    const existing = new Set(
      this.activePlayers(session).map((player) => player.effectiveName.toLowerCase())
    );

    if (!existing.has(base.toLowerCase())) {
      return base;
    }

    let suffix = 2;
    while (existing.has(`${base} ${suffix}`.toLowerCase())) {
      suffix += 1;
    }
    return `${base} ${suffix}`;
  }

  private toPublicQuestion(question: QuizQuestion, questionIndex: number): PublicQuestionPayload {
    return {
      id: question.id,
      text: question.text,
      image: question.image,
      options: question.options,
      timerSeconds: question.timerSeconds,
      basePoints: question.basePoints,
      scoringMode: question.scoringMode,
      order: questionIndex + 1
    };
  }

  private findPlayerIdByQuestionAnswer(
    session: ServerSessionState,
    record: PlayerAnswerRecord
  ): string | undefined {
    return Object.values(session.players).find((player) =>
      Object.values(player.answers).some(
        (candidate) =>
          candidate.questionId === record.questionId &&
          candidate.submittedAt === record.submittedAt &&
          candidate.optionId === record.optionId
      )
    )?.playerId;
  }

  private assertValidQuizSnapshot(quiz: QuizSnapshot): void {
    const bytes = serializeBytes(quiz);
    if (bytes > QUIZ_LIMITS.maxQuizSnapshotBytes) {
      throw new SessionManagerError(
        "session:create",
        "Der Quiz-Snapshot überschreitet das erlaubte Nutzlast-Limit."
      );
    }

    if (quiz.coverImage && quiz.coverImage.bytes > QUIZ_LIMITS.maxCoverBytes) {
      throw new SessionManagerError("session:create", "Das Cover-Bild überschreitet die erlaubte Größe.");
    }

    for (const question of quiz.questions) {
      if (question.image && question.image.bytes > QUIZ_LIMITS.maxQuestionImageBytes) {
        throw new SessionManagerError(
          "session:create",
          "Eines der Fragenbilder überschreitet die erlaubte Größe."
        );
      }
    }
  }
}
