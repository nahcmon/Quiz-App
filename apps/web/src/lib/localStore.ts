import {
  HostResultsEnvelopeSchema,
  type PlayerHistoryRecord,
  PlayerHistoryEnvelopeSchema,
  type Quiz,
  QuizExportSchema,
  type ReconnectRecord,
  ReconnectEnvelopeSchema,
  ResultsExportSchema,
  type Settings,
  SettingsEnvelopeSchema,
  STORAGE_KEYS,
  STORAGE_VERSION,
  type FinalSessionResults,
  QuizzesEnvelopeSchema,
  type QuizExport,
  type ResultsExport
} from "@quiz/shared";

const STORAGE_WARNING_EVENT = "pulsequiz:storage-warning";

function emitStorageWarning(key: string, message: string) {
  window.dispatchEvent(
    new CustomEvent(STORAGE_WARNING_EVENT, {
      detail: { key, message }
    })
  );
}

function readEnvelope<T>(
  key: string,
  parser: { safeParse: (input: unknown) => { success: boolean; data?: T } },
  fallback: T
): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = parser.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return parsed.data as T;
    }
    window.localStorage.removeItem(key);
    emitStorageWarning(key, "Ein Teil deiner Inhalte war beschädigt und wurde zurückgesetzt.");
    return fallback;
  } catch {
    window.localStorage.removeItem(key);
    emitStorageWarning(key, "Ein Teil deiner Inhalte konnte nicht geladen werden und wurde zurückgesetzt.");
    return fallback;
  }
}

function saveEnvelope<T>(key: string, data: T) {
  window.localStorage.setItem(
    key,
    JSON.stringify({
      version: STORAGE_VERSION,
      updatedAt: Date.now(),
      data
    })
  );
}

export function loadQuizData(): { quizzes: Quiz[]; draft?: Quiz } {
  return readEnvelope(STORAGE_KEYS.quizzes, QuizzesEnvelopeSchema, {
    version: STORAGE_VERSION,
    updatedAt: Date.now(),
    data: { quizzes: [] }
  }).data;
}

export function saveQuizData(data: { quizzes: Quiz[]; draft?: Quiz }) {
  saveEnvelope(STORAGE_KEYS.quizzes, data);
}

export function loadHostResults(): FinalSessionResults[] {
  return readEnvelope(STORAGE_KEYS.hostResults, HostResultsEnvelopeSchema, {
    version: STORAGE_VERSION,
    updatedAt: Date.now(),
    data: []
  }).data;
}

export function saveHostResults(data: FinalSessionResults[]) {
  saveEnvelope(STORAGE_KEYS.hostResults, data);
}

export function loadPlayerHistory(): PlayerHistoryRecord[] {
  return readEnvelope(STORAGE_KEYS.playerHistory, PlayerHistoryEnvelopeSchema, {
    version: STORAGE_VERSION,
    updatedAt: Date.now(),
    data: []
  }).data;
}

export function savePlayerHistory(data: PlayerHistoryRecord[]) {
  saveEnvelope(STORAGE_KEYS.playerHistory, data);
}

export function loadSettings(): Settings {
  const fallback: Settings = {
    motion: "system",
    soundEnabled: true,
    theme: "light",
    hostDensity: "comfortable",
    autoAdvanceAfterReveal: true,
    lastJoinName: ""
  };

  return readEnvelope(STORAGE_KEYS.settings, SettingsEnvelopeSchema, {
    version: STORAGE_VERSION,
    updatedAt: Date.now(),
    data: fallback
  }).data;
}

export function saveSettings(settings: Settings) {
  saveEnvelope(STORAGE_KEYS.settings, settings);
}

export function loadReconnectRecord(): ReconnectRecord | null {
  return readEnvelope(STORAGE_KEYS.reconnect, ReconnectEnvelopeSchema, {
    version: STORAGE_VERSION,
    updatedAt: Date.now(),
    data: null
  }).data;
}

export function saveReconnectRecord(record: ReconnectRecord | null) {
  saveEnvelope(STORAGE_KEYS.reconnect, record);
}

export function buildQuizExport(quizzes: Quiz[]): QuizExport {
  return QuizExportSchema.parse({
    kind: "pulse-quiz-export",
    version: STORAGE_VERSION,
    exportedAt: Date.now(),
    quizzes
  });
}

export function buildResultsExport(
  hostResults: FinalSessionResults[],
  playerHistory: PlayerHistoryRecord[]
): ResultsExport {
  return ResultsExportSchema.parse({
    kind: "pulse-results-export",
    version: STORAGE_VERSION,
    exportedAt: Date.now(),
    hostResults,
    playerHistory
  });
}

export { STORAGE_WARNING_EVENT };
