"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Content } from "@/lib/models";
import type { Profile } from "@/lib/server/session";
import { api } from "./admin";
export function EditorLink({
  item,
  profile,
}: {
  item: Content;
  profile: Profile;
}) {
  return profile.role === "admin" ||
    (profile.role === "editor" &&
      item.createdBy === profile.id &&
      ["draft", "in_review"].includes(item.publicationStatus ?? "")) ? (
    <div className="page editor-link">
      <Link href={`/edit?id=${item.id}`} className="button secondary">
        Inhalt bearbeiten · {item.publicationStatus}
      </Link>
    </div>
  ) : null;
}
const kinds = {
  knowledge: "article",
  templates: "template",
  workshops: "workshop",
  architecture: "architecture",
  "use-cases": "use_case",
};
export function ContentEditor({
  item,
  profile,
}: {
  item?: Content;
  profile: Profile;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const input = {
        id: item?.id,
        slug: f.get("slug"),
        type: f.get("type"),
        title: f.get("title"),
        description: f.get("description"),
        body: f.get("body"),
        technology: f.get("technology"),
        category: f.get("category"),
        tags: String(f.get("tags"))
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: f.get("status"),
        technical_status: f.get("technical_status"),
        source_reference: f.get("source_reference"),
      };
      const r = await api("/api/content", input, item ? "PATCH" : "POST");
      setMessage("Inhalt gespeichert.");
      router.replace(`/edit?id=${r.id}`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <div className="page-title">
        <h1>{item ? "Inhalt bearbeiten" : "Entwurf erstellen"}</h1>
        <p>
          Veröffentlichungsstatus und technischer Stand werden getrennt
          verwaltet.
        </p>
      </div>
      <form className="settings-panel editor-form" onSubmit={save}>
        <label>
          Titel
          <input
            name="title"
            defaultValue={item?.title}
            required
            maxLength={200}
          />
        </label>
        <label>
          Slug
          <input
            name="slug"
            defaultValue={item?.slug}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={150}
          />
        </label>
        <label>
          Modul
          <select
            name="type"
            defaultValue={item ? kinds[item.kind] : "article"}
          >
            <option value="article">Knowledge</option>
            <option value="template">Template</option>
            <option value="workshop">Workshop</option>
            <option value="architecture">Architecture</option>
            <option value="use_case">Use Case</option>
          </select>
        </label>
        <label>
          Beschreibung
          <textarea
            name="description"
            defaultValue={item?.description}
            maxLength={2000}
          />
        </label>
        <label>
          Inhalt (Text)
          <textarea
            name="body"
            rows={12}
            defaultValue={item?.body}
            maxLength={100000}
          />
        </label>
        <div className="form-grid">
          <label>
            Technologie
            <input
              name="technology"
              defaultValue={item?.technology}
              maxLength={100}
            />
          </label>
          <label>
            Kategorie
            <input
              name="category"
              defaultValue={item?.category}
              maxLength={100}
            />
          </label>
        </div>
        <label>
          Tags (mit Komma trennen)
          <input name="tags" defaultValue={item?.tags.join(", ")} />
        </label>
        <div className="form-grid">
          <label>
            Veröffentlichung
            <select
              name="status"
              defaultValue={item?.publicationStatus ?? "draft"}
            >
              <option value="draft">Entwurf</option>
              {(item || profile.role === "admin") && (
                <option value="in_review">Zur Prüfung</option>
              )}
              {profile.role === "admin" && (
                <>
                  <option value="approved">Freigegeben</option>
                  <option value="published">Veröffentlicht</option>
                  <option value="archived">Archiviert</option>
                </>
              )}
            </select>
          </label>
          <label>
            Technischer Stand
            <select
              name="technical_status"
              defaultValue={
                item?.status === "Veraltet"
                  ? "outdated"
                  : item?.status === "Prüfung erforderlich"
                    ? "review_required"
                    : "current"
              }
            >
              <option value="current">Aktuell</option>
              <option value="review_required">Prüfung erforderlich</option>
              <option value="outdated">Veraltet</option>
            </select>
          </label>
        </div>
        <label>
          Quelle
          <input
            name="source_reference"
            defaultValue={item?.sourceReference}
            maxLength={500}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Speichern …" : "Speichern"}
        </button>
        <p role="status">{message}</p>
      </form>
      {item && <AssetUpload contentId={item.id} />}
    </div>
  );
}
function AssetUpload({ contentId }: { contentId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="settings-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const data = new FormData(e.currentTarget);
          data.set("content_id", contentId);
          const r = await fetch("/api/assets", { method: "POST", body: data });
          setMessage(
            r.ok
              ? "Datei privat gespeichert."
              : "Upload fehlgeschlagen. Typ, Größe und Berechtigung prüfen.",
          );
        } catch {
          setMessage("Upload fehlgeschlagen.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Privates Material</h2>
      <p>
        Text, CSV, Markdown, JavaScript oder PDF · maximal 5 MB · nur
        synthetische Testdateien in diesem Sprint.
      </p>
      <input
        name="file"
        type="file"
        required
        accept=".txt,.csv,.md,.js,.pdf"
        aria-label="Private Datei"
      />
      <button className="button secondary" disabled={busy}>
        Privat hochladen
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
