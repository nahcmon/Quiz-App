import {
  useEffect,
  useState
} from "react";
import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  JOIN_CODE_LENGTH,
  normalizeJoinCode
} from "@quiz/shared";

import { PageShell } from "../components/PageShell";
import { SegmentedCodeInput } from "../components/SegmentedCodeInput";
import { useSessionStore } from "../stores/useSessionStore";
import {
  Button,
  GlassPanel
} from "./shared";

function JoinCodePage() {
  const navigate = useNavigate();
  const { code: routeCode } = useParams();
  const normalizedRouteCode = routeCode ? normalizeJoinCode(routeCode) : "";
  const [code, setCode] = useState(normalizedRouteCode);
  const { initialize, probeCode, probeResult, loading, error } = useSessionStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (normalizedRouteCode.length === JOIN_CODE_LENGTH) {
      void probeCode(normalizedRouteCode);
    }
  }, [normalizedRouteCode, probeCode]);

  useEffect(() => {
    if (code.length !== JOIN_CODE_LENGTH) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void probeCode(code);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [code, probeCode]);

  const status =
    code.length !== JOIN_CODE_LENGTH
      ? "idle"
      : probeResult?.ok
        ? "valid"
        : error || probeResult?.ok === false
          ? "invalid"
          : "idle";

  return (
    <PageShell title="Sitzungscode eingeben" eyebrow="Spieler-Beitritt">
      <div className="mx-auto max-w-2xl">
        <GlassPanel>
          <SegmentedCodeInput value={code} onChange={setCode} status={status} />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                void probeCode(code);
              }}
              disabled={code.length !== JOIN_CODE_LENGTH || loading}
              variant="secondary"
            >
              Code prüfen
            </Button>
            <Button
              onClick={() => {
                void navigate(`/join/${code}/name`);
              }}
              disabled={!probeResult?.ok}
            >
              Weiter
            </Button>
          </div>
          {error ? (
            <p className="mt-4 text-center text-sm font-semibold text-ember">{error}</p>
          ) : null}
        </GlassPanel>
      </div>
    </PageShell>
  );
}


export default JoinCodePage;
