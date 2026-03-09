const serverUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
const publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;

function readWindowLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location;
}

function getDefaultPublicAppUrl() {
  const location = readWindowLocation();
  return location?.origin ?? "http://localhost:5173";
}

function getDefaultServerUrl() {
  const location = readWindowLocation();
  if (!location) {
    return "http://localhost:3001";
  }

  return `${location.protocol}//${location.hostname}:3001`;
}

export const env = {
  serverUrl: serverUrl ?? getDefaultServerUrl(),
  publicAppUrl: publicAppUrl ?? getDefaultPublicAppUrl()
};
