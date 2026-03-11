import { useEffect } from "react";
import {
  Navigate,
  useParams
} from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { useLibraryStore } from "../stores/useLibraryStore";
import { formatScoringModeLabel } from "./route-utils";
import {
  Button,
  GlassPanel,
  QuestionImage,
  SectionHeading
} from "./shared";

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


export default QuizPreviewPage;
