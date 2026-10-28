"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/server/session";
import type { Content } from "@/lib/models";
import { Breadcrumbs, ThemeSettings } from "./shell";
export async function api(path: string, body: unknown, method = "POST") {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Vorgang fehlgeschlagen.");
  return data;
}
export function OneTimeLink({
  link,
  clear,
}: {
  link: string;
  clear: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="callout">
      <div>
        <strong>Persönlicher Link – nur jetzt sichtbar</strong>
        <p>
          Vertraulich an die vorgesehene Person weitergeben. Der Link ist nur
          einmal verwendbar.
        </p>
        <input
          className="one-time-link"
          aria-label="Persönlicher Link"
          readOnly
          value={link}
        />
        <div className="action-row">
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Kopiert" : "Link kopieren"}
          </button>
          <button className="button secondary" onClick={clear}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
export function Admin({
  users,
  invitations,
  items,
}: {
  users: Profile[];
  invitations: {
    id: string;
    email: string;
    intended_role: string;
    status: string;
    expires_at: string;
  }[];
  items: Content[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("Inhalte");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Vorgang fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    await run(async () => {
      const r = await api("/api/admin/invitations", {
        email: data.get("email"),
        role: data.get("role"),
      });
      setLink(r.link ?? "");
      setMessage(
        r.delivery === "email"
          ? "Einladung versendet."
          : "Einladung erstellt. Bitte den persönlichen Link weitergeben.",
      );
      form.reset();
    });
  }
  return (
    <div className="page">
      <Breadcrumbs items={[{ label: "Admin" }]} />
      <div className="page-title">
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>Workspace verwalten</h1>
        <p>Inhalte, Zugänge und Freigaben.</p>
      </div>
      <div className="tabs">
        {["Inhalte", "Benutzer", "Einladungen"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <p role="status">{message}</p>
      {link && <OneTimeLink link={link} clear={() => setLink("")} />}
      {tab === "Inhalte" ? (
        <>
          <Link className="button" href="/edit">
            Inhalt erstellen
          </Link>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Inhalt</th>
                  <th>Veröffentlichung</th>
                  <th>Technischer Stand</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.publicationStatus}</td>
                    <td>{item.status}</td>
                    <td>
                      <Link href={`/edit?id=${item.id}`}>
                        Bearbeiten / Freigeben
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : tab === "Benutzer" ? (
        <div className="user-list">
          {users.map((user) => (
            <form
              className="settings-panel"
              key={user.id}
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void run(async () => {
                  await api(
                    "/api/admin/users",
                    {
                      id: user.id,
                      role: data.get("role"),
                      status: data.get("status"),
                    },
                    "PATCH",
                  );
                  setMessage(
                    "Benutzer aktualisiert. Bestehende Sessions werden bei Rollenänderung oder Deaktivierung widerrufen.",
                  );
                });
              }}
            >
              <strong>{user.display_name}</strong>
              <div className="action-row">
                <select
                  name="role"
                  aria-label={`Rolle für ${user.display_name}`}
                  defaultValue={user.role}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  name="status"
                  aria-label={`Kontostatus für ${user.display_name}`}
                  defaultValue={user.account_status}
                >
                  <option value="active">Aktiv</option>
                  <option value="disabled">Gesperrt</option>
                </select>
                <button className="button secondary" disabled={busy}>
                  Speichern
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const r = await api("/api/admin/reset", { id: user.id });
                      setLink(r.link);
                    })
                  }
                >
                  Reset-Link erstellen
                </button>
              </div>
            </form>
          ))}
        </div>
      ) : (
        <>
          <form className="settings-panel" onSubmit={invite}>
            <h2>Person einladen</h2>
            <div className="action-row">
              <input
                name="email"
                type="email"
                placeholder="E-Mail-Adresse"
                aria-label="E-Mail-Adresse"
                required
                maxLength={254}
              />
              <select
                name="role"
                aria-label="Rolle der Einladung"
                defaultValue="viewer"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <button className="button" disabled={busy}>
                Einladung erstellen
              </button>
            </div>
            <p>
              48 Stunden gültig. Ohne konfigurierten Mailversand erhältst du
              einen persönlichen Link zum Weitergeben.
            </p>
          </form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td>{i.intended_role}</td>
                    <td>
                      {i.status === "pending" &&
                      new Date(i.expires_at) < new Date()
                        ? "expired"
                        : i.status}
                    </td>
                    <td>
                      {i.status === "pending" && (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await api(
                                "/api/admin/invitations",
                                { id: i.id },
                                "DELETE",
                              );
                              setMessage("Einladung widerrufen.");
                            })
                          }
                        >
                          Widerrufen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
export function Settings({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="page">
      <Breadcrumbs items={[{ label: "Settings" }]} />
      <div className="page-title">
        <h1>Dein Konto</h1>
        <p>
          Angemeldet als {profile.display_name} · Rolle: {profile.role}
        </p>
      </div>
      <form
        className="settings-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const data = new FormData(e.currentTarget);
            await api(
              "/api/profile",
              { display_name: data.get("display_name") },
              "PATCH",
            );
            setMessage("Anzeigename gespeichert.");
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Fehler");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Anzeigename
          <input
            name="display_name"
            defaultValue={profile.display_name}
            required
            maxLength={100}
          />
        </label>
        <button className="button" disabled={busy}>
          Speichern
        </button>
        <p role="status">{message}</p>
      </form>
      <section className="settings-panel">
        <h2>Erscheinungsbild</h2>
        <ThemeSettings />
      </section>
    </div>
  );
}
