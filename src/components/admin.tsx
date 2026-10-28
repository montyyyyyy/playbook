"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Files,
  Clock3,
  ShieldCheck,
  Users,
  Info,
  UploadCloud,
} from "lucide-react";
import { contents, hrefFor } from "@/lib/content";
import { Breadcrumbs, ThemeSettings } from "./shell";
import { StatusBadge } from "./library";
export function Admin() {
  const [tab, setTab] = useState("Übersicht");
  const tabs = ["Übersicht", "Import Queue", "Artikelverwaltung", "Benutzer"];
  const queue = [
    { file: "Demo_Tracking_Konzept.md", status: "Importiert" },
    { file: "Demo_Journey_Notizen.md", status: "Anonymisierung erforderlich" },
    { file: "Demo_Architektur.md", status: "Technische Prüfung" },
    { file: "Demo_Checkliste.csv", status: "Zur Freigabe" },
    { file: "Demo_Web_Channel.md", status: "Veröffentlicht" },
  ];
  return (
    <div className="page">
      <Breadcrumbs items={[{ label: "Admin" }]} />
      <div className="page-title">
        <span className="eyebrow">WORKSPACE VERWALTEN</span>
        <h1>Administration</h1>
        <p>Inhalte im Blick. Qualität im Mittelpunkt.</p>
      </div>
      <div className="callout">
        <Info size={19} />
        <div>
          <strong>Frontend-Vorschau · keine Zugriffssicherung</strong>
          <p>
            Diese Ansicht zeigt ausschließlich synthetische Daten. Import,
            Benutzerverwaltung und Freigaben sind noch nicht aktiv. Nicht für
            vertrauliche Inhalte freigegeben.
          </p>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Admin-Bereiche">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls="admin-panel"
            id={`tab-${tabs.indexOf(t)}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="admin-panel"
        aria-labelledby={`tab-${tabs.indexOf(tab)}`}
      >
        {tab === "Übersicht" ? (
          <>
            <div className="stats-grid">
              {[
                {
                  label: "Inhalte gesamt",
                  value: contents.length,
                  icon: Files,
                },
                {
                  label: "Prüfung erforderlich",
                  value: contents.filter(
                    (c) => c.status === "Prüfung erforderlich",
                  ).length,
                  icon: Clock3,
                },
                {
                  label: "Aktuelle Inhalte",
                  value: contents.filter((c) => c.status === "Aktuell").length,
                  icon: ShieldCheck,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div className="stat" key={label}>
                  <Icon size={20} />
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <h2>Review Status</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Inhalt</th>
                    <th>Status</th>
                    <th>Aktualisiert</th>
                  </tr>
                </thead>
                <tbody>
                  {contents
                    .filter((c) => c.status !== "Aktuell")
                    .map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link href={hrefFor(c)}>{c.title}</Link>
                        </td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td>{c.updatedAt}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "Import Queue" ? (
          <>
            <div className="import-placeholder">
              <UploadCloud size={36} />
              <h2>Import wird in einem späteren Sprint verfügbar</h2>
              <p>Es werden keine Dateien angenommen oder verarbeitet.</p>
            </div>
            <h2>Beispielhafte Import Queue</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Demo-Datei</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((q) => (
                    <tr key={q.file}>
                      <td>{q.file}</td>
                      <td>
                        <span className="queue-status">{q.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "Artikelverwaltung" ? (
          <>
            <p className="muted">
              Lesende Vorschau. Bearbeiten und Freigeben folgen mit
              serverseitiger Autorisierung.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Artikel</th>
                    <th>Technologie</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contents
                    .filter((c) => c.kind === "knowledge")
                    .map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link href={hrefFor(c)}>{c.title}</Link>
                        </td>
                        <td>{c.technology}</td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Users size={34} />
            <h2>Ein sicherer Raum für dein Team.</h2>
            <p>
              Einladungen, Rollen und Benutzerverwaltung folgen mit Supabase
              Auth.
              <br />
              Aktuell existieren keine Benutzerkonten.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
export function Settings() {
  return (
    <div className="page">
      <Breadcrumbs items={[{ label: "Settings" }]} />
      <div className="page-title">
        <h1>Settings</h1>
        <p>Dein Workspace, deine Ansicht.</p>
      </div>
      <section className="settings-panel">
        <h2>Erscheinungsbild</h2>
        <p>
          Wähle ein Farbschema. Deine Auswahl wird in diesem Browser
          gespeichert.
        </p>
        <ThemeSettings />
      </section>
      <section className="settings-panel">
        <h2>Sprache</h2>
        <p>
          Deutsch · Weitere Sprachen sind für spätere Ausbaustufen vorgesehen.
        </p>
      </section>
      <section className="settings-panel">
        <h2>Über diesen Workspace</h2>
        <p>
          CX Playbook · Sprint 01 · Lokale Demo-Daten. Authentifizierung und
          private Inhalte sind noch nicht verfügbar.
        </p>
      </section>
    </div>
  );
}
