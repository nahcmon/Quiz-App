import {
  AnimatePresence,
  motion
} from "framer-motion";
import {
  type ChangeEvent,
  useEffect,
  useRef
} from "react";
import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  QUIZ_LIMITS,
  type QuizQuestion,
  generateId
} from "@quiz/shared";

import { PageShell } from "../components/PageShell";
import { compressImageFile } from "../lib/imageCompression";
import { useEditorStore } from "../stores/useEditorStore";
import { useLibraryStore } from "../stores/useLibraryStore";
import { formatDate } from "./route-utils";
import {
  Button,
  GlassPanel,
  QuestionImage,
  SectionHeading
} from "./shared";

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


export default QuizEditorPage;
