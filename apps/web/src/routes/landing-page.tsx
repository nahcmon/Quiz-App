import { motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { ActionCard } from "../components/ActionCard";
import { PageShell } from "../components/PageShell";
import { useMobilePerformanceMode } from "../lib/mobilePerformance";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useAppReducedMotion } from "./route-utils";
import {
  Button,
  GlassPanel,
  SectionHeading
} from "./shared";

function LandingPage() {
  const navigate = useNavigate();
  const mobilePerformanceMode = useMobilePerformanceMode();
  const reduced = useAppReducedMotion();
  const hydrate = useLibraryStore((state) => state.hydrate);
  const simplifiedMotion = reduced || mobilePerformanceMode;
  const warnings = useLibraryStore((state) => state.storageWarnings);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <GlassPanel
          surface="clear"
          className="hero-panel self-start text-white"
        >
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
            initial={simplifiedMotion ? undefined : "hidden"}
            animate={simplifiedMotion ? undefined : "visible"}
            variants={
              simplifiedMotion
                ? undefined
                : {
                    hidden: {},
                    visible: {
                      transition: {
                        staggerChildren: 0.12
                      }
                    }
                  }
            }
          >
            {items.map((item) => (
              <motion.div
                key={item.title}
                variants={
                  simplifiedMotion
                    ? undefined
                    : {
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
                      }
                }
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


export default LandingPage;
