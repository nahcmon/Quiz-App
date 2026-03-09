import { QUIZ_LIMITS } from "./constants";
import type { QuestionScoringMode } from "./quiz";

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
  correctCount: number;
  cumulativeResponseMs: number;
  previousRank?: number;
  delta?: number;
  connected: boolean;
}

export interface ScoreInput {
  basePoints: number;
  durationMs: number;
  remainingMs: number;
  scoringMode?: QuestionScoringMode;
}

export function calculateScore({
  basePoints,
  durationMs,
  remainingMs,
  scoringMode = "speed"
}: ScoreInput): number {
  const safeBase = Math.max(QUIZ_LIMITS.minBasePoints, basePoints);
  if (scoringMode === "fixed") {
    return safeBase;
  }
  const safeDuration = Math.max(1, durationMs);
  const safeRemaining = Math.max(0, Math.min(durationMs, remainingMs));
  return safeBase + Math.floor(safeBase * 0.5 * (safeRemaining / safeDuration));
}

export interface SortableLeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  correctCount: number;
  cumulativeResponseMs: number;
  connected: boolean;
}

export function compareLeaderboardEntries(
  left: SortableLeaderboardEntry,
  right: SortableLeaderboardEntry,
  rosterOrder: Record<string, number>
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  if (right.correctCount !== left.correctCount) {
    return right.correctCount - left.correctCount;
  }
  if (left.cumulativeResponseMs !== right.cumulativeResponseMs) {
    return left.cumulativeResponseMs - right.cumulativeResponseMs;
  }
  return (rosterOrder[left.playerId] ?? Number.MAX_SAFE_INTEGER) -
    (rosterOrder[right.playerId] ?? Number.MAX_SAFE_INTEGER);
}

export function rankLeaderboard(
  entries: SortableLeaderboardEntry[],
  rosterOrder: Record<string, number>,
  previousRanks?: Record<string, number>,
  scoreDeltas?: Record<string, number>
): LeaderboardEntry[] {
  return [...entries]
    .sort((left, right) => compareLeaderboardEntries(left, right, rosterOrder))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      previousRank: previousRanks?.[entry.playerId],
      delta: scoreDeltas?.[entry.playerId] ?? 0
    }));
}
