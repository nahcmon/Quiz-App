import { PageShell } from "../components/PageShell";
import {
  GlassPanel,
  SectionHeading
} from "./shared";

const assumptions = [
  {
    de: "Hobbyprojekt einer natürlichen Person ohne veröffentlichte Unternehmensdaten.",
    en: "Hobby project operated by a natural person without published company details."
  },
  {
    de: "Kostenloses Angebot ohne bezahlte Verträge, Abos oder Checkout im aktuellen Code-Stand.",
    en: "Free-only service without paid contracts, subscriptions, or checkout in the current codebase."
  },
  {
    de: "Globale Zielgruppe; genannte Anbieter: Vercel für das Web-Frontend und Render für den Realtime-Server.",
    en: "Global audience; named vendors are Vercel for the web frontend and Render for the realtime server."
  },
  {
    de: "Keine Analytics-, Werbe- oder Newsletter-Integration im aktuell geprüften Code gefunden.",
    en: "No analytics, advertising, or newsletter integration was found in the currently reviewed code."
  },
  {
    de: "Google Fonts werden weiterhin direkt von Googles CDN geladen und wurden auf ausdrücklichen Wunsch nicht entfernt.",
    en: "Google Fonts are still loaded directly from Google's CDN and were intentionally not removed."
  }
];

const processingItems = [
  {
    de: "Die App speichert Quizze, Entwürfe, Host-Ergebnisse, persönlichen Verlauf, Einstellungen und Reconnect-Helfer lokal im Browser über localStorage.",
    en: "The app stores quizzes, drafts, host results, personal history, settings, and reconnect helpers locally in the browser via localStorage."
  },
  {
    de: "Für Live-Runden verarbeitet der Realtime-Server Sitzungsdaten wie Join-Code, Spielernamen, Antworten, Punktestände, Timerzustände und Quiz-Snapshots einschließlich eingebetteter Bilder.",
    en: "For live rounds, the realtime server processes session data such as join code, player names, answers, scores, timer states, and quiz snapshots including embedded images."
  },
  {
    de: "Der Server verarbeitet Verbindungs- und IP-bezogene Daten für Stabilität, Missbrauchsschutz sowie Join- und Probe-Rate-Limits.",
    en: "The server processes connection and IP-related data for stability, abuse prevention, and join/probe rate limits."
  },
  {
    de: "Das Web-Frontend wird über Vercel ausgeliefert; der Realtime-Dienst läuft auf Render. Infrastruktur- oder Zugriffslogs dieser Anbieter können zusätzlich anfallen, sind aber im Repository nicht vollständig dokumentiert.",
    en: "The web frontend is delivered via Vercel; the realtime service runs on Render. Infrastructure or access logs by those providers may also exist, but they are not fully documented in this repository."
  },
  {
    de: "Beim Laden der Website werden Google Fonts von Google angefordert. Dabei können insbesondere IP-Adresse, Browser-Metadaten und Verbindungsdaten an Google übermittelt werden; eine Verarbeitung außerhalb des EWR ist möglich.",
    en: "When the site loads, Google Fonts are requested from Google. This may transmit IP address, browser metadata, and connection data to Google; processing outside the EEA is possible."
  }
];

const legalBasisItems = [
  {
    de: "Arbeitsannahme: Die Bereitstellung der angeforderten Multiplayer-Funktion kann teilweise auf Art. 6 Abs. 1 lit. b DSGVO gestützt werden, soweit die Verarbeitung zur Ausführung der konkret angeforderten Spielsession erforderlich ist.",
    en: "Working assumption: providing the requested multiplayer functionality may rely in part on Article 6(1)(b) GDPR to the extent processing is necessary to perform the specifically requested game session."
  },
  {
    de: "Betrieb, IT-Sicherheit, Missbrauchsschutz, Rate-Limits und Dienststabilität werden derzeit als berechtigtes Interesse nach Art. 6 Abs. 1 lit. f DSGVO eingeordnet.",
    en: "Operation, IT security, abuse prevention, rate limits, and service stability are currently treated as legitimate interests under Article 6(1)(f) GDPR."
  },
  {
    de: "Im Browser gespeicherte Daten bleiben grundsätzlich auf dem Gerät, bis Nutzer sie löschen, überschreiben, exportieren oder der Browser-Speicher entfernt wird.",
    en: "Data stored in the browser generally remains on the device until users delete, overwrite, export it, or clear browser storage."
  },
  {
    de: "Live-Sitzungsdaten sind laut Code und README als In-Memory-Status für aktive und kürzlich beendete Sessions konzipiert; die genaue operative Speicherlogik des Betreibers wird in diesem Build nicht veröffentlicht.",
    en: "According to the code and README, live session data is designed as in-memory state for active and recently ended sessions; the operator's exact operational retention logic is not published in this build."
  }
];

const notInUseItems = [
  {
    de: "Keine Analytics- oder Werbe-Skripte im geprüften Code.",
    en: "No analytics or advertising scripts in the reviewed code."
  },
  {
    de: "Kein Nutzerkonto-System, kein Checkout, kein Zahlungsdienst, kein Newsletter und kein Chat-/Support-Widget im aktuellen Stand.",
    en: "No user-account system, checkout, payment provider, newsletter, or chat/support widget in the current state."
  },
  {
    de: "Kein Consent-Manager vorhanden; nach aktuellem Code wurden nur funktionale Browser-Speicherung und die Live-Verbindung identifiziert, zusätzlich bleibt aber der Google-Fonts-Aufruf als externer Request bestehen.",
    en: "No consent manager is present; in the current code only functional browser storage and the live connection were identified, but the Google Fonts request remains an external call."
  }
];

