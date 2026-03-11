import {
  type ChangeEvent,
  useEffect,
  useRef
} from "react";

import { PageShell } from "../components/PageShell";
import { downloadJson, readJsonFile } from "../lib/importExport";
import { useLibraryStore } from "../stores/useLibraryStore";
import { formatDate } from "./route-utils";
import {
  Button,
  GlassPanel,
  SectionHeading
} from "./shared";

function HistoryPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { hydrate, hostResults, playerHistory, exportResultsData, importResultsExport } =
    useLibraryStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const parsed = await readJsonFile(file);
    importResultsExport(parsed as never);
    event.target.value = "";
  }

  return (
    <PageShell
      title="Ergebnisverlauf"
      eyebrow="Deine Runden"
      actions={
        <>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Ergebnisse importieren
          </Button>
          <Button onClick={() => downloadJson("pulse-ergebnisse.json", exportResultsData())}>
            Ergebnisse exportieren
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
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <SectionHeading
            title="Komplette Runden"
            subtitle="Gespeicherte Endergebnisse mit allen Mitspielern und Platzierungen."
          />
          <div className="mt-5 grid gap-4">
            {hostResults.length === 0 ? (
              <p className="text-sm text-dusk/75">Noch keine gespeicherten Endergebnisse.</p>
            ) : (
              hostResults.map((result) => (
                <div
                  key={`${result.code}-${result.endedAt}`}
                  className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4"
                >
                  <p className="font-display text-xl font-bold text-ink">{result.quizTitle}</p>
                  <p className="mt-2 text-sm text-dusk/75">
                    {result.totalPlayers} Spieler · {formatDate(result.endedAt)}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {result.leaderboard.map((entry) => (
                      <div
                        key={`${result.code}-${result.endedAt}-${entry.playerId}`}
                        className="flex items-center justify-between rounded-[1rem] bg-slate-50 px-3 py-3"
                      >
                        <div>
                          <p className="font-semibold text-ink">
                            #{entry.rank} {entry.playerName}
                          </p>
                          <p className="text-xs text-dusk/65">
                            {entry.correctCount} richtig
                          </p>
                        </div>
                        <p className="font-display text-lg font-bold text-ocean">
                          {entry.score}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel>
          <SectionHeading
            title="Persönlicher Spielverlauf"
            subtitle="Deine bisherigen Ergebnisse auf einen Blick."
          />
          <div className="mt-5 grid gap-4">
            {playerHistory.length === 0 ? (
              <p className="text-sm text-dusk/75">Noch keine persönlichen Ergebnisse.</p>
            ) : (
              playerHistory.map((record) => (
                <div
                  key={`${record.code}-${record.playerId}-${record.endedAt}`}
                  className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4"
                >
                  <p className="font-display text-xl font-bold text-ink">{record.quizTitle}</p>
                  <p className="mt-2 text-sm text-dusk/75">
                    {record.playerName} beendete das Quiz auf Rang #{record.rank} mit {record.score} Punkten.
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-dusk/60">
                    {formatDate(record.endedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>
    </PageShell>
  );
}


export default HistoryPage;
