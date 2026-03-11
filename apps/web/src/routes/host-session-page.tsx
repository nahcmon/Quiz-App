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

import { SESSION_DEFAULTS } from "@quiz/shared";

import { PageShell } from "../components/PageShell";
import { useMobilePerformanceMode } from "../lib/mobilePerformance";
import { useSessionStore } from "../stores/useSessionStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import {
  formatPhaseLabel,
  formatResponseTime,
  formatScoringModeLabel
} from "./route-utils";
import {
  Button,
  CountdownOverlay,
  DeferredQRCodeSvg,
  DeferredVirtualRoster,
  FinalPodium,
  GlassPanel,
  QuestionImage,
  RosterFallback,
  SectionHeading,
  TimerBar
} from "./shared";

function HostSessionPage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const mobilePerformanceMode = useMobilePerformanceMode();
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
        showLeaderboard(questionIndex);
        return;
      }

      openQuestion(questionIndex + 1);
    }, SESSION_DEFAULTS.autoAdvanceAfterRevealMs);

    return () => window.clearTimeout(timeout);
  }, [
    hostPhase,
    hostCode,
    isFinalQuestion,
    openQuestion,
    questionIndex,
    showLeaderboard,
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
            <GlassPanel
              surface="clear"
              className="hero-panel text-white"
            >
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
                  <Suspense
                    fallback={<div className="h-36 w-36 rounded-[1.4rem] bg-slate-100" />}
                  >
                    <DeferredQRCodeSvg value={hostSession.joinUrl} size={144} />
                  </Suspense>
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
                    animate={
                      mobilePerformanceMode
                        ? undefined
                        : {
                            boxShadow: [
                              "0 0 0 rgba(94, 242, 195, 0)",
                              "0 0 24px rgba(94, 242, 195, 0.35)",
                              "0 0 0 rgba(94, 242, 195, 0)"
                            ]
                          }
                    }
                    transition={
                      mobilePerformanceMode
                        ? undefined
                        : { duration: 2.5, repeat: Number.POSITIVE_INFINITY }
                    }
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
                  Automatischer Wechsel ist aktiv. Nach 5 Sekunden geht es direkt zur nächsten Frage oder bei der letzten Frage zuerst in die Rangliste.
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
                <Suspense fallback={<RosterFallback items={rosterRows} />}>
                  <DeferredVirtualRoster items={rosterRows} />
                </Suspense>
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
                <Suspense
                  fallback={<RosterFallback items={leaderboardRows} emphasisTopThree />}
                >
                  <DeferredVirtualRoster items={leaderboardRows} emphasisTopThree />
                </Suspense>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </PageShell>
  );
}


export default HostSessionPage;
