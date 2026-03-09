import { z } from "zod";

import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from "./constants";

let fallbackIdCounter = 0;

export function normalizeJoinCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function zodJoinCode() {
  return z
    .string()
    .transform((value) => normalizeJoinCode(value))
    .pipe(
      z
        .string()
        .length(JOIN_CODE_LENGTH)
        .regex(new RegExp(`^[${JOIN_CODE_ALPHABET}]+$`))
    );
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function serializeBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function generateId(): string {
  const cryptoObject = globalThis.crypto;

  if (cryptoObject?.randomUUID) {
    return cryptoObject.randomUUID();
  }

  if (cryptoObject?.getRandomValues) {
    const bytes = cryptoObject.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  fallbackIdCounter += 1;
  return `id-${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
