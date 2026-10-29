"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Search,
  LayoutGrid,
  List,
  BookOpen,
  Network,
  Files,
  Users,
  Lightbulb,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { hrefFor, sections } from "@/lib/content";
import type { Content, Section } from "@/lib/models";
import { Breadcrumbs } from "./shell";
const icons = {
  knowledge: BookOpen,
  templates: Files,
  workshops: Users,
  architecture: Network,
  "use-cases": Lightbulb,
};
export function StatusBadge({ status }: { status: Content["status"] }) {
  return (
    <span
      className={`status ${status === "Aktuell" ? "current" : status === "Veraltet" ? "outdated" : "review"}`}
    >
      <span />
      {status}
    </span>
  );
}
export function ContentCard({
  item,
  visual = false,
}: {
  item: Content;
  visual?: boolean;
}) {
  const Icon = icons[item.kind];
  return (
    <Link className="content-card" href={hrefFor(item)}>
      {visual && (
        <div className={`card-visual visual-${item.kind}`} aria-hidden="true">
          {item.kind === "architecture" ? (
            <div className="mini-diagram">
              <span>Commerce</span>
              <i />
              <span>Customer Data</span>
              <i />
              <span>Activation</span>
            </div>
          ) : item.kind === "workshops" ? (
            <div className="sticky-notes">
              {[
                "Verstehen",
                "Entdecken",
                "Gestalten",
                "Priorisieren",
                "Verbinden",
                "Umsetzen",
              ].map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          ) : (
            <div className="code-visual">
              <span>01 &nbsp; experience.connect()</span>
              <span>02 &nbsp; &nbsp; consent: true</span>
              <span>03 &nbsp; &nbsp; channel: &apos;web&apos;</span>
              <span>04 &nbsp; create.moments()</span>
            </div>
          )}
        </div>
      )}
      <div className="card-body">
        <div className="card-kicker">
          <span>{item.technology}</span>
          <Icon size={16} />
        </div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="tags">
          {item.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        {item.kind === "workshops" && (
          <small>
            {item.duration} · {item.audience}
          </small>
        )}
        {item.kind === "templates" && (
          <small>{item.fileType} · Demo-Datei</small>
        )}
        {item.kind === "architecture" && (
          <small>Integration: {item.integration}</small>
        )}
        {item.kind === "use-cases" && (
          <small>
            {item.industry} · {item.complexity} · {item.businessGoal}
          </small>
        )}
        <div className="card-footer">
          {item.kind === "knowledge" ? (
            <StatusBadge status={item.status} />
          ) : (
            <span>{item.category}</span>
          )}
          <ArrowUpRight size={16} />
        </div>
      </div>
    </Link>
  );
}
export function Library({
  section,
  contents,
  initialTechnology = "",
}: {
  section: Section;
  contents: Content[];
  initialTechnology?: string;
}) {
  const [query, setQuery] = useState("");
  const [technology, setTechnology] = useState(initialTechnology);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [extra, setExtra] = useState("");
  const [tag, setTag] = useState("");
  const [industry, setIndustry] = useState("");
  const [goal, setGoal] = useState("");
  const [list, setList] = useState(false);
  const all = contents.filter((c) => c.kind === section);
  const extraValue = (c: Content) =>
    c.kind === "templates"
      ? c.fileType
      : c.kind === "architecture"
        ? c.integration
        : c.kind === "use-cases"
          ? c.complexity
          : "";
  const filtered = all.filter(
    (c) =>
      (!query ||
        `${c.title} ${c.description} ${c.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!technology || c.technology === technology) &&
      (!category || c.category === category) &&
      (!status || c.status === status) &&
      (!tag || c.tags.includes(tag)) &&
      (!extra || extraValue(c) === extra) &&
      (!industry || (c.kind === "use-cases" && c.industry === industry)) &&
      (!goal || (c.kind === "use-cases" && c.businessGoal === goal)),
  );
  const reset = () => {
    setQuery("");
    setTechnology("");
    setCategory("");
    setStatus("");
    setExtra("");
    setTag("");
    setIndustry("");
    setGoal("");
  };
  function select(
    label: string,
    value: string,
    set: (v: string) => void,
    values: string[],
  ) {
    return (
      <select
        aria-label={label}
        value={value}
        onChange={(e) => set(e.target.value)}
      >
        <option value="">{label}</option>
        {Array.from(new Set(values)).map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    );
  }
  return (
    <div className="page">
      <Breadcrumbs items={[{ label: sections[section].title }]} />
      <div className="page-title">
        <span className="eyebrow">DEIN WISSEN. GUT ORGANISIERT.</span>
        <h1>{sections[section].title}</h1>
        <p>{sections[section].description}</p>
      </div>
      <div className="filter-panel">
        <label className="library-search">
          <Search size={18} />
          <input
            aria-label="Inhalte durchsuchen"
            placeholder={`${sections[section].title} durchsuchen …`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="filters">
          {select("Alle Technologien", technology, setTechnology, [
            ...all.map((c) => c.technology),
            ...(initialTechnology ? [initialTechnology] : []),
          ])}
          {select(
            "Alle Kategorien",
            category,
            setCategory,
            all.map((c) => c.category),
          )}
          {select(
            "Alle Tags",
            tag,
            setTag,
            all.flatMap((c) => c.tags),
          )}
          {section === "knowledge" &&
            select("Alle Status", status, setStatus, [
              "Aktuell",
              "Prüfung erforderlich",
              "Veraltet",
            ])}
          {["templates", "architecture", "use-cases"].includes(section) &&
            select(
              section === "templates"
                ? "Alle Dateitypen"
                : section === "architecture"
                  ? "Alle Integrationen"
                  : "Alle Komplexitäten",
              extra,
              setExtra,
              all.map(extraValue),
            )}
          {section === "use-cases" && (
            <>
              {select(
                "Alle Branchen",
                industry,
                setIndustry,
                all.map((c) => (c.kind === "use-cases" ? c.industry : "")),
              )}
              {select(
                "Alle Business-Ziele",
                goal,
                setGoal,
                all.map((c) => (c.kind === "use-cases" ? c.businessGoal : "")),
              )}
            </>
          )}
          <button className="text-button" onClick={reset}>
            <RotateCcw size={14} />
            Zurücksetzen
          </button>
        </div>
      </div>
      <div className="results-bar">
        <span aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "Inhalt" : "Inhalte"}
          <span className="muted"> · Synthetische Demo</span>
        </span>
        <div className="view-toggle">
          <button
            aria-label="Kartenansicht"
            aria-pressed={!list}
            onClick={() => setList(false)}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            aria-label="Listenansicht"
            aria-pressed={list}
            onClick={() => setList(true)}
          >
            <List size={17} />
          </button>
        </div>
      </div>
      {filtered.length ? (
        <div className={list ? "card-grid list-view" : "card-grid"}>
          {filtered.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={32} />
          <h2>Hier ist noch Platz für Wissen.</h2>
          <p>Für diese Auswahl wurden keine Inhalte gefunden.</p>
          <button className="button secondary" onClick={reset}>
            Filter zurücksetzen <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
