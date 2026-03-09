const explicitServerUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
const explicitPublicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;

const MISSING_SERVER_URL_MESSAGE =
  "Live-Verbindung ist auf dieser Bereitstellung noch nicht verfügbar.";

type LocationLike = Pick<Location, "origin" | "protocol" | "hostname">;

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

function readWindowLocation(): LocationLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location;
}

function normalizeUrl(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function resolveDefaultPublicAppUrl(location = readWindowLocation()): string {
  return location?.origin ?? "http://localhost:5173";
}

export function resolveDefaultServerUrl(location = readWindowLocation()): string | null {
  if (!location) {
    return "http://localhost:3001";
  }

  if (!isPrivateNetworkHostname(location.hostname)) {
    return null;
  }

  return `${location.protocol}//${location.hostname}:3001`;
}

export function getServerConfigurationError(serverUrl: string | null): string | null {
  return serverUrl ? null : MISSING_SERVER_URL_MESSAGE;
}

const resolvedServerUrl =
  normalizeUrl(explicitServerUrl) ?? resolveDefaultServerUrl();

export const env = {
  serverUrl: resolvedServerUrl,
  publicAppUrl:
    normalizeUrl(explicitPublicAppUrl) ?? resolveDefaultPublicAppUrl()
};
