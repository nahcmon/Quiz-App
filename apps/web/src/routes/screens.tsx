import {
  AnimatePresence,
  motion,
  useReducedMotion
} from "framer-motion";
import {
  QRCodeSVG
} from "qrcode.react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams
} from "react-router-dom";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from "react";

import {
  type AnswerOption,
  generateId,
  JOIN_CODE_LENGTH,
  QUIZ_LIMITS,
  SESSION_DEFAULTS,
  type QuizQuestion,
  normalizeJoinCode
} from "@quiz/shared";

import { ActionCard } from "../components/ActionCard";
import { PageShell } from "../components/PageShell";
import { SegmentedCodeInput } from "../components/SegmentedCodeInput";
import { VirtualRoster } from "../components/VirtualRoster";
import { downloadJson, readJsonFile } from "../lib/importExport";
import { compressImageFile } from "../lib/imageCompression";
import { useEditorStore } from "../stores/useEditorStore";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useSessionStore } from "../stores/useSessionStore";
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

function Button({
  children,
  as = "button",
  href,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button"
}: {
  children: ReactNode;
  as?: "button" | "link";
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean disabled:cursor-not-allowed disabled:opacity-55";
  const variants = {
    primary: "bg-ink text-white shadow-lg shadow-ink/15 hover:bg-dusk",
    secondary: "bg-white/80 text-ink shadow-panel hover:bg-white",
    ghost: "bg-transparent text-dusk hover:bg-white/50"
  } as const;

  if (as === "link" && href) {
    return (
      <Link to={href} className={`${base} ${variants[variant]}`}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

function GlassPanel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] border border-white/60 bg-white/75 p-6 shadow-panel backdrop-blur ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      {subtitle ? <p className="text-sm text-dusk/75">{subtitle}</p> : null}
    </div>
  );
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

function useNow(
  enabled: boolean,
  options?: {
    intervalMs?: number;
    mode?: "interval" | "animationFrame";
  }
) {
  const [now, setNow] = useState(() => Date.now());
  const intervalMs = options?.intervalMs ?? 150;
  const mode = options?.mode ?? "interval";

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (mode === "animationFrame") {
      let frameId = 0;

      const tick = () => {
        setNow(Date.now());
        frameId = window.requestAnimationFrame(tick);
      };

      frameId = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(frameId);
    }

    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, mode]);

  return now;
}

function TimerBar({
  startedAt,
  endsAt
}: {
  startedAt?: number;
  endsAt?: number;
}) {
  const reduced = useAppReducedMotion();
  const now = useNow(Boolean(startedAt && endsAt), {
    mode: "animationFrame"
  });

  if (!startedAt || !endsAt) {
    return null;
  }

  const duration = Math.max(1, endsAt - startedAt);
  const remaining = Math.max(0, endsAt - now);
  const progress = Math.max(0, Math.min(1, remaining / duration));
  const remainingSeconds = Math.ceil(remaining / 1000);
  const urgent = progress <= 0.2;
  const critical = remainingSeconds <= 5;

  return (
    <div className="space-y-2">
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className={`h-full rounded-full ${
            critical ? "bg-ember" : urgent ? "bg-sun" : "bg-ocean"
          }`}
          style={{ width: `${progress * 100}%` }}
          animate={reduced ? undefined : { scaleY: urgent ? [1, 1.06, 1] : 1 }}
          transition={
            reduced
              ? undefined
              : {
                  scaleY: {
                    duration: urgent ? 0.7 : 0.12,
                    repeat: urgent ? Number.POSITIVE_INFINITY : 0
                  }
                }
          }
        />
      </div>
      <p className="text-right font-display text-xl font-bold text-ink">
        {remainingSeconds}s
      </p>
    </div>
  );
}

function CountdownOverlay({ startedAt }: { startedAt?: number }) {
  const reduced = useAppReducedMotion();
  const now = useNow(Boolean(startedAt), { intervalMs: 100 });

  if (!startedAt) {
    return null;
  }

  const elapsed = now - startedAt;
  if (elapsed > 3_450) {
    return null;
  }

  const value = elapsed >= 3_000 ? "Los" : String(3 - Math.floor(elapsed / 1000));

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink/15 backdrop-blur-sm">
      <motion.div
        key={value}
        className="font-display text-8xl font-black text-white drop-shadow-[0_14px_38px_rgba(7,17,31,0.32)]"
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.35 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: value === "Los" ? 0.45 : 0.7,
          ease: "easeOut"
        }}
      >
        {value}
      </motion.div>
    </div>
  );
}

function QuestionImage({ image }: { image?: QuizQuestion["image"] }) {
  if (!image) {
    return null;
  }

  return (
    <motion.img
      src={image.dataUrl}
      alt={image.alt ?? "Frage"}
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="h-52 w-full rounded-[1.8rem] object-cover sm:h-72"
    />
  );
}

