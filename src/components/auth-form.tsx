"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { BookOpen, ArrowRight } from "lucide-react";
import { ThemeSettings } from "./shell";
export function AuthForm({
  mode,
  next = "/",
  mailEnabled = false,
}: {
  mode: "login" | "forgot-password" | "reset-password" | "accept-invite";
  next?: string;
  mailEnabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const token =
        new URLSearchParams(window.location.hash.slice(1)).get("token") ??
        new URLSearchParams(window.location.search).get("token") ??
        "";
      let endpoint = "",
        body: Record<string, unknown> = {};
      if (mode === "login") {
        endpoint = "/api/auth/sign-in/email";
        body = {
          email: form.get("email"),
          password: form.get("password"),
          callbackURL: next,
        };
      } else if (mode === "forgot-password") {
        endpoint = "/api/recovery";
        body = { email: form.get("email") };
      } else if (mode === "reset-password") {
        endpoint = "/api/auth/reset-password";
        body = { token, newPassword: form.get("password") };
      } else {
        endpoint = "/api/invitations/accept";
        body = {
          token,
          name: form.get("name"),
          password: form.get("password"),
        };
      }
      if ((mode === "reset-password" || mode === "accept-invite") && !token) {
        setMessage(
          "Der Link ist ungültig. Bitte einen neuen Link beim Administrator anfordern.",
        );
        return;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "Zu viele Versuche. Bitte später erneut versuchen."
            : mode === "login"
              ? "Anmeldung nicht möglich. Bitte Zugangsdaten und Kontostatus prüfen."
              : "Der Vorgang ist fehlgeschlagen. Der Link ist möglicherweise ungültig, abgelaufen oder bereits verwendet.",
        );
        return;
      }
      if (mode === "login") {
        window.location.assign(next);
        return;
      }
      setDone(true);
      window.history.replaceState(null, "", window.location.pathname);
      setMessage(
        mode === "forgot-password"
          ? mailEnabled
            ? "Falls ein aktives Konto existiert, erhältst du weitere Informationen per E-Mail."
            : "Bitte wende dich an den Administrator. Er kann dir einen einmalig verwendbaren Reset-Link ausstellen."
          : "Dein Passwort wurde gespeichert. Du kannst dich jetzt anmelden.",
      );
    } catch {
      setMessage("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    login: "Willkommen zurück",
    "forgot-password": "Passwort vergessen?",
    "reset-password": "Neues Passwort festlegen",
    "accept-invite": "Willkommen im Playbook",
  };
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <BookOpen size={32} />
        <strong>CX Playbook</strong>
      </div>
      <div className="auth-card">
        <span className="eyebrow">DEIN PRIVATER WORKSPACE</span>
        <h1>{titles[mode]}</h1>
        <p>
          {mode === "login"
            ? "Wissen. Erfahrungen. Schneller zum Ergebnis."
            : mode === "accept-invite"
              ? "Lege dein persönliches Passwort fest. Deine Einladung ist nur einmal gültig."
              : mode === "forgot-password" && !mailEnabled
                ? "Passwörter werden über einen persönlichen Link vom Administrator zurückgesetzt."
                : "Sicherer Zugang zu deinem Wissen."}
        </p>
        {!done && (
          <form onSubmit={submit}>
            {mode === "accept-invite" && (
              <label>
                Anzeigename
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </label>
            )}
            {(mode === "login" || mode === "forgot-password") && (
              <label>
                E-Mail
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {mode !== "forgot-password" && (
              <label>
                Passwort
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                />
                {mode !== "login" && (
                  <small>
                    Mindestens 12 Zeichen. Verwende ein einzigartiges Passwort.
                  </small>
                )}
              </label>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? "Bitte warten …"
                : mode === "login"
                  ? "Anmelden"
                  : mode === "forgot-password"
                    ? "Hinweise zur Wiederherstellung"
                    : "Passwort speichern"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
        <p role="status" className="form-message">
          {message}
        </p>
        {mode === "login" ? (
          <Link href="/forgot-password">Passwort vergessen?</Link>
        ) : (
          <Link href="/login">Zur Anmeldung</Link>
        )}
      </div>
      <ThemeSettings />
      <p className="auth-footer">Zugang nur auf Einladung · CX Playbook</p>
    </main>
  );
}
