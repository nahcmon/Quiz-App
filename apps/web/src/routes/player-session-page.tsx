import { motion } from "framer-motion";
import {
  Suspense,
  useEffect,
  useRef
} from "react";
import {
  useNavigate,
  useParams
} from "react-router-dom";

import { type AnswerOption } from "@quiz/shared";

import { PageShell } from "../components/PageShell";
import { useMobilePerformanceMode } from "../lib/mobilePerformance";
import { useSessionStore } from "../stores/useSessionStore";
import {
  formatResponseTime,
  formatScoringModeLabel,
  useAppReducedMotion
} from "./route-utils";
import {
  Button,
  CountdownOverlay,
  DeferredVirtualRoster,
  FinalPodium,
  GlassPanel,
  QuestionImage,
  RosterFallback,
  SectionHeading,
  TimerBar
} from "./shared";

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
  const reduced = useAppReducedMotion();
  const mobilePerformanceMode = useMobilePerformanceMode();
  const simplifiedMotion = reduced || mobilePerformanceMode;

  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-2"
      initial={simplifiedMotion ? undefined : "hidden"}
      animate={simplifiedMotion ? undefined : "visible"}
      variants={
        simplifiedMotion
          ? undefined
          : {
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.07
                }
              }
            }
      }
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
            variants={
              simplifiedMotion
                ? undefined
                : {
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.24 } }
                  }
            }
            whileHover={
              disabled || simplifiedMotion
                ? undefined
                : { y: -3, scale: 1.01, transition: { duration: 0.12 } }
            }
            whileTap={disabled ? undefined : { scale: 0.98, transition: { duration: 0.08 } }}
            animate={
              revealedWrong && !simplifiedMotion
                ? { x: [0, -8, 8, -6, 6, 0] }
                : undefined
            }
            transition={
              revealedWrong && !simplifiedMotion
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
              simplifiedMotion ? (
                <span className="absolute inset-0 rounded-[1.8rem] border-2 border-mint/80" />
              ) : (
                <motion.span
                  className="absolute inset-0 rounded-[1.8rem] border-2 border-mint"
                  animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 0.5, repeat: 1 }}
                />
              )
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
  const mobilePerformanceMode = useMobilePerformanceMode();
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
              <GlassPanel surface="soft">
                <p className="text-sm text-dusk/70">Aktueller Rang</p>
                <p className="font-display text-4xl font-black text-ocean">
                  {playerSession.playerRank ?? "—"}
                </p>
              </GlassPanel>
              <GlassPanel surface="soft">
                <p className="text-sm text-dusk/70">Punktestand</p>
                <p className="font-display text-4xl font-black text-ocean">
                  {playerSession.playerScore}
                </p>
              </GlassPanel>
              <GlassPanel surface="soft">
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
              <Suspense
                fallback={
                  <RosterFallback
                    items={playerSession.roster.map((player) => ({
                      id: player.playerId,
                      title: player.playerName,
                      subtitle: player.connected ? "Bereit" : "Wird wiederverbunden",
                      trailing: `${player.score}`
                    }))}
                  />
                }
              >
                <DeferredVirtualRoster
                  items={playerSession.roster.map((player) => ({
                    id: player.playerId,
                    title: player.playerName,
                    subtitle: player.connected ? "Bereit" : "Wird wiederverbunden",
                    trailing: `${player.score}`
                  }))}
                />
              </Suspense>
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
              <GlassPanel surface="soft">
                <p className="text-sm text-dusk/70">Rang</p>
                <p className="font-display text-4xl font-black text-ocean">
                  {playerSession.playerRank ?? "—"}
                </p>
              </GlassPanel>
              <GlassPanel surface="soft">
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
              <Suspense
                fallback={<RosterFallback items={leaderboardRows} emphasisTopThree />}
              >
                <DeferredVirtualRoster items={leaderboardRows} emphasisTopThree />
              </Suspense>
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
                <GlassPanel surface="soft">
                  <p className="text-sm text-dusk/70">Dein Rang</p>
                  <p className="font-display text-5xl font-black text-ocean">
                    {playerResult?.rank ?? "—"}
                  </p>
                </GlassPanel>
                <GlassPanel surface="soft">
                  <p className="text-sm text-dusk/70">Dein Punktestand</p>
                  <p className="font-display text-5xl font-black text-ocean">
                    {playerResult?.score ?? playerSession.playerScore}
                  </p>
                </GlassPanel>
              </div>
              <div className="relative overflow-hidden rounded-[2rem]">
                <FinalPodium players={playerSession.finalResults.leaderboard} />
                {!mobilePerformanceMode ? (
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
                ) : null}
              </div>
            </div>
          </GlassPanel>
        </div>
      ) : null}
    </PageShell>
  );
}


export default PlayerSessionPage;
