import { useEffect } from "react";

import { PageShell } from "../components/PageShell";
import { useSettingsStore } from "../stores/useSettingsStore";
import {
  GlassPanel,
  SectionHeading
} from "./shared";

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

export default SettingsPage;
