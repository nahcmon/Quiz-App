import { type Socket, io } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "@quiz/shared";

import { env } from "./env";

let socketSingleton:
  | Socket<ServerToClientEvents, ClientToServerEvents>
  | null = null;

export function getSocket() {
  if (!env.serverUrl) {
    throw new Error("Live-Verbindung ist auf dieser Bereitstellung noch nicht verfügbar.");
  }

  if (!socketSingleton) {
    socketSingleton = io(env.serverUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
      timeout: 8_000
    });
  }
  return socketSingleton;
}
