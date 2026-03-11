import { motion } from "framer-motion";
import {
  useEffect,
  useRef
} from "react";
import {
  Navigate,
  useNavigate,
  useParams
} from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useSessionStore } from "../stores/useSessionStore";
import { GlassPanel } from "./shared";

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


export default HostLaunchPage;
