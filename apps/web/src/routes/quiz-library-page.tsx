import { motion } from "framer-motion";
import {
  type ChangeEvent,
  useEffect,
  useRef
} from "react";

import { PageShell } from "../components/PageShell";
import { downloadJson, readJsonFile } from "../lib/importExport";
import { useLibraryStore } from "../stores/useLibraryStore";
import { formatDate } from "./route-utils";
import { Button, GlassPanel } from "./shared";

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
        <GlassPanel
          surface="clear"
          className="hero-panel-soft mb-6"
        >
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


export default QuizLibraryPage;
