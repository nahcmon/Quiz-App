import { AnimatePresence, motion } from "framer-motion";
import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { pageTransitionProps } from "./lib/motion";
import { useMobilePerformanceMode } from "./lib/mobilePerformance";
import { useSettingsStore } from "./stores/useSettingsStore";

const LandingPage = lazy(() => import("./routes/landing-page"));
const QuizLibraryPage = lazy(() => import("./routes/quiz-library-page"));
const QuizEditorPage = lazy(() => import("./routes/quiz-editor-page"));
const QuizPreviewPage = lazy(() => import("./routes/quiz-preview-page"));
const HostLaunchPage = lazy(() => import("./routes/host-launch-page"));
const HostSessionPage = lazy(() => import("./routes/host-session-page"));
const JoinCodePage = lazy(() => import("./routes/join-code-page"));
const JoinNamePage = lazy(() => import("./routes/join-name-page"));
const PlayerSessionPage = lazy(() => import("./routes/player-session-page"));
const HistoryPage = lazy(() => import("./routes/history-page"));
const SettingsPage = lazy(() => import("./routes/settings-page"));

function useAppReducedMotion() {
  const motion = useSettingsStore((state) => state.settings.motion);
  const systemReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (motion === "reduced") {
    return true;
  }
  if (motion === "full") {
    return false;
  }
  return systemReduced;
}

export default function App() {
  const location = useLocation();
  const mobilePerformanceMode = useMobilePerformanceMode();
  const reduced = useAppReducedMotion() || mobilePerformanceMode;
  const hydrateSettings = useSettingsStore((state) => state.hydrate);

  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageTransitionProps(reduced)}>
        <Suspense fallback={<div className="min-h-[40vh]" />}>
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/quizzes" element={<QuizLibraryPage />} />
            <Route path="/quizzes/new" element={<QuizEditorPage />} />
            <Route path="/quizzes/:quizId/edit" element={<QuizEditorPage />} />
            <Route path="/quizzes/:quizId/preview" element={<QuizPreviewPage />} />
            <Route path="/host/launch/:quizId" element={<HostLaunchPage />} />
            <Route path="/host/session/:code" element={<HostSessionPage />} />
            <Route path="/join" element={<JoinCodePage />} />
            <Route path="/join/:code" element={<JoinCodePage />} />
            <Route path="/join/:code/name" element={<JoinNamePage />} />
            <Route path="/player/session/:code" element={<PlayerSessionPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
