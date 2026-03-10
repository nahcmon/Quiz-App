import { createServer } from "node:http";

import {
  AnswerRejectedSchema,
  type AnswerSubmitInput,
  AnswerSubmitInputSchema,
  type PlayerKickInput,
  PlayerKickInputSchema,
  QUIZ_LIMITS,
  type SessionCloseQuestionInput,
  SessionCloseQuestionInputSchema,
  type SessionCreateInput,
  SessionCreateInputSchema,
  type SessionEndInput,
  SessionEndInputSchema,
  type SessionJoinInput,
  SessionJoinInputSchema,
  type SessionOpenQuestionInput,
  SessionOpenQuestionInputSchema,
  type SessionProbeInput,
  SessionProbeInputSchema,
  type SessionReconnectInput,
  SessionReconnectInputSchema,
  type SessionRevealAnswerInput,
  SessionRevealAnswerInputSchema,
  type SessionShowLeaderboardInput,
  SessionShowLeaderboardInputSchema,
  type SessionStartInput,
  SessionStartInputSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData
} from "@quiz/shared";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";

import { readServerConfig } from "./config";
import { roomName } from "./code";
import { SlidingWindowRateLimiter } from "./rateLimit";
import { SessionManager, SessionManagerError } from "./sessionManager";

function resolveClientIp(headers: Record<string, string | string[] | undefined>, fallback?: string) {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? fallback ?? "unknown";
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return fallback ?? "unknown";
}