function FinalPodium({
  players
}: {
  players: Array<{ playerName: string; score: number }>;
}) {
  const reduced = useAppReducedMotion();
  const topThree = players.slice(0, 3);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {topThree.map((player, index) => {
        const isWinner = index === 0;
        return (
          <motion.div
            key={player.playerName}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.34 }}
            className={`rounded-[2rem] border border-white/70 bg-white/85 p-6 text-center shadow-panel ${
              isWinner ? "md:-order-none" : ""
            }`}
          >
            <motion.div
              className={`rounded-[1.5rem] p-6 ${
                isWinner
                  ? "bg-gradient-to-br from-sun/40 to-ember/30"
                  : "bg-slate-50"
              }`}
              animate={
                reduced || !isWinner
                  ? undefined
                  : {
                      boxShadow: [
                        "0 0 0 rgba(255, 213, 79, 0.1)",
                        "0 0 30px rgba(255, 213, 79, 0.32)",
                        "0 0 0 rgba(255, 213, 79, 0.1)"
                      ]
                    }
              }
              transition={
                reduced || !isWinner
                  ? undefined
                  : {
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY
                    }
              }
            >
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-dusk/60">
                #{index + 1}
              </p>
              <h3 className="font-display text-2xl font-bold text-ink">
                {player.playerName}
              </h3>
              <p className="mt-3 font-display text-3xl font-black text-ocean">
                {player.score}
              </p>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const warnings = useLibraryStore((state) => state.storageWarnings);
  const items = [
    {
      title: "Quiz erstellen",
      description: "Erstelle ein farbenfrohes Quiz mit Bildern und bringe deine Ideen direkt in die nächste Runde.",
      icon: "✦",
      accent: "from-ocean via-mint to-sun",
      action: () => navigate("/quizzes/new")
    },
    {
      title: "Quiz beitreten",
      description: "Gib einen 6-stelligen Code ein, wähle einen Anzeigenamen und starte direkt live.",
      icon: "→",
      accent: "from-ember via-sun to-mint",
      action: () => navigate("/join")
    },
    {
      title: "Gespeicherte Quizze",
      description: "Bearbeite, dupliziere, importiere oder starte deine vorhandenen Quizze.",
      icon: "▣",
      accent: "from-mint via-ocean to-ember",
      action: () => navigate("/quizzes")
    },
    {
      title: "Ergebnisverlauf",
      description: "Behalte frühere Runden und deine persönlichen Ergebnisse im Blick.",
      icon: "↗",
      accent: "from-sun via-ember to-ocean",
      action: () => navigate("/history")
    }
  ];

  return (
    <PageShell
      title="Moderiere schnelle, lebendige Quizrunden auf jedem Bildschirm."
      eyebrow="Echtzeit-Mehrspieler"
      actions={<Button as="link" href="/join">Mit Code beitreten</Button>}
    >
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <GlassPanel className="bg-gradient-to-br from-ink via-dusk to-ocean text-white">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-mint">
              Bereit für die nächste Runde
            </span>
            <h2 className="max-w-2xl font-display text-4xl font-black leading-tight sm:text-5xl">
              Energie für die Leinwand beim Moderator. Klare Touch-Steuerung für alle anderen.
            </h2>
            <p className="max-w-2xl text-lg text-white/80">
              Erstelle Quizze mit Bildern, bringe Schwung auf den großen Bildschirm und lass alle anderen bequem auf ihrem eigenen Gerät mitspielen.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Schneller Einstieg", "Quiz wählen, Runde starten und direkt loslegen."],
                ["Code oder Link", "Spieler treten in wenigen Sekunden mit Namen bei."],
                ["Für jede Gruppe", "Ideal für Unterricht, Workshops, Events und Teamspiele."]
              ].map(([title, copy]) => (
                <div key={title} className="rounded-[1.8rem] bg-white/8 p-4">
                  <p className="font-display text-xl font-bold">{title}</p>
                  <p className="mt-2 text-sm text-white/75">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <SectionHeading
            title="Schnellstart"
            subtitle="Wähle den Weg, der zu diesem Gerät passt."
          />
          <motion.div
            className="mt-6 grid gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.12
                }
              }
            }}
          >
            {items.map((item) => (
              <motion.div
                key={item.title}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
                }}
              >
                <ActionCard {...item} />
              </motion.div>
            ))}
          </motion.div>
        </GlassPanel>
      </section>

      {warnings.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-[1.8rem] border border-ember/30 bg-ember/10 px-5 py-4 text-sm text-dusk"
        >
          {warnings.at(-1)}
        </motion.div>
      ) : null}
    </PageShell>
  );
}

function QuizLibraryPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    hydrate,
    quizzes,
    draft,
    deleteQuiz,
    duplicateQuiz,
    exportQuizData,
    importQuizExport
  } = useLibraryStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const parsed = await readJsonFile(file);
    importQuizExport(parsed as never);
    event.target.value = "";
  }

  return (
    <PageShell
      title="Quiz-Bibliothek"
      eyebrow="Deine Quizze"
      actions={
        <>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
            Quiz importieren
          </Button>
          <Button onClick={() => downloadJson("pulse-quizze.json", exportQuizData())} variant="secondary">
            Quiz exportieren
          </Button>
          <Button as="link" href="/quizzes/new">
            Neues Quiz erstellen
          </Button>
        </>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          void handleImport(event);
        }}
      />
      {draft ? (
        <GlassPanel className="mb-6 bg-gradient-to-r from-mint/20 via-white to-ocean/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-xl font-bold text-ink">Entwurf in Arbeit</p>
              <p className="text-sm text-dusk/75">
                Setze deinen automatisch gespeicherten Entwurf auf diesem Gerät fort.
              </p>
            </div>
            <Button as="link" href="/quizzes/new">
              Entwurf fortsetzen
            </Button>
          </div>
        </GlassPanel>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        {quizzes.length === 0 ? (
          <GlassPanel>
            <p className="font-display text-2xl font-bold text-ink">Noch keine Quizze gespeichert.</p>
            <p className="mt-3 text-sm text-dusk/75">
              Erstelle dein erstes Quiz oder hole eines aus einer Datei zurück.
            </p>
          </GlassPanel>
        ) : (
          quizzes.map((quiz) => (
            <motion.div
              key={quiz.id}
              layout
              className="rounded-[2rem] border border-white/60 bg-white/75 p-6 shadow-panel"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-bold text-ink">{quiz.title}</p>
                  <p className="mt-2 text-sm text-dusk/75">
                    {quiz.description || "Noch keine Beschreibung."}
                  </p>
                </div>
                <span className="rounded-full bg-mint/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ocean">
                  {quiz.questions.length} Fragen
                </span>
              </div>

              {quiz.coverImage ? (
                <img
                  src={quiz.coverImage.dataUrl}
                  alt={quiz.coverImage.alt ?? quiz.title}
                  className="mt-5 h-48 w-full rounded-[1.5rem] object-cover"
                />
              ) : null}

              <p className="mt-4 text-sm text-dusk/70">
                Aktualisiert {formatDate(quiz.updatedAt)}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button as="link" href={`/quizzes/${quiz.id}/edit`} variant="secondary">
                  Bearbeiten
                </Button>
                <Button as="link" href={`/quizzes/${quiz.id}/preview`} variant="secondary">
                  Vorschau
                </Button>
                <Button as="link" href={`/host/launch/${quiz.id}`}>
                  Live starten
                </Button>
                <Button onClick={() => duplicateQuiz(quiz.id)} variant="ghost">
                  Duplizieren
                </Button>
                <Button onClick={() => deleteQuiz(quiz.id)} variant="ghost">
                  Löschen
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </PageShell>
  );
}

function QuestionCardEditor({
  question,
  index,
  onChange,
  onRemove,
  onMove
}: {
  question: QuizQuestion;
  index: number;
  onChange: (updater: (question: QuizQuestion) => QuizQuestion) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  async function handleQuestionImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const image = await compressImageFile(file, "question");
    onChange((current) => ({
      ...current,
      image
    }));
    event.target.value = "";
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{
        duration: 0.18,
        layout: {
          type: "spring",
          stiffness: 220,
          damping: 22
        }
      }}
      className="rounded-[1.8rem] border border-white/60 bg-white/85 p-5 shadow-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <SectionHeading title={`Frage ${index + 1}`} />
        <div className="flex gap-2">
          <Button onClick={() => onMove(-1)} variant="ghost">
            ↑
          </Button>
          <Button onClick={() => onMove(1)} variant="ghost">
            ↓
          </Button>
          <Button onClick={onRemove} variant="ghost">
            Entfernen
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-dusk">
          Fragetext
          <textarea
            value={question.text}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                text: event.target.value
              }))
            }
            className="min-h-24 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-base text-ink"
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {question.options.map((option, optionIndex) => (
              <div
                key={option.id}
                className="grid gap-3 rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 md:grid-cols-[auto_1fr_auto]"
              >
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-dusk">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={question.correctOptionId === option.id}
                    onChange={() =>
                      onChange((current) => ({
                        ...current,
                        correctOptionId: option.id
                      }))
                    }
                  />
                  Richtig
                </label>
                <input
                  value={option.text}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      options: current.options.map((candidate) =>
                        candidate.id === option.id
                          ? { ...candidate, text: event.target.value }
                          : candidate
                      )
                    }))
                  }
                  placeholder={`Antwort ${optionIndex + 1}`}
                  className="rounded-full border border-slate-200 px-4 py-2"
                />
                <Button
                  onClick={() =>
                    onChange((current) => {
                      if (current.options.length <= QUIZ_LIMITS.minAnswers) {
                        return current;
                      }
                      const nextOptions = current.options.filter(
                        (candidate) => candidate.id !== option.id
                      );
                      return {
                        ...current,
                        options: nextOptions,
                        correctOptionId:
                          current.correctOptionId === option.id
                            ? nextOptions[0]?.id ?? current.correctOptionId
                            : current.correctOptionId
                      };
                    })
                  }
                  variant="ghost"
                >
                  Entfernen
                </Button>
              </div>
            ))}

            {question.options.length < QUIZ_LIMITS.maxAnswers ? (
              <Button
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    options: [
                      ...current.options,
                      { id: generateId(), text: "" }
                    ]
                  }))
                }
                variant="secondary"
              >
                Antwortoption hinzufügen
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <label className="grid gap-2 text-sm font-semibold text-dusk">
              Timer (Sekunden)
              <input
                type="number"
                min={QUIZ_LIMITS.minTimerSeconds}
                max={QUIZ_LIMITS.maxTimerSeconds}
                value={question.timerSeconds}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    timerSeconds: Number(event.target.value)
                  }))
                }
                className="rounded-full border border-slate-200 px-4 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-dusk">
              Basispunkte
              <input
                type="number"
                min={QUIZ_LIMITS.minBasePoints}
                max={QUIZ_LIMITS.maxBasePoints}
                value={question.basePoints}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    basePoints: Number(event.target.value)
                  }))
                }
                className="rounded-full border border-slate-200 px-4 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-dusk">
              Punktevergabe
              <select
                value={question.scoringMode}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    scoringMode: event.target.value as typeof question.scoringMode
                  }))
                }
                className="rounded-full border border-slate-200 px-4 py-2"
              >
                <option value="speed">Schneller = mehr Punkte</option>
                <option value="fixed">Richtig = Punkte, falsch = 0</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-dusk">
              Fragenbild
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  void handleQuestionImage(event);
                }}
                className="rounded-full border border-dashed border-slate-300 px-4 py-3"
              />
            </label>

            {question.image ? (
              <QuestionImage image={question.image} />
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function QuizEditorPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const { hydrate, findQuiz, draft: storedDraft } = useLibraryStore();
  const {
    draft,
    validationMessage,
    lastSavedAt,
    startNew,
    loadQuiz,
    updateMeta,
    addQuestion,
    updateQuestion,
    removeQuestion,
    moveQuestion,
    saveDraftLocally,
    saveQuiz
  } = useEditorStore();
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydratedRef.current === quizId) {
      return;
    }

    if (quizId) {
      const quiz = findQuiz(quizId);
      if (quiz) {
        loadQuiz(quiz);
        hydratedRef.current = quizId;
      }
      return;
    }

    loadQuiz(storedDraft);
    if (!storedDraft) {
      startNew();
    }
    hydratedRef.current = "new";
  }, [quizId, findQuiz, loadQuiz, startNew, storedDraft]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void saveDraftLocally();
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [draft, saveDraftLocally]);

  async function handleCoverImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const image = await compressImageFile(file, "cover");
    updateMeta({ coverImage: image });
    event.target.value = "";
  }

  return (
    <PageShell
      title={quizId ? "Quiz bearbeiten" : "Quiz erstellen"}
      eyebrow="Quiz-Editor"
      actions={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              void navigate(`/quizzes/${draft.id}/preview`);
            }}
          >
            Quizvorschau
          </Button>
          <Button
            onClick={() => {
              const result = saveQuiz();
              if (result.ok) {
                void navigate("/quizzes");
              }
            }}
          >
            Quiz speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <GlassPanel>
            <SectionHeading
              title="Quizdetails"
              subtitle="Gib deinem Quiz Titel, Beschreibung und einen starken ersten Eindruck."
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-dusk">
                  Titel
                  <input
                    value={draft.title}
                    onChange={(event) => updateMeta({ title: event.target.value })}
                    className="rounded-[1.3rem] border border-slate-200 px-4 py-3 text-base"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-dusk">
                  Beschreibung
                  <textarea
                    value={draft.description ?? ""}
                    onChange={(event) => updateMeta({ description: event.target.value })}
                    className="min-h-28 rounded-[1.3rem] border border-slate-200 px-4 py-3 text-base"
                  />
                </label>
              </div>
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-dusk">
                  Cover-Bild
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      void handleCoverImage(event);
                    }}
                    className="rounded-[1.3rem] border border-dashed border-slate-300 px-4 py-4"
                  />
                </label>
                {draft.coverImage ? (
                  <QuestionImage image={draft.coverImage} />
                ) : (
                  <div className="grid min-h-44 place-items-center rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 text-sm text-dusk/70">
                    Füge ein komprimiertes Cover-Bild für Bibliothek und Moderator-Ansichten hinzu.
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.04 }}
        >
          <GlassPanel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeading
                title="Fragen"
                subtitle="Ordne Fragen, passe Zeiten an und feile an der perfekten Runde."
              />
              <Button onClick={addQuestion} variant="secondary">
                Frage hinzufügen
              </Button>
            </div>
            <AnimatePresence>
              <div className="mt-6 grid gap-5">
                {draft.questions.map((question, index) => (
                  <QuestionCardEditor
                    key={question.id}
                    question={question}
                    index={index}
                    onChange={(updater) => updateQuestion(question.id, updater)}
                    onRemove={() => removeQuestion(question.id)}
                    onMove={(direction) => moveQuestion(question.id, direction)}
                  />
                ))}
              </div>
            </AnimatePresence>
          </GlassPanel>
        </motion.div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <AnimatePresence>
            {validationMessage ? (
              <div
                key={validationMessage}
                className="ui-shake-in rounded-full bg-ember/10 px-4 py-2 text-sm font-semibold text-ember"
              >
                {validationMessage}
              </div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {lastSavedAt ? (
              <div
                key={lastSavedAt}
                className="ui-pop-in rounded-full bg-mint/25 px-4 py-2 text-sm font-semibold text-ocean"
              >
                Entwurf automatisch gespeichert um {formatDate(lastSavedAt)}
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
}

function QuizPreviewPage() {
  const { quizId } = useParams();
  const { hydrate, findQuiz, draft } = useLibraryStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const quiz = quizId ? findQuiz(quizId) ?? draft : draft;
  if (!quiz) {
    return <Navigate to="/quizzes" replace />;
  }

  return (
    <PageShell
      title={quiz.title}
      eyebrow="Quizvorschau"
      actions={
        <>
          <Button as="link" href={`/quizzes/${quiz.id}/edit`} variant="secondary">
            Bearbeiten
          </Button>
          <Button as="link" href={`/host/launch/${quiz.id}`}>
            Live starten
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        {quiz.coverImage ? (
          <GlassPanel>
            <img
              src={quiz.coverImage.dataUrl}
              alt={quiz.coverImage.alt ?? quiz.title}
              className="h-64 w-full rounded-[1.8rem] object-cover"
            />
          </GlassPanel>
        ) : null}
        {quiz.questions.map((question, index) => (
          <GlassPanel key={question.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeading
                title={`Frage ${index + 1}`}
                subtitle={`${question.timerSeconds}s · ${question.basePoints} Basispunkte · ${formatScoringModeLabel(question.scoringMode)}`}
              />
            </div>
            <p className="mt-4 text-lg font-semibold text-ink">{question.text}</p>
            <div className="mt-4">
              <QuestionImage image={question.image} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {question.options.map((option) => (
                <div
                  key={option.id}
                  className={`rounded-[1.4rem] border px-4 py-4 ${
                    option.id === question.correctOptionId
                      ? "border-mint bg-mint/15"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="font-semibold text-ink">{option.text}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        ))}
      </div>
    </PageShell>
  );
}

function HostLaunchPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { hydrate, findQuiz } = useLibraryStore();
  const { initialize, createSession, role, code, error, loading, reset } = useSessionStore();
  const firedRef = useRef(false);

  useEffect(() => {
    hydrate();
    initialize();
  }, [hydrate, initialize]);

  const quiz = quizId ? findQuiz(quizId) : undefined;

  useEffect(() => {
    if (!quiz || firedRef.current) {
      return;
    }
    firedRef.current = true;
    reset();
    createSession(quiz, "Moderator");
  }, [quiz, createSession, reset]);

  useEffect(() => {
    if (role === "host" && code) {
      void navigate(`/host/session/${code}`, { replace: true });
    }
  }, [role, code, navigate]);

  if (!quiz) {
    return <Navigate to="/quizzes" replace />;
  }

  return (
    <PageShell title="Live-Sitzung wird gestartet" eyebrow="Moderator">
      <GlassPanel>
        <p className="font-display text-3xl font-bold text-ink">Bereite {quiz.title} vor</p>
        <p className="mt-3 text-sm text-dusk/75">
          Deine Runde wird vorbereitet.
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-ocean via-mint to-sun"
            animate={{ x: ["-20%", "100%"] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
        </div>
        {loading ? <p className="mt-4 text-sm text-dusk/70">Sitzung wird erstellt…</p> : null}
        {error ? <p className="mt-4 text-sm font-semibold text-ember">{error}</p> : null}
      </GlassPanel>
    </PageShell>
  );
}

function HostSessionPage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { initialize, attemptReconnect, session, reveal, error, startSession, closeQuestion, revealAnswer, showLeaderboard, openQuestion, kickPlayer, endSession, reset } =
    useSessionStore();
  const { settings, updateSettings } = useSettingsStore();
  const reconnectAttemptedRef = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!reconnectAttemptedRef.current) {
      reconnectAttemptedRef.current = true;
      attemptReconnect(code, "host");
    }
  }, [attemptReconnect, code]);

  const hostSession = session && session.role === "host" ? session : null;
  const rosterRows = hostSession?.roster.map((player) => ({
    id: player.playerId,
    title: player.playerName,
    subtitle: player.connected ? "Verbunden" : "Offline",
    trailing: `${player.score}`
  })) ?? [];
  const leaderboardRows = (hostSession?.finalResults?.leaderboard ?? hostSession?.leaderboard ?? []).map(
    (entry) => ({
      id: entry.playerId,
      title: `#${entry.rank} ${entry.playerName}`,
      subtitle: `${entry.correctCount} richtig · ${formatResponseTime(entry.cumulativeResponseMs)}`,
      trailing: `${entry.score}`
    })
  );
  const hostCode = hostSession?.code;
  const questionIndex = hostSession?.currentQuestionIndex ?? 0;
  const isFinalQuestion =
    hostSession ? questionIndex >= hostSession.totalQuestions - 1 : false;

  const hostPhase = hostSession?.phase;

  useEffect(() => {
    if (!hostCode || hostPhase !== "answer_reveal" || !settings.autoAdvanceAfterReveal) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (isFinalQuestion) {
        endSession("completed");
        return;
      }

      openQuestion(questionIndex + 1);
    }, SESSION_DEFAULTS.autoAdvanceAfterRevealMs);

    return () => window.clearTimeout(timeout);
  }, [
    endSession,
    hostPhase,
    hostCode,
    isFinalQuestion,
    openQuestion,
    questionIndex,
    settings.autoAdvanceAfterReveal
  ]);

  return (
    <PageShell
      title={hostSession?.quizTitle ?? "Moderator-Lobby"}
      eyebrow="Moderator-Sitzung"
      actions={
        <>
          <Button variant="secondary" onClick={() => endSession("host_ended")}>
            Sitzung beenden
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              void navigate("/quizzes");
            }}
          >
            Verlassen
          </Button>
        </>
      }
    >
      <CountdownOverlay startedAt={hostSession?.phase === "countdown" ? hostSession.startedAt : undefined} />
      {!hostSession ? (
        <GlassPanel>
          <p className="font-display text-2xl font-bold text-ink">Sitzung wird wiederhergestellt…</p>
          {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
        </GlassPanel>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-6">
            <GlassPanel className="bg-gradient-to-br from-ink via-dusk to-ocean text-white">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-mint">
                    Beitrittslink
                  </p>
                  <p className="font-display text-6xl font-black tracking-[0.18em]">
                    {hostSession.code}
                  </p>
                  <p className="max-w-2xl break-all text-sm text-white/75">
                    {hostSession.joinUrl}
                  </p>
                </div>
                <div className="rounded-[1.8rem] bg-white p-4 text-ink">
                  <QRCodeSVG value={hostSession.joinUrl} size={144} />
                  <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-dusk/60">
                    QR-Code
                  </p>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel>
              <SectionHeading
                title="Sitzungssteuerung"
                subtitle={`Phase: ${formatPhaseLabel(hostSession.phase)}`}
              />
              <div className="mt-5 flex flex-wrap gap-3">
                {hostSession.phase === "lobby" ? (
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 0 rgba(94, 242, 195, 0)",
                        "0 0 24px rgba(94, 242, 195, 0.35)",
                        "0 0 0 rgba(94, 242, 195, 0)"
                      ]
                    }}
                    transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
                    className="rounded-full"
                  >
                    <Button onClick={startSession}>Spiel starten</Button>
                  </motion.div>
                ) : null}
                {hostSession.phase === "question_open" ? (
                  <Button onClick={() => closeQuestion(questionIndex)}>Frage schließen</Button>
                ) : null}
                {hostSession.phase === "question_closed" ? (
                  <Button onClick={() => revealAnswer(questionIndex)}>Antwort aufdecken</Button>
                ) : null}
                {hostSession.phase === "answer_reveal" ? (
                  <Button onClick={() => showLeaderboard(questionIndex)}>
                    Rangliste zeigen
                  </Button>
                ) : null}
                {hostSession.phase === "leaderboard" && !isFinalQuestion ? (
                  <Button onClick={() => openQuestion(questionIndex + 1)}>
                    Nächste Frage öffnen
                  </Button>
                ) : null}
                {hostSession.phase === "leaderboard" && isFinalQuestion ? (
                  <Button onClick={() => endSession("completed")}>Endergebnisse zeigen</Button>
                ) : null}
              </div>
              <label className="mt-5 flex items-center justify-between rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-dusk">
                <span className="pr-4">
                  Nach der Antwortauflösung nach 5 Sekunden automatisch weiter
                </span>
                <input
                  type="checkbox"
                  checked={settings.autoAdvanceAfterReveal}
                  onChange={(event) =>
                    updateSettings({
                      autoAdvanceAfterReveal: event.target.checked
                    })
                  }
                />
              </label>
              {hostSession.phase === "answer_reveal" && settings.autoAdvanceAfterReveal ? (
                <p className="mt-3 text-sm text-dusk/75">
                  Automatischer Wechsel ist aktiv. Nach 5 Sekunden geht es direkt zur nächsten Frage oder ins Finale.
                </p>
              ) : null}
            </GlassPanel>

            <GlassPanel>
              {hostSession.question ? (
                <div className="space-y-5">
                  <SectionHeading
                    title={`Frage ${hostSession.currentQuestionIndex + 1} von ${hostSession.totalQuestions}`}
                    subtitle={`${hostSession.question.timerSeconds}s · ${hostSession.question.basePoints} Basispunkte · ${formatScoringModeLabel(hostSession.question.scoringMode)}`}
                  />
                  <QuestionImage image={hostSession.question.image} />
                  <p className="font-display text-3xl font-black text-ink">
                    {hostSession.question.text}
                  </p>
                  <TimerBar
                    startedAt={hostSession.questionStartedAt}
                    endsAt={hostSession.questionEndsAt}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {hostSession.question.options.map((option) => {
                      const isCorrect = hostSession.revealedCorrectOptionId === option.id;
                      return (
                        <div
                          key={option.id}
                          className={`rounded-[1.5rem] border px-4 py-4 ${
                            hostSession.phase === "answer_reveal" && isCorrect
                              ? "border-mint bg-mint/15"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <p className="font-semibold text-ink">{option.text}</p>
                          {hostSession.phase === "answer_reveal" ? (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-dusk/60">
                              {reveal?.optionStats[option.id] ?? 0} Auswahl(en)
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : hostSession.phase === "final" && hostSession.finalResults ? (
                <div className="space-y-6">
                  <SectionHeading
                    title="Endergebnisse"
                    subtitle="Die komplette Rangliste dieser Runde bleibt in deinem Verlauf sichtbar."
                  />
                  <FinalPodium players={hostSession.finalResults.leaderboard} />
                </div>
              ) : (
                <div className="space-y-3">
                  <SectionHeading
                    title="Lobby-Status"
                    subtitle="Spieler können mit Code oder Link beitreten."
                  />
                  <p className="text-sm text-dusk/75">
                    Starte, sobald alle bereit sind.
                  </p>
                </div>
              )}
            </GlassPanel>
          </div>

          <div className="space-y-6">
            <GlassPanel>
              <SectionHeading
                title="Spielerliste"
                subtitle={`${hostSession.counts.connected} von ${hostSession.counts.total} verbunden`}
              />
              <div className="mt-5 space-y-4">
                <VirtualRoster items={rosterRows} />
                <div className="flex flex-wrap gap-2">
                  {hostSession.roster.map((player) => (
                    <button
                      key={player.playerId}
                      type="button"
                      onClick={() => kickPlayer(player.playerId)}
                      className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-dusk hover:bg-ember/10 hover:text-ember"
                    >
                      Entfernen {player.playerName}
                    </button>
                  ))}
                </div>
              </div>
            </GlassPanel>

            <GlassPanel>
              <SectionHeading
                title="Rangliste"
                subtitle="Federnde Neuordnung und stabile Gleichstands-Regeln."
              />
              <div className="mt-5">
                <VirtualRoster items={leaderboardRows} emphasisTopThree />
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function JoinCodePage() {
  const navigate = useNavigate();
  const { code: routeCode } = useParams();
  const normalizedRouteCode = routeCode ? normalizeJoinCode(routeCode) : "";
  const [code, setCode] = useState(normalizedRouteCode);
  const { initialize, probeCode, probeResult, loading, error } = useSessionStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (normalizedRouteCode.length === JOIN_CODE_LENGTH) {
      void probeCode(normalizedRouteCode);
    }
  }, [normalizedRouteCode, probeCode]);

  useEffect(() => {
    if (code.length !== JOIN_CODE_LENGTH) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void probeCode(code);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [code, probeCode]);

  const status =
    code.length !== JOIN_CODE_LENGTH
      ? "idle"
      : probeResult?.ok
        ? "valid"
        : error || probeResult?.ok === false
          ? "invalid"
          : "idle";

  return (
    <PageShell title="Sitzungscode eingeben" eyebrow="Spieler-Beitritt">
      <div className="mx-auto max-w-2xl">
        <GlassPanel>
          <SegmentedCodeInput value={code} onChange={setCode} status={status} />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                void probeCode(code);
              }}
              disabled={code.length !== JOIN_CODE_LENGTH || loading}
              variant="secondary"
            >
              Code prüfen
            </Button>
            <Button
              onClick={() => {
                void navigate(`/join/${code}/name`);
              }}
              disabled={!probeResult?.ok}
            >
              Weiter
            </Button>
          </div>
          {error ? (
            <p className="mt-4 text-center text-sm font-semibold text-ember">{error}</p>
          ) : null}
        </GlassPanel>
      </div>
    </PageShell>
  );
}

function JoinNamePage() {
  const navigate = useNavigate();
  const { code = "" } = useParams();
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
  const { initialize, joinSession, role, session, loading, error } = useSessionStore();
  const { hydrate, settings, updateSettings } = useSettingsStore();
  const displayName = displayNameOverride ?? settings.lastJoinName;

  useEffect(() => {
    initialize();
    hydrate();
  }, [hydrate, initialize]);

  useEffect(() => {
    if (role === "player" && session?.code === code) {
      void navigate(`/player/session/${code}`, { replace: true });
    }
  }, [role, session, code, navigate]);

  return (
    <PageShell title="Anzeigenamen wählen" eyebrow={`Code ${code}`}>
      <div className="mx-auto max-w-xl">
        <GlassPanel>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmedName = displayName.trim();
              if (!trimmedName) {
                return;
              }
              updateSettings({ lastJoinName: trimmedName });
              joinSession(code, trimmedName);
            }}
          >
            <label className="grid gap-2 text-sm font-semibold text-dusk">
              Anzeigename
              <input
                value={displayName}
                onChange={(event) => setDisplayNameOverride(event.target.value)}
                maxLength={32}
                className="rounded-[1.3rem] border border-slate-200 px-4 py-4 text-lg"
              />
            </label>
            <div className="flex justify-end gap-3">
              <Button as="link" href={`/join/${code}`} variant="secondary">
                Zurück
              </Button>
              <Button type="submit" disabled={!displayName.trim() || loading}>
                Quiz beitreten
              </Button>
            </div>
          </form>
          {error ? (
            <p className="mt-4 text-sm font-semibold text-ember">{error}</p>
          ) : null}
        </GlassPanel>
      </div>
    </PageShell>
  );
}

function AnswerGrid({
  options,
  selectedOptionId,
  correctOptionId,
  disabled,
  onSelect
}: {
  options: AnswerOption[];
  selectedOptionId: string | null | undefined;
  correctOptionId?: string;
  disabled: boolean;
  onSelect: (optionId: string) => void;
}) {
  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-2"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.07
          }
        }
      }}
    >
      {options.map((option) => {
        const selected = selectedOptionId === option.id;
        const revealedCorrect = correctOptionId === option.id;
        const revealedWrong = Boolean(correctOptionId) && selected && !revealedCorrect;

        return (
          <motion.button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.24 } }
            }}
            whileHover={disabled ? undefined : { y: -3, scale: 1.01, transition: { duration: 0.12 } }}
            whileTap={disabled ? undefined : { scale: 0.98, transition: { duration: 0.08 } }}
            animate={
              revealedWrong
                ? { x: [0, -8, 8, -6, 6, 0] }
                : undefined
            }
            transition={
              revealedWrong
                ? { duration: 0.32 }
                : undefined
            }
            className={`relative overflow-hidden rounded-[1.8rem] border px-4 py-5 text-left ${
              revealedCorrect
                ? "border-mint bg-mint/18"
                : selected
                  ? "border-ocean bg-ocean/10"
                  : disabled
                    ? "border-slate-200 bg-slate-50 text-dusk/60"
                    : "border-white/60 bg-white/85"
            }`}
          >
            {revealedCorrect ? (
              <motion.span
                className="absolute inset-0 rounded-[1.8rem] border-2 border-mint"
                animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 0.5, repeat: 1 }}
              />
            ) : null}
            <span className="relative z-10 font-semibold text-ink">{option.text}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

function PlayerSessionPage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { initialize, attemptReconnect, session, reveal, submitAnswer, reset, error } =
    useSessionStore();
  const reconnectAttemptedRef = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!reconnectAttemptedRef.current) {
      reconnectAttemptedRef.current = true;
      void attemptReconnect(code, "player");
    }
  }, [attemptReconnect, code]);

  const playerSession = session && session.role === "player" ? session : null;
  useEffect(() => {
    if (!playerSession && reconnectAttemptedRef.current && error) {
      void navigate(`/join/${code}`);
    }
  }, [playerSession, error, navigate, code]);

  if (!playerSession) {
    return (
      <PageShell title="Spieler-Sitzung wird wiederhergestellt" eyebrow={`Code ${code}`}>
        <GlassPanel>
          <p className="font-display text-2xl font-bold text-ink">Dein Platz wird wiederhergestellt…</p>
          {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
        </GlassPanel>
      </PageShell>
    );
  }

  const leaderboardRows = (playerSession.finalResults?.leaderboard ?? playerSession.leaderboard ?? []).map(
    (entry) => ({
      id: entry.playerId,
      title: `#${entry.rank} ${entry.playerName}`,
      subtitle: `${entry.correctCount} richtig · ${formatResponseTime(entry.cumulativeResponseMs)}`,
      trailing: `${entry.score}`
    })
  );

  const currentQuestion = playerSession.question;
  const selectedOptionId = playerSession.lockedAnswerOptionId;
  const playerResult = playerSession.finalResults?.players.find(
    (player) => player.playerId === playerSession.playerId
  );

  return (
    <PageShell
      title={playerSession.quizTitle}
      eyebrow={`Du spielst als ${playerSession.playerName}`}
      actions={
        playerSession.phase === "final" ? (
          <Button
            onClick={() => {
              reset();
              void navigate("/");
            }}
          >
            Noch einmal spielen
          </Button>
        ) : null
      }
    >
      <CountdownOverlay startedAt={playerSession.phase === "countdown" ? playerSession.startedAt : undefined} />
      <div aria-live="polite" className="sr-only">
        {playerSession.phase === "countdown"
          ? "Countdown gestartet"
          : playerSession.phase === "answer_reveal"
            ? "Antwort aufgedeckt"
            : playerSession.phase === "leaderboard"
              ? "Rangliste angezeigt"
              : playerSession.phase === "final"
                ? "Endergebnisse"
                : ""}
      </div>

      {playerSession.phase === "lobby" || playerSession.phase === "countdown" ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <GlassPanel>
            <SectionHeading
              title="Warteraum"
              subtitle="Bleib auf diesem Bildschirm, bis der Moderator startet."
            />
            <p className="mt-4 text-lg text-dusk/80">
              Du bist verbunden als <strong>{playerSession.playerName}</strong>.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <GlassPanel className="bg-slate-50">
                <p className="text-sm text-dusk/70">Aktueller Rang</p>
                <p className="font-display text-4xl font-black text-ocean">
                  {playerSession.playerRank ?? "—"}
                </p>
              </GlassPanel>
              <GlassPanel className="bg-slate-50">
                <p className="text-sm text-dusk/70">Punktestand</p>
                <p className="font-display text-4xl font-black text-ocean">
                  {playerSession.playerScore}
                </p>
              </GlassPanel>
              <GlassPanel className="bg-slate-50">
                <p className="text-sm text-dusk/70">Beigetretene Spieler</p>
                <p className="font-display text-4xl font-black text-ocean">
                  {playerSession.counts.total}
                </p>
              </GlassPanel>
            </div>
          </GlassPanel>
          <GlassPanel>
            <SectionHeading
              title="Spielerliste"
              subtitle="Auch große Lobbys bleiben dank Virtualisierung flüssig."
            />
            <div className="mt-5">
              <VirtualRoster
                items={playerSession.roster.map((player) => ({
                  id: player.playerId,
                  title: player.playerName,
                  subtitle: player.connected ? "Bereit" : "Wird wiederverbunden",
                  trailing: `${player.score}`
                }))}
              />
            </div>
          </GlassPanel>
        </div>
      ) : null}

      {playerSession.phase === "question_open" || playerSession.phase === "question_closed" ? (
        <div className="mx-auto max-w-4xl space-y-6">
          <GlassPanel>
            {currentQuestion ? (
              <div className="space-y-6">
                <SectionHeading
                  title={`Frage ${playerSession.currentQuestionIndex + 1}`}
                  subtitle={`${currentQuestion.timerSeconds}s · ${currentQuestion.basePoints} Basispunkte · ${formatScoringModeLabel(currentQuestion.scoringMode)}`}
                />
                <TimerBar
                  startedAt={playerSession.questionStartedAt}
                  endsAt={playerSession.questionEndsAt}
                />
                <QuestionImage image={currentQuestion.image} />
                <p className="font-display text-3xl font-black text-ink">
                  {currentQuestion.text}
                </p>
                <AnswerGrid
                  options={currentQuestion.options}
                  selectedOptionId={selectedOptionId}
                  disabled={Boolean(selectedOptionId) || playerSession.phase !== "question_open"}
                  onSelect={(optionId) =>
                    submitAnswer(playerSession.currentQuestionIndex, optionId)
                  }
                />
              </div>
            ) : null}
          </GlassPanel>
          {selectedOptionId ? (
            <motion.div
              className="rounded-full bg-ocean/10 px-4 py-3 text-center text-sm font-semibold text-ocean"
              animate={{ backgroundColor: ["rgba(12,79,217,0.08)", "rgba(12,79,217,0.16)", "rgba(12,79,217,0.08)"] }}
              transition={{ duration: 0.16 }}
            >
              Antwort fixiert. Warte auf die Auflösung…
            </motion.div>
          ) : null}
        </div>
      ) : null}

      {playerSession.phase === "answer_reveal" ? (
        <div className="mx-auto max-w-4xl space-y-6">
          <GlassPanel>
            <SectionHeading
              title="Antwortauflösung"
              subtitle="Hier siehst du sofort, ob du richtig lagst."
            />
            {currentQuestion ? (
              <>
                <p className="mt-4 font-display text-3xl font-black text-ink">
                  {currentQuestion.text}
                </p>
                <div className="mt-6">
                  <AnswerGrid
                    options={currentQuestion.options}
                    selectedOptionId={selectedOptionId}
                    correctOptionId={playerSession.revealedCorrectOptionId}
                    disabled
                    onSelect={() => undefined}
                  />
                </div>
              </>
            ) : null}
            {reveal ? (
              <p className="mt-6 text-lg font-semibold text-dusk">
                {reveal.playerResults.find(
                  (row) => row.playerId === playerSession.playerId
                )?.isCorrect
                  ? "Richtige Antwort. Dein Punktestand wurde aktualisiert."
                  : "Leider nicht richtig. Die Rangliste zeigt gleich den neuen Stand."}
              </p>
            ) : null}
          </GlassPanel>
        </div>
      ) : null}

      {playerSession.phase === "leaderboard" ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassPanel>
            <SectionHeading title="Dein Stand" subtitle="Aktualisiert nach dieser Runde." />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <GlassPanel className="bg-slate-50">
                <p className="text-sm text-dusk/70">Rang</p>
                <p className="font-display text-4xl font-black text-ocean">
                  {playerSession.playerRank ?? "—"}
                </p>
              </GlassPanel>
              <GlassPanel className="bg-slate-50">
                <p className="text-sm text-dusk/70">Punktestand</p>
                <motion.p
                  className="font-display text-4xl font-black text-ocean"
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  {playerSession.playerScore}
                </motion.p>
              </GlassPanel>
            </div>
          </GlassPanel>
          <GlassPanel>
            <SectionHeading title="Rangliste" subtitle="Stabile Gleichstands-Regeln." />
            <div className="mt-5">
              <VirtualRoster items={leaderboardRows} emphasisTopThree />
            </div>
          </GlassPanel>
        </div>
      ) : null}

      {playerSession.phase === "final" && playerSession.finalResults ? (
        <div className="space-y-6">
          <GlassPanel>
            <SectionHeading
              title="Endergebnisse"
              subtitle="Dein Ergebnis bleibt in deinem Verlauf sichtbar."
            />
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <GlassPanel className="bg-slate-50">
                  <p className="text-sm text-dusk/70">Dein Rang</p>
                  <p className="font-display text-5xl font-black text-ocean">
                    {playerResult?.rank ?? "—"}
                  </p>
                </GlassPanel>
                <GlassPanel className="bg-slate-50">
                  <p className="text-sm text-dusk/70">Dein Punktestand</p>
                  <p className="font-display text-5xl font-black text-ocean">
                    {playerResult?.score ?? playerSession.playerScore}
                  </p>
                </GlassPanel>
              </div>
              <div className="relative overflow-hidden rounded-[2rem]">
                <FinalPodium players={playerSession.finalResults.leaderboard} />
                <div className="pointer-events-none absolute inset-0">
                  {Array.from({ length: 20 }, (_, index) => (
                    <motion.span
                      key={index}
                      className="absolute top-0 h-3 w-2 rounded-full"
                      style={{
                        left: `${(index * 5) % 100}%`,
                        background:
                          index % 3 === 0 ? "#5ef2c3" : index % 3 === 1 ? "#ff7b48" : "#ffd54f"
                      }}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: [0, 1, 0], y: 220, rotate: index * 18 }}
                      transition={{ duration: 1.8, delay: index * 0.03 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      ) : null}
    </PageShell>
  );
}

function HistoryPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { hydrate, hostResults, playerHistory, exportResultsData, importResultsExport } =
    useLibraryStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const parsed = await readJsonFile(file);
    importResultsExport(parsed as never);
    event.target.value = "";
  }

  return (
    <PageShell
      title="Ergebnisverlauf"
      eyebrow="Deine Runden"
      actions={
        <>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Ergebnisse importieren
          </Button>
          <Button onClick={() => downloadJson("pulse-ergebnisse.json", exportResultsData())}>
            Ergebnisse exportieren
          </Button>
        </>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          void handleImport(event);
        }}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <SectionHeading
            title="Moderierte Sitzungen"
            subtitle="Alle abgeschlossenen Runden, die du geleitet hast."
          />
          <div className="mt-5 grid gap-4">
            {hostResults.length === 0 ? (
              <p className="text-sm text-dusk/75">Noch keine moderierten Runden.</p>
            ) : (
              hostResults.map((result) => (
                <div
                  key={`${result.code}-${result.endedAt}`}
                  className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4"
                >
                  <p className="font-display text-xl font-bold text-ink">{result.quizTitle}</p>
                  <p className="mt-2 text-sm text-dusk/75">
                    {result.totalPlayers} Spieler · {formatDate(result.endedAt)}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-ocean">
                    Sieger: {result.leaderboard[0]?.playerName ?? "—"}
                  </p>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel>
          <SectionHeading
            title="Persönlicher Spielverlauf"
            subtitle="Deine bisherigen Ergebnisse auf einen Blick."
          />
          <div className="mt-5 grid gap-4">
            {playerHistory.length === 0 ? (
              <p className="text-sm text-dusk/75">Noch keine persönlichen Ergebnisse.</p>
            ) : (
              playerHistory.map((record) => (
                <div
                  key={`${record.code}-${record.playerId}-${record.endedAt}`}
                  className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4"
                >
                  <p className="font-display text-xl font-bold text-ink">{record.quizTitle}</p>
                  <p className="mt-2 text-sm text-dusk/75">
                    {record.playerName} beendete das Quiz auf Rang #{record.rank} mit {record.score} Punkten.
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-dusk/60">
                    {formatDate(record.endedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>
    </PageShell>
  );
}

function SettingsPage() {
  const { hydrate, settings, updateSettings } = useSettingsStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <PageShell title="Einstellungen & Info" eyebrow="Dein Spiel">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <GlassPanel>
          <SectionHeading
            title="Einstellungen"
            subtitle="Passe die Runde so an, wie sie sich für dich am besten anfühlt."
          />
          <div className="mt-6 grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-dusk">
              Bewegungen
              <select
                value={settings.motion}
                onChange={(event) =>
                  updateSettings({
                    motion: event.target.value as typeof settings.motion
                  })
                }
                className="rounded-full border border-slate-200 px-4 py-3"
              >
                <option value="system">System folgen</option>
                <option value="full">Volle Animationen</option>
                <option value="reduced">Reduzierte Animationen</option>
              </select>
            </label>
            <label className="flex items-center justify-between rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-dusk">
              Sound-Hinweise
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(event) =>
                  updateSettings({
                    soundEnabled: event.target.checked
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-dusk">
              Moderator-Ansicht
              <select
                value={settings.hostDensity}
                onChange={(event) =>
                  updateSettings({
                    hostDensity: event.target.value as typeof settings.hostDensity
                  })
                }
                className="rounded-full border border-slate-200 px-4 py-3"
              >
                <option value="comfortable">Komfortabel</option>
                <option value="compact">Kompakt</option>
              </select>
            </label>
            <label className="flex items-center justify-between rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-dusk">
              Nach Antwortauflösung automatisch nach 5 Sekunden weiter
              <input
                type="checkbox"
                checked={settings.autoAdvanceAfterReveal}
                onChange={(event) =>
                  updateSettings({
                    autoAdvanceAfterReveal: event.target.checked
                  })
                }
              />
            </label>
          </div>
        </GlassPanel>

        <GlassPanel>
          <SectionHeading
            title="So spielt ihr"
            subtitle="Kurz und klar."
          />
          <div className="mt-6 grid gap-4 text-sm leading-7 text-dusk/80">
            <p>
              Erstelle ein Quiz mit Bildern, wähle Punkte und Zeiten aus und bringe jede Runde schnell in Stimmung.
            </p>
            <p>
              Teile in der Lobby einfach Code oder Link, damit alle ohne Umwege mitmachen können.
            </p>
            <p>
              Während des Spiels sehen alle nach jeder Frage direkt die Auflösung und ihren aktuellen Stand.
            </p>
            <p>
              Im Verlauf findest du frühere Runden wieder und kannst Quizze oder Ergebnisse jederzeit ein- und ausladen.
            </p>
          </div>
        </GlassPanel>
      </div>
    </PageShell>
  );
}

export {
  HistoryPage,
  HostLaunchPage,
  HostSessionPage,
  JoinCodePage,
  JoinNamePage,
  LandingPage,
  PlayerSessionPage,
  QuizEditorPage,
  QuizLibraryPage,
  QuizPreviewPage,
  SettingsPage
};
