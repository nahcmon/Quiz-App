import { randomBytes, randomUUID } from "node:crypto";

import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  type SessionPhase
} from "@quiz/shared";

export function generateJoinCode(existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < 5_000; attempt += 1) {
    let code = "";
    for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
      const charIndex = Math.floor(Math.random() * JOIN_CODE_ALPHABET.length);
      code += JOIN_CODE_ALPHABET[charIndex];
    }

    if (!existingCodes.has(code)) {
      return code;
    }
  }

  throw new Error("Es konnte kein eindeutiger Beitrittscode erzeugt werden.");
}

export function createActorId(): string {
  return randomUUID();
}

export function createReconnectToken(): string {
  return randomBytes(24).toString("base64url");
}

export function roomName(code: string): string {
  return `session:${code}`;
}

export function probeStatus(phase: SessionPhase): "lobby" | "live" | "ended" {
  if (phase === "lobby") {
    return "lobby";
  }
  if (phase === "final") {
    return "ended";
  }
  return "live";
}
