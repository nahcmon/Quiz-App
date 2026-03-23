import { PageShell } from "../components/PageShell";
import {
  GlassPanel,
  SectionHeading
} from "./shared";

const currentFacts = [
  {
    de: "Das Projekt wird als Hobbyprojekt ohne veröffentlichte Unternehmens- oder Betreiberdaten dargestellt.",
    en: "The project is presented as a hobby project without published company or operator details."
  },
  {
    de: "Der aktuelle Funktionsumfang ist kostenlos; im geprüften Code wurde kein bezahlter Checkout oder Abo-Fluss gefunden.",
    en: "The current feature set is free; no paid checkout or subscription flow was found in the reviewed code."
  },
  {
    de: "Genannte Anbieter: Vercel für das Web-Frontend und Render für den Realtime-Server.",
    en: "Named vendors: Vercel for the web frontend and Render for the realtime server."
  },
  {
    de: "Keine Analytics im aktuellen Stand; Google Fonts werden dennoch extern von Google geladen.",
    en: "No analytics in the current state; Google Fonts are still loaded externally from Google."
  },
  {
    de: "Keine Teilnahme an Verbraucher-ADR angegeben; keine Verarbeitung von Kinderdaten angegeben.",
    en: "No participation in consumer ADR was indicated; no children data processing was indicated."
  }
];

const includedItems = [
  {
    de: "Diese App enthält jetzt sichtbare Rechtslinks sowie eine bilingual dokumentierte Datenschutz-/Privacy-Seite mit den tatsächlich ableitbaren Fakten.",
    en: "This app now includes visible legal links and a bilingual privacy page documenting the facts that can actually be derived."
  },
  {
    de: "Es werden bewusst keine erfundenen Kontaktdaten, keine Fake-Anbieterkennzeichnung und keine Platzhalter veröffentlicht.",
    en: "No invented contact details, fake provider identification, or placeholders are published."
  },
  {
    de: "AGB, Widerruf und Zahlungs-/Checkout-Texte wurden nicht aufgenommen, weil im aktuellen Stand kein bezahlter Verbrauchervertrag erkennbar ist.",
    en: "Terms, withdrawal text, and payment/checkout clauses were not included because no paid consumer contract is evident in the current state."
  }
];

const missingItems = [
  {
    de: "Ohne veröffentlichte Betreiberidentität und Kontaktmöglichkeiten ist kein vollständiges Impressum nach deutschem Standard vorhanden.",
    en: "Without published operator identity and contact details, there is no complete German-style imprint."
  },
  {
    de: "Ohne veröffentlichte Verantwortlichen-Daten ist die Privacy-Seite keine vollständige Art.-13-DSGVO-Information.",
    en: "Without published controller details, the privacy page is not a complete Article 13 GDPR notice."
  },
  {
    de: "Der aktive Google-Fonts-CDN-Aufruf bleibt ein offener Drittanbieter- und Datentransfer-Punkt.",
    en: "The active Google Fonts CDN request remains an open third-party and data-transfer point."
  },
  {
    de: "Diese App sollte deshalb nicht als 'rechtlich fertig' oder 'go-live-ready' für einen öffentlichen Deutschland-/EU-Launch dargestellt werden.",
    en: "For that reason, this app should not be presented as 'legally finished' or 'go-live ready' for a public Germany/EU launch."
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

function LegalStatusPage() {
  return (
    <PageShell title="Rechtsstatus / Legal Status" eyebrow="Rechtliches">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <GlassPanel surface="clear" className="hero-panel-soft">
            <SectionHeading
              title="Keine Rechtsberatung / Not Legal Advice"
              subtitle="Dieser Build enthält die maximal ehrliche Teilumsetzung ohne veröffentlichte persönliche Betreiberdaten."
            />
            <div className="mt-5 grid gap-4 text-sm leading-7 text-dusk/80">
              <p>
                Diese Seite behauptet nicht, dass die Website vollständig compliant, rechtssicher
                oder publikationsreif ist.
              </p>
              <p>
                This page does not claim that the website is fully compliant, legally secure, or
                publication-ready.
              </p>
              <p>
                Statt erfundener Angaben dokumentiert sie offen, was eingebaut wurde und welche
                rechtlichen Lücken bewusst bestehen bleiben.
              </p>
              <p>
                Instead of invented details, it openly documents what was added and which legal gaps
                deliberately remain.
              </p>
            </div>
          </GlassPanel>

          <GlassPanel>
            <SectionHeading
              title="Aktueller Stand / Current Facts"
              subtitle="Diese Punkte stammen aus deinen Vorgaben und dem Code."
            />
            <BilingualList items={currentFacts} />
          </GlassPanel>

          <GlassPanel>
            <SectionHeading
              title="Was eingebaut wurde / What Was Added"
              subtitle="Alles, was ohne persönliche Betreiberdaten wahrheitsgemäß eingebaut werden konnte."
            />
            <BilingualList items={includedItems} />
          </GlassPanel>
        </div>

        <div className="space-y-6">
          <GlassPanel>
            <SectionHeading
              title="Was weiterhin fehlt / What Is Still Missing"
              subtitle="Diese Punkte blockieren weiterhin einen sauberen öffentlichen DE/EU-Launch."
            />
            <BilingualList items={missingItems} />
          </GlassPanel>

          <GlassPanel>
            <SectionHeading
              title="Dokumentenlogik / Document Logic"
              subtitle="Warum bestimmte Standardtexte hier nicht veröffentlicht wurden."
            />
            <div className="mt-5 grid gap-4 text-sm leading-7 text-dusk/80">
              <p>
                Kein vollständiges Impressum: keine veröffentlichte Anbieteridentität. Keine
                vollständige Datenschutzerklärung: keine veröffentlichte Verantwortlichen-Adresse.
              </p>
              <p>
                No complete imprint: no published provider identity. No complete privacy notice: no
                published controller address.
              </p>
              <p>
                Keine AGB, kein Widerruf, kein ADR-Block: im aktuellen Stand kein bezahlter
                Verbrauchervertrag und keine erklärte ADR-Teilnahme.
              </p>
              <p>
                No terms, withdrawal, or ADR block: no paid consumer contract and no declared ADR
                participation in the current state.
              </p>
            </div>
          </GlassPanel>

          <GlassPanel>
            <SectionHeading
              title="Stand / Verification"
              subtitle="Legal basis verified on: 2026-03-23"
            />
            <div className="mt-5 grid gap-4 text-sm leading-7 text-dusk/80">
              <p>
                Geprüfte Leitquellen: DSGVO/GDPR, DDG § 5, TDDDG § 25 sowie die aktualisierte
                ODR-/ADR-Lage nach 2025.
              </p>
              <p>
                Reviewed anchor sources: GDPR, DDG Section 5, TDDDG Section 25, and the updated
                post-2025 ODR/ADR framework.
              </p>
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageShell>
  );
}

export default LegalStatusPage;