const config = readServerConfig();
const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      if (config.isAllowedClientOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "256kb" }));
app.get("/healthz", (_request, response) => {
  response.json({
    ok: true,
    mode: "single-instance",
    publicServerUrl: config.publicServerUrl
  });
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
  httpServer,
  {
    cors: {
      origin(origin, callback) {
        if (config.isAllowedClientOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin not allowed by CORS"));
      },
      credentials: true
    },
    maxHttpBufferSize: QUIZ_LIMITS.maxQuizSnapshotBytes + 128 * 1024,
    pingInterval: 25_000,
    pingTimeout: 20_000
  }
);

const manager = new SessionManager({
  joinUrlBase: config.defaultClientOrigin,
  emitter: {
    emitToRoom(code, event, payload) {
      io.to(roomName(code)).emit(event, payload as never);
    },
    emitToSocket(socketId, event, payload) {
      io.to(socketId).emit(event, payload as never);
    },
    disconnectSocket(socketId) {
      io.sockets.sockets.get(socketId)?.disconnect(true);
    }
  }
});

let shuttingDown = false;

const probeLimiter = new SlidingWindowRateLimiter();
const joinLimiter = new SlidingWindowRateLimiter();

function emitSessionError(
  socket: import("socket.io").Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    object,
    SocketData
  >,
  event: string,
  message: string
) {
  socket.emit("session:error", { event, message });
}

function withSchema<T>(
  socket: import("socket.io").Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    object,
    SocketData
  >,
  event: Extract<keyof ClientToServerEvents, string>,
  schema: {
    safeParse: (
      input: unknown
    ) =>
      | {
          success: true;
          data: T;
        }
      | {
          success: false;
        };
  },
  handler: (payload: T) => void
) {
  socket.on(event, (rawPayload: unknown) => {
    const parsed = schema.safeParse(rawPayload);
    if (!parsed.success) {
      emitSessionError(socket, event, "Ungültige Nutzlast.");
      return;
    }

    try {
      handler(parsed.data);
    } catch (error) {
      const message =
        error instanceof SessionManagerError
          ? error.message
          : "Unerwarteter Sitzungsfehler.";
      emitSessionError(socket, event, message);
    }
  });
}

io.on("connection", (socket) => {
  socket.data.clientIp = resolveClientIp(
    socket.handshake.headers as Record<string, string | string[] | undefined>,
    socket.handshake.address
  );

  withSchema<SessionProbeInput>(
    socket,
    "session:probe",
    SessionProbeInputSchema,
    (payload) => {
      const rate = probeLimiter.allow(`probe:${socket.data.clientIp}`, 20, 60_000);
      if (!rate.allowed) {
        emitSessionError(
          socket,
          "session:probe",
          `Zu viele Code-Prüfungen. Bitte versuche es in ${Math.ceil(rate.retryAfterMs / 1000)} s erneut.`
        );
        return;
      }
      socket.emit("session:probeResult", manager.getProbeResult(payload.code));
  }
);

  withSchema<SessionCreateInput>(
    socket,
    "session:create",
    SessionCreateInputSchema,
    (payload) => {
      const created = manager.createSession({
        hostName: payload.hostName,
        quiz: payload.quiz,
        socketId: socket.id,
        joinUrlBase: payload.clientInfo.publicAppUrl
      });

      void socket.join(roomName(created.code));
      socket.data.code = created.code;
      socket.data.role = "host";
      socket.data.actorId = created.hostId;

      socket.emit("session:created", {
        code: created.code,
        joinUrl: created.session.joinUrl,
        hostReconnectToken: created.hostReconnectToken,
        session: created.session
      });
    }
  );

  withSchema<SessionReconnectInput>(
    socket,
    "session:reconnect",
    SessionReconnectInputSchema,
    (payload) => {
      const reconnected = manager.reconnectSession({
        ...payload,
        socketId: socket.id
      });

      void socket.join(roomName(payload.code));
      socket.data.code = payload.code;
      socket.data.role = reconnected.role;
      socket.data.actorId = reconnected.actorId;

      socket.emit("reconnect:accepted", {
        code: payload.code,
        role: reconnected.role,
        session: reconnected.session
      });
      manager.broadcastSessionUpdateByCode(payload.code);
    }
  );

  withSchema<SessionJoinInput>(
    socket,
    "session:join",
    SessionJoinInputSchema,
    (payload) => {
      const perIp = joinLimiter.allow(`join:${socket.data.clientIp}`, 12, 60_000);
      const perCode = joinLimiter.allow(`join:${payload.code}`, 50, 60_000);
      if (!perIp.allowed || !perCode.allowed) {
        emitSessionError(
          socket,
          "session:join",
          "Zu viele Beitrittsversuche. Bitte warte kurz und versuche es erneut."
        );
        return;
      }

      const joined = manager.joinSession({
        ...payload,
        socketId: socket.id
      });

      void socket.join(roomName(payload.code));
      socket.data.code = payload.code;
      socket.data.role = "player";
      socket.data.actorId = joined.playerId;

      socket.emit("session:joined", {
        code: payload.code,
        playerId: joined.playerId,
        playerName: joined.playerName,
        playerReconnectToken: joined.playerReconnectToken,
        session: joined.session
      });
      manager.broadcastSessionUpdateByCode(payload.code);
    }
  );

  withSchema<SessionStartInput>(
    socket,
    "session:start",
    SessionStartInputSchema,
    (payload) => {
    manager.startSession(payload.code, socket.data.actorId ?? "");
    }
  );

  withSchema<SessionOpenQuestionInput>(
    socket,
    "session:openQuestion",
    SessionOpenQuestionInputSchema,
    (payload) => {
      manager.openQuestion(payload.code, socket.data.actorId ?? "", payload.questionIndex);
    }
  );

  withSchema<AnswerSubmitInput>(
    socket,
    "answer:submit",
    AnswerSubmitInputSchema,
    (payload) => {
      const result = manager.submitAnswer(payload.code, socket.data.actorId ?? "", payload);
      if (result.accepted) {
        socket.emit("answer:accepted", {
          code: payload.code,
          questionIndex: payload.questionIndex,
          lockedAt: result.lockedAt ?? Date.now()
        });
        return;
      }

      socket.emit(
        "answer:rejected",
        AnswerRejectedSchema.parse({
          code: payload.code,
          questionIndex: payload.questionIndex,
          reason: result.reason
        })
      );
    }
  );

  withSchema(
    socket,
    "session:closeQuestion",
    SessionCloseQuestionInputSchema,
    (payload: SessionCloseQuestionInput) => {
      manager.closeQuestion(payload.code, socket.data.actorId ?? "", payload.questionIndex);
    }
  );

  withSchema(
    socket,
    "session:revealAnswer",
    SessionRevealAnswerInputSchema,
    (payload: SessionRevealAnswerInput) => {
      manager.revealAnswer(payload.code, socket.data.actorId ?? "", payload.questionIndex);
    }
  );

  withSchema(
    socket,
    "session:showLeaderboard",
    SessionShowLeaderboardInputSchema,
    (payload: SessionShowLeaderboardInput) => {
      manager.showLeaderboard(payload.code, socket.data.actorId ?? "", payload.questionIndex);
    }
  );

  withSchema<PlayerKickInput>(
    socket,
    "player:kick",
    PlayerKickInputSchema,
    (payload) => {
    manager.kickPlayer(payload.code, socket.data.actorId ?? "", payload.playerId);
    }
  );

  withSchema<SessionEndInput>(
    socket,
    "session:end",
    SessionEndInputSchema,
    (payload) => {
    manager.endSession(payload.code, socket.data.actorId ?? "", payload.reason);
    }
  );

  socket.on("disconnect", () => {
    manager.handleDisconnect({
      code: socket.data.code,
      role: socket.data.role,
      actorId: socket.data.actorId
    });
  });
});

httpServer.listen(config.port, () => {
  console.log(
    `Pulse Quiz server listening on ${config.publicServerUrl} with default web origin ${config.defaultClientOrigin}`
  );
});

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  console.log(`Received ${signal}. Shutting down Pulse Quiz server...`);
  io.emit("session:error", {
    event: "server:shutdown",
    message: "Der Live-Dienst startet gerade neu. Bitte verbinde dich gleich erneut."
  });

  const forceExitTimer = setTimeout(() => {
    process.exit(1);
  }, 25_000);
  forceExitTimer.unref();

  void io.close(() => {
    httpServer.close(() => {
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});
