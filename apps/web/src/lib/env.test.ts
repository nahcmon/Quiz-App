import { describe, expect, it } from "vitest";

import {
  getServerConfigurationError,
  resolveDefaultPublicAppUrl,
  resolveDefaultServerUrl
} from "./env";

describe("resolveDefaultServerUrl", () => {
  it("uses port 3001 for localhost", () => {
    expect(
      resolveDefaultServerUrl({
        origin: "http://localhost:5173",
        protocol: "http:",
        hostname: "localhost"
      })
    ).toBe("http://localhost:3001");
  });

  it("uses port 3001 for private LAN hosts", () => {
    expect(
      resolveDefaultServerUrl({
        origin: "http://192.168.0.20:5173",
        protocol: "http:",
        hostname: "192.168.0.20"
      })
    ).toBe("http://192.168.0.20:3001");
  });

  it("does not guess a backend URL for public hosts", () => {
    expect(
      resolveDefaultServerUrl({
        origin: "https://easy-pulse-quiz.vercel.app",
        protocol: "https:",
        hostname: "easy-pulse-quiz.vercel.app"
      })
    ).toBeNull();
  });
});

describe("environment helpers", () => {
  it("keeps the current origin as the default public app URL", () => {
    expect(
      resolveDefaultPublicAppUrl({
        origin: "https://easy-pulse-quiz.vercel.app",
        protocol: "https:",
        hostname: "easy-pulse-quiz.vercel.app"
      })
    ).toBe("https://easy-pulse-quiz.vercel.app");
  });

  it("returns a clear message when no live backend is configured", () => {
    expect(getServerConfigurationError(null)).toBe(
      "Live-Verbindung ist auf dieser Bereitstellung noch nicht verfügbar."
    );
  });
});
