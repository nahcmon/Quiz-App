import {
  useEffect,
  useState
} from "react";
import {
  useNavigate,
  useParams
} from "react-router-dom";

import { PageShell } from "../components/PageShell";
import { useSessionStore } from "../stores/useSessionStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import {
  Button,
  GlassPanel
} from "./shared";

function JoinNamePage() {
  const navigate = useNavigate();
  const { code = "" } = useParams();
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
  const { initialize, joinSession, role, session, loading, error } = useSessionStore();
  const { hydrate, settings, updateSettings } = useSettingsStore();
  const displayName = displayNameOverride ?? settings.lastJoinName;

  useEffect(() => {
    initialize();
    hydrate();
  }, [hydrate, initialize]);

  useEffect(() => {
    if (role === "player" && session?.code === code) {
      void navigate(`/player/session/${code}`, { replace: true });
    }
  }, [role, session, code, navigate]);

  return (
    <PageShell title="Anzeigenamen wählen" eyebrow={`Code ${code}`}>
      <div className="mx-auto max-w-xl">
        <GlassPanel>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmedName = displayName.trim();
              if (!trimmedName) {
                return;
              }
              updateSettings({ lastJoinName: trimmedName });
              joinSession(code, trimmedName);
            }}
          >
            <label className="grid gap-2 text-sm font-semibold text-dusk">
              Anzeigename
              <input
                value={displayName}
                onChange={(event) => setDisplayNameOverride(event.target.value)}
                maxLength={32}
                className="rounded-[1.3rem] border border-slate-200 px-4 py-4 text-lg"
              />
            </label>
            <div className="flex justify-end gap-3">
              <Button as="link" href={`/join/${code}`} variant="secondary">
                Zurück
              </Button>
              <Button type="submit" disabled={!displayName.trim() || loading}>
                Quiz beitreten
              </Button>
            </div>
          </form>
          {error ? (
            <p className="mt-4 text-sm font-semibold text-ember">{error}</p>
          ) : null}
        </GlassPanel>
      </div>
    </PageShell>
  );
}


export default JoinNamePage;
