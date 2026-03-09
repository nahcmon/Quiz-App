import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { pageTransitionProps } from "./lib/motion";
import {
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
} from "./routes/screens";
import { useLibraryStore } from "./stores/useLibraryStore";
import { useSessionStore } from "./stores/useSessionStore";
import { useSettingsStore } from "./stores/useSettingsStore";

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
  const reduced = useAppReducedMotion();
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const initializeSession = useSessionStore((state) => state.initialize);

  useEffect(() => {
    hydrateLibrary();
    hydrateSettings();
    initializeSession();
  }, [hydrateLibrary, hydrateSettings, initializeSession]);

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageTransitionProps(reduced)}>
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
      </motion.div>
    </AnimatePresence>
  );
}
