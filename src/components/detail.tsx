import Link from "next/link";
import {
  Clock3,
  CalendarDays,
  Download,
  Info,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { Content } from "@/lib/models";
import { contents, demoSnippet, locale, sections } from "@/lib/content";
import { Breadcrumbs } from "./shell";
import { CodeBlock } from "./code-block";
import { ContentCard, StatusBadge } from "./library";
const standardSections = [
  ["overview", "Überblick"],
  ["prerequisites", "Voraussetzungen"],
  ["implementation", "Implementierung"],
  ["validation", "Qualitätssicherung"],
  ["sources", "Quellen & Einordnung"],
];
export function Detail({ item }: { item: Content }) {
  const toc =
    item.kind === "workshops"
      ? [
          ["overview", "Zielsetzung"],
          ["agenda", "Agenda"],
          ["materials", "Materialien"],
          ["facilitation", "Moderationshinweise"],
          ["sources", "Quellen & Einordnung"],
        ]
      : item.kind === "use-cases"
        ? [
            ["overview", "Ausgangssituation"],
            ["challenge", "Herausforderung"],
            ["solution", "Lösungsansatz"],
            ["prerequisites", "Technische Voraussetzungen"],
            ["implementation", "Umsetzung"],
            ["lessons", "Lessons Learned"],
            ["sources", "Quellen & Einordnung"],
          ]
        : standardSections;
  const related = contents
    .filter(
      (c) =>
        c.id !== item.id &&
        (c.technology === item.technology || c.category === item.category),
    )
    .slice(0, 2);
  return (
    <div className="page detail-page">
      <Breadcrumbs
        items={[
          { label: sections[item.kind].title, href: `/${item.kind}` },
          { label: item.title },
        ]}
      />
      <div className="detail-layout">
        <article>
          <div className="page-title">
            <span className="eyebrow">
              {item.technology} / {item.category}
            </span>
            <h1>{item.title}</h1>
            <p>{item.description}</p>
            <div className="metadata">
              <span>
                <CalendarDays size={14} />
                {new Date(item.updatedAt).toLocaleDateString(locale)}
              </span>
              <span>
                <Clock3 size={14} />
                {item.kind === "knowledge"
                  ? `${item.minutes} Min. Lesezeit`
                  : item.kind === "workshops"
                    ? item.duration
                    : "Demo-Material"}
              </span>
              <StatusBadge status={item.status} />
            </div>
          </div>
          <aside
            className={`callout ${item.status === "Veraltet" ? "warning" : ""}`}
          >
            <Info size={19} />
            <div>
              <strong>
                {item.status === "Veraltet"
                  ? "Veralteter Inhalt"
                  : item.status === "Prüfung erforderlich"
                    ? "Technische Prüfung erforderlich"
                    : "Synthetisches Demo-Beispiel"}
              </strong>
              <p>
                {item.status === "Veraltet"
                  ? "Dieser Artikel dient nur der historischen Demo-Einordnung. Vor einer Umsetzung müssen Syntax, Funktionen und Voraussetzungen neu geprüft werden."
                  : "Alle Inhalte sind frei erfunden und dienen der Veranschaulichung. Keine produktionsfertige Anleitung oder aktuelle SAP-Empfehlung."}
              </p>
            </div>
          </aside>
          {item.kind === "workshops" ? (
            <>
              <section id="overview">
                <h2>Zielsetzung</h2>
                <p>
                  {item.description} Das Ergebnis ist ein priorisiertes Bild der
                  nächsten Schritte mit klaren Verantwortlichkeiten.
                </p>
                <div className="fact-panel">
                  <span>
                    Zielgruppe<strong>{item.audience}</strong>
                  </span>
                  <span>
                    Themengebiet<strong>{item.category}</strong>
                  </span>
                </div>
              </section>
              <section id="agenda">
                <h2>Agenda</h2>
                <ol className="timeline">
                  {item.agenda.map((a, i) => (
                    <li key={a.title}>
                      <span className="timeline-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{a.title}</h3>
                        <p>
                          {a.minutes} Minuten ·{" "}
                          {i === 0
                            ? "Erwartungen sammeln und Rahmen vereinbaren."
                            : "Gemeinsam erarbeiten, Ergebnisse festhalten und offene Fragen markieren."}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section id="materials">
                <h2>Materialien</h2>
                <p>
                  Digitales Whiteboard oder Moderationswand, Notizzettel und
                  eine vorbereitete Journey-Vorlage.
                </p>
                <a
                  className="button"
                  href="/downloads/journey-canvas.md"
                  download
                >
                  <Download size={16} />
                  Journey Canvas herunterladen
                </a>
              </section>
              <section id="facilitation">
                <h2>Moderationshinweise</h2>
                <ul>
                  <li>
                    Zu Beginn ein gemeinsames Ziel und ein generisches Szenario
                    festlegen.
                  </li>
                  <li>Beobachtungen und Annahmen getrennt dokumentieren.</li>
                  <li>
                    Stillarbeit vor Diskussionen ermöglicht allen Teilnehmenden
                    einen Beitrag.
                  </li>
                  <li>
                    Mit maximal drei priorisierten Maßnahmen und
                    Verantwortlichkeiten abschließen.
                  </li>
                </ul>
              </section>
            </>
          ) : item.kind === "use-cases" ? (
            <>
              <section id="overview">
                <h2>Ausgangssituation</h2>
                <p>
                  Ein fiktives Unternehmen aus dem Bereich {item.industry}{" "}
                  möchte das Business-Ziel „{item.businessGoal}“ systematisch
                  unterstützen. Bisher werden die Kontaktpunkte einzeln
                  betrachtet.
                </p>
                <div className="fact-panel">
                  <span>
                    Komplexität<strong>{item.complexity}</strong>
                  </span>
                  <span>
                    Technologie<strong>{item.technology}</strong>
                  </span>
                </div>
              </section>
              <section id="challenge">
                <h2>Herausforderung</h2>
                <p>
                  {item.slug === "feedback-loop"
                    ? "Rückmeldungen werden gesammelt, führen aber noch nicht zu einem nachvollziehbaren Verbesserungsprozess."
                    : "Neu registrierte Kontakte erhalten keine abgestimmte Orientierung. Einwilligungen, Timing und Inhalte müssen zusammenpassen."}
                </p>
              </section>
              <section id="solution">
                <h2>Lösungsansatz</h2>
                <p>
                  {item.slug === "feedback-loop"
                    ? "Feedbackpunkte definieren, Themen bündeln und Maßnahmen nach Wirkung priorisieren."
                    : "Eine kleine, klar begrenzte Welcome Journey mit definiertem Einstieg, relevanten Inhalten und eindeutigen Ausstiegskriterien entwerfen."}
                </p>
              </section>
              <section id="prerequisites">
                <h2>Technische Voraussetzungen</h2>
                <ul>
                  <li>
                    Abgestimmtes Datenmodell und dokumentierte
                    Einwilligungslogik.
                  </li>
                  <li>
                    Getrennte Testumgebung mit ausschließlich synthetischen
                    Profilen.
                  </li>
                  <li>
                    Messbare Ziele und eindeutig zugeordnete
                    Verantwortlichkeiten.
                  </li>
                </ul>
              </section>
              <section id="implementation">
                <h2>Umsetzung</h2>
                <ol>
                  <li>
                    Ein generisches Segment und ein messbares Ziel festlegen.
                  </li>
                  <li>
                    Kontaktpunkte und Entscheidungskriterien im Testsystem
                    modellieren.
                  </li>
                  <li>
                    Positivfälle, fehlende Daten und widerrufene Einwilligung
                    prüfen.
                  </li>
                  <li>
                    Ergebnisse gemeinsam bewerten und nächste Iteration planen.
                  </li>
                </ol>
              </section>
              <section id="lessons">
                <h2>Lessons Learned</h2>
                <p>
                  Wenige klar definierte Schritte erleichtern die Prüfung.
                  Datenqualität und nachvollziehbare Entscheidungen sind
                  wichtiger als eine möglichst große Anzahl von Varianten. Dies
                  sind Lernziele des Demo-Szenarios, keine Ergebnisse eines
                  realen Kundenprojekts.
                </p>
              </section>
            </>
          ) : (
            <>
              <section id="overview">
                <h2>1. Überblick</h2>
                <p>
                  {item.description} Diese Skizze zeigt ein mögliches Vorgehen
                  für ein fiktives Projekt. Sie trennt fachliche Anforderungen,
                  Datenflüsse und technische Validierung.
                </p>
                {item.kind === "architecture" && (
                  <figure className="architecture-diagram">
                    <div>
                      {item.systems.map((s, i) => (
                        <div className="system-step" key={s}>
                          <span>
                            <NetworkIcon />
                            {s}
                          </span>
                          {i < item.systems.length - 1 && (
                            <ArrowRight size={20} />
                          )}
                        </div>
                      ))}
                    </div>
                    <figcaption>
                      Konzeptioneller Demo-Datenfluss · {item.integration} ·
                      keine Referenzarchitektur des Herstellers
                    </figcaption>
                  </figure>
                )}
                {item.kind === "templates" && (
                  <a className="button" href={item.download} download>
                    <Download size={16} />
                    {item.fileType}-Vorlage herunterladen
                  </a>
                )}
              </section>
              <section id="prerequisites">
                <h2>2. Voraussetzungen</h2>
                <ul>
                  <li>
                    Fachliches Ziel und Erfolgskriterien sind dokumentiert.
                  </li>
                  <li>Datenverantwortung und Einwilligung sind abgestimmt.</li>
                  <li>
                    Eine isolierte Testumgebung und synthetische Testdaten
                    stehen bereit.
                  </li>
                </ul>
              </section>
              <section id="implementation">
                <h2>3. Implementierung</h2>
                <h3>
                  3.1{" "}
                  {item.kind === "architecture"
                    ? "Schnittstellen und Verantwortlichkeiten"
                    : "Grundstruktur"}
                </h3>
                <p>
                  {item.kind === "architecture"
                    ? "Jede Verbindung benötigt einen klaren Vertrag: Datenformat, Richtung, Fehlerbehandlung und verantwortliches System. Die Darstellung oben ist bewusst vereinfacht."
                    : item.slug === "esl-grundlagen"
                      ? "Zuerst Inhalte und Fallback-Texte definieren. Die folgende JavaScript-Skizze illustriert nur Entscheidungslogik und ist ausdrücklich keine ESL-Syntax."
                      : "Zunächst wird ein minimaler Ablauf als Pseudokonzept festgehalten. Das Beispiel enthält keine echte Anbieter-API und lässt sich nicht als produktive Integration verwenden."}
                </p>
                <CodeBlock
                  code={
                    item.kind === "templates" && item.snippet
                      ? item.snippet
                      : demoSnippet
                  }
                />
              </section>
              <section id="validation">
                <h2>4. Qualitätssicherung</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Prüffall</th>
                        <th>Erwartung im Demo-Konzept</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Einwilligung vorhanden</td>
                        <td>Fachliche Verarbeitung darf geprüft werden</td>
                      </tr>
                      <tr>
                        <td>Einwilligung fehlt</td>
                        <td>Keine Aktivierung</td>
                      </tr>
                      <tr>
                        <td>Pflichtfeld fehlt</td>
                        <td>Kontrollierter Abbruch mit Diagnose</td>
                      </tr>
                      <tr>
                        <td>Wiederholtes Ereignis</td>
                        <td>Duplikate erkennen und behandeln</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <section id="sources">
            <h2>Quellen & Einordnung</h2>
            <p>
              {item.sourceReference}. Es wurden keine historischen Dokumente
              oder Kundendaten verwendet.
            </p>
            <p>
              Vor einer realen Umsetzung müssen die dann gültigen
              Produktdokumentationen und die Anforderungen der konkreten
              Umgebung geprüft werden.
            </p>
            <a
              className="source-link"
              href="https://help.sap.com/"
              target="_blank"
              rel="noreferrer"
            >
              SAP Help Portal · Einstieg zur späteren Prüfung{" "}
              <ExternalLink size={14} />
            </a>
          </section>
        </article>
        <aside className="toc">
          <span className="eyebrow">AUF DIESER SEITE</span>
          <nav>
            {toc.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <div className="toc-note">
            <BookIcon />
            Wissen wird besser,
            <br />
            wenn wir es teilen.
          </div>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="related">
          <div className="section-heading">
            <h2>Weiterdenken</h2>
            <span className="muted">Verwandte Inhalte</span>
          </div>
          <div className="card-grid">
            {related.map((c) => (
              <ContentCard key={c.id} item={c} />
            ))}
          </div>
        </section>
      )}
      <Link className="back-link" href={`/${item.kind}`}>
        Zurück zu {sections[item.kind].title}
      </Link>
    </div>
  );
}
function NetworkIcon() {
  return <span className="diagram-dot" />;
}
function BookIcon() {
  return <span className="sand">✦</span>;
}