const blockerItems = [
  {
    de: "Keine veröffentlichte Identität oder Kontaktadresse des Verantwortlichen. Dadurch ist diese Seite keine vollständige Datenschutzerklärung nach Art. 13 DSGVO.",
    en: "No published controller identity or contact details. As a result, this page is not a complete Article 13 GDPR privacy notice."
  },
  {
    de: "Kein veröffentlichtes Impressum bzw. keine Anbieterkennzeichnung für einen öffentlichen Deutschland-/EU-Launch.",
    en: "No published imprint/provider identification for a public Germany/EU launch."
  },
  {
    de: "Google Fonts wird weiterhin extern geladen; Transfermechanismus, Drittlandbezug und Betreiberentscheidung hierzu sind nicht abschließend dokumentiert.",
    en: "Google Fonts continues to load externally; the transfer mechanism, third-country angle, and operator decision around it are not fully documented."
  },
  {
    de: "Aufsichtsbehörde, Ausübungsweg für Betroffenenrechte und vollständige Empfängerliste des Betreibers sind nicht veröffentlicht.",
    en: "Supervisory authority, rights-exercise workflow, and the operator's complete recipient list are not published."
  }
];

function BilingualList({
  items
}: {
  items: Array<{
    de: string;
    en: string;
  }>;
}) {
  return (
    <ul className="mt-5 grid gap-4">
      {items.map((item) => (
        <li
          key={item.de}
          className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4"
        >
          <p className="text-sm font-semibold text-ink">{item.de}</p>
          <p className="mt-2 text-sm leading-6 text-dusk/75">{item.en}</p>
        </li>
      ))}
    </ul>
  );
}

function PrivacyPage() {
  return (
    <PageShell title="Datenschutz / Privacy" eyebrow="Rechtliches">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <GlassPanel surface="clear" className="hero-panel-soft">
            <SectionHeading
              title="Wichtiger Hinweis / Important Notice"
              subtitle="Diese Seite beschreibt nur die Fakten, die aus Code und den von dir freigegebenen Angaben ableitbar sind."
            />
            <div className="mt-5 grid gap-4 text-sm leading-7 text-dusk/80">
              <p>
                Keine Rechtsberatung. Diese Inhalte muessen vor einem öffentlichen Go-live weiter
                von qualifizierter deutscher/europäischer Rechtsberatung geprüft werden.
              </p>
              <p>
                Not legal advice. These contents still require review by qualified German/EU
                counsel before any public launch.
              </p>
              <p>
                Weil in diesem Build bewusst keine Betreiber- oder Verantwortlichen-Daten
                veröffentlicht werden, ist dies keine vollständige Datenschutzinformation für einen
                öffentlichen Deutschland-/EU-Launch.
              </p>
              <p>
                Because this build intentionally does not publish operator or controller details,
                this is not a complete privacy notice for a public Germany/EU launch.
              </p>
            </div>
          </GlassPanel>

          <GlassPanel>
            <SectionHeading
              title="Aktuell bekannte Verarbeitung / Currently Known Processing"
              subtitle="Zusammenfassung des aktuellen Code- und Hosting-Setups."
            />
            <BilingualList items={processingItems} />
          </GlassPanel>

          <GlassPanel>
            <SectionHeading
              title="Rechtsgrundlagen und Speicherlogik / Legal Bases and Retention"
              subtitle="Arbeitsannahmen, die noch juristisch geprüft werden sollten."
            />
            <BilingualList items={legalBasisItems} />
          </GlassPanel>
        </div>

        <div className="space-y-6">
          <GlassPanel>
            <SectionHeading
              title="Derzeit nicht im Einsatz / Not Currently in Use"
              subtitle="Nur soweit im aktuellen Repository nachvollziehbar."
            />
            <BilingualList items={notInUseItems} />
          </GlassPanel>

          <GlassPanel>
            <SectionHeading
              title="Offene Blocker / Open Blockers"
              subtitle="Diese Punkte verhindern weiterhin einen sauberen öffentlichen DE/EU-Launch."
            />
            <BilingualList items={blockerItems} />
          </GlassPanel>

          <GlassPanel>
            <SectionHeading
              title="Annahmen / Assumptions"
              subtitle="Auf diesen freigegebenen Eckdaten basiert der aktuelle Stand."
            />
            <BilingualList items={assumptions} />
          </GlassPanel>

          <GlassPanel>
            <SectionHeading
              title="Stand / Verification"
              subtitle="Legal basis verified on: 2026-03-23"
            />
            <div className="mt-5 grid gap-3 text-sm leading-7 text-dusk/80">
              <p>
                Zentrale Rechtsquellen: DSGVO/GDPR, DDG § 5, TDDDG § 25 und die ODR-Aufhebung ab
                2025.
              </p>
              <p>
                Core legal anchors: GDPR, DDG Section 5, TDDDG Section 25, and the post-2025 ODR
                repeal framework.
              </p>
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageShell>
  );
}

export default PrivacyPage;
