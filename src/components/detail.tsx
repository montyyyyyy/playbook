import Link from "next/link";
import { CalendarDays, Clock3, Download, Info } from "lucide-react";
import type { Content } from "@/lib/models";
import { sections, locale } from "@/lib/content";
import { Breadcrumbs } from "./shell";
import { CodeBlock } from "./code-block";
import { ContentCard, StatusBadge } from "./library";
export function Detail({
  item,
  related = [],
}: {
  item: Content;
  related?: Content[];
}) {
  const headings = [
    ["overview", "Überblick"],
    ...(item.kind === "workshops" ? [["agenda", "Agenda"]] : []),
    ...(item.kind === "architecture"
      ? [["architecture", "Systemlandschaft"]]
      : []),
    ...(item.assetDownload ? [["materials", "Materialien"]] : []),
    ["sources", "Quellen & Einordnung"],
  ];
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
                    : item.category}
              </span>
              <StatusBadge status={item.status} />
              <span>{item.publicationStatus}</span>
            </div>
          </div>
          {item.status !== "Aktuell" && (
            <aside className="callout warning">
              <Info size={19} />
              <div>
                <strong>{item.status}</strong>
                <p>
                  Vor einer Umsetzung müssen die technischen Angaben erneut
                  geprüft werden.
                </p>
              </div>
            </aside>
          )}
          <section id="overview">
            <h2>{item.kind === "workshops" ? "Zielsetzung" : "Überblick"}</h2>
            <div className="article-body">
              {(item.body || item.description)
                .split("\n\n")
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          </section>
          {item.kind === "templates" && item.snippet && (
            <CodeBlock code={item.snippet} />
          )}
          {item.kind === "workshops" && (
            <>
              <div className="fact-panel">
                <span>
                  Zielgruppe<strong>{item.audience}</strong>
                </span>
                <span>
                  Dauer<strong>{item.duration}</strong>
                </span>
              </div>
              <section id="agenda">
                <h2>Agenda</h2>
                <ol className="timeline">
                  {item.agenda.map((a, i) => (
                    <li key={i}>
                      <span className="timeline-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{a.title}</h3>
                        <p>{a.minutes} Minuten</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
          {item.kind === "architecture" && (
            <section id="architecture">
              <h2>Systemlandschaft</h2>
              <figure className="architecture-diagram">
                <div>
                  {item.systems.map((s, i) => (
                    <div className="system-step" key={i}>
                      <span>
                        <span className="diagram-dot" />
                        {s}
                      </span>
                      {i < item.systems.length - 1 && (
                        <span aria-hidden="true">→</span>
                      )}
                    </div>
                  ))}
                </div>
                <figcaption>Integration: {item.integration}</figcaption>
              </figure>
            </section>
          )}
          {item.kind === "use-cases" && (
            <div className="fact-panel">
              <span>
                Branche<strong>{item.industry}</strong>
              </span>
              <span>
                Komplexität<strong>{item.complexity}</strong>
              </span>
              <span>
                Business-Ziel<strong>{item.businessGoal}</strong>
              </span>
            </div>
          )}
          {item.assetDownload && (
            <section id="materials">
              <h2>Materialien</h2>
              <a className="button" href={item.assetDownload} download>
                <Download size={16} />
                Material herunterladen
              </a>
            </section>
          )}
          <section id="sources">
            <h2>Quellen & Einordnung</h2>
            <p>{item.sourceReference || "Keine Quelle hinterlegt."}</p>
          </section>
        </article>
        <aside className="toc">
          <span className="eyebrow">AUF DIESER SEITE</span>
          <nav>
            {headings.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
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
