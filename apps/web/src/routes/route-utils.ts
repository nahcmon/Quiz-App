import { useReducedMotion } from "framer-motion";

import { useSettingsStore } from "../stores/useSettingsStore";

function useAppReducedMotion() {
  const prefersReduced = useReducedMotion();
  const motion = useSettingsStore((state) => state.settings.motion);

  if (motion === "reduced") {
    return true;
  }
  if (motion === "full") {
    return false;
  }
  return prefersReduced;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function formatResponseTime(durationMs: number) {
  const totalSeconds = Math.max(0, durationMs / 1000);

  if (totalSeconds < 60) {
    const shortDuration = totalSeconds < 10;
    return `${new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: shortDuration ? 1 : 0,
      maximumFractionDigits: shortDuration ? 1 : 0
    }).format(totalSeconds)} s`;
  }

  const roundedSeconds = Math.round(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${seconds} s`;
}

function formatScoringModeLabel(mode: "speed" | "fixed") {
  return mode === "fixed" ? "Feste Punkte" : "Zeitbonus";
}

function formatPhaseLabel(phase: string) {
  const labels: Record<string, string> = {
    lobby: "Lobby",
    countdown: "Countdown",
    question_open: "Frage offen",
    question_closed: "Frage geschlossen",
    answer_reveal: "Antwortauflösung",
    leaderboard: "Rangliste",
    final: "Finale"
  };

  return labels[phase] ?? phase;
}

export {
  formatDate,
  formatPhaseLabel,
  formatResponseTime,
  formatScoringModeLabel,
  useAppReducedMotion
};
