export interface ServerConfig {
  port: number;
  clientOrigins: string[];
  defaultClientOrigin: string;
  publicServerUrl: string;
  isAllowedClientOrigin: (origin: string | undefined) => boolean;
}

function readInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isPrivateNetworkHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  const match = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!match) {
    return false;
  }

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function parseClientOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function readServerConfig(): ServerConfig {
  const port = readInteger(process.env.PORT, 3001);
  const clientOrigins = parseClientOrigins(process.env.CLIENT_ORIGIN);
  const defaultClientOrigin = clientOrigins[0] ?? "http://localhost:5173";
  const publicServerUrl =
    process.env.PUBLIC_SERVER_URL ?? `http://localhost:${port}`;

  return {
    port,
    clientOrigins,
    defaultClientOrigin,
    publicServerUrl,
    isAllowedClientOrigin(origin) {
      if (!origin) {
        return true;
      }

      if (clientOrigins.length > 0) {
        return clientOrigins.includes(origin);
      }

      try {
        const parsed = new URL(origin);
        return ["http:", "https:"].includes(parsed.protocol) &&
          isPrivateNetworkHostname(parsed.hostname);
      } catch {
        return false;
      }
    }
  };
}
