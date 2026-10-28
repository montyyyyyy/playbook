# CX Playbook

Private Knowledge- und Enablement-Plattform. Next.js 16 App Router, TypeScript, Tailwind CSS, Neon PostgreSQL und Better Auth. Die Sprint-01-Oberfläche bleibt erhalten; Sprint 02 ergänzt serverseitige Authentifizierung und Datenbankberechtigungen.

## Aktueller Stand

- Der Production-404 wurde durch ein neues Next.js-Deployment des Sprint-01-Stands behoben; die Domain lieferte danach HTTP 200.
- Sprint 02 liegt auf `feature/sprint-02-security` und wurde **nicht** veröffentlicht. Production zeigt weiterhin die ungeschützte synthetische Sprint-01-Demo.
- Backend-Entwicklung und Sicherheitstests verwenden den isolierten Neon-Branch `sprint-02-development` im Projekt `playbook`. Production-Datenbank und DNS wurden für Sprint 02 nicht verändert.
- Einladungen und Passwort-Resets funktionieren standardmäßig über persönliche, einmalig angezeigte Links. Es ist kein E-Mail-Anbieter erforderlich. SMTP ist optional vorbereitet und nicht konfiguriert oder extern getestet.

## Lokal starten

Node.js 24 verwenden. `.env.local` ist eingerichtet und Git-ignoriert.

```sh
npm ci
npm run dev
```

Öffne **http://localhost:3000** (derselbe Origin wie `BETTER_AUTH_URL`). Die 127.0.0.1-Adresse ist kein zusätzlicher vertrauenswürdiger Login-Origin.

Für den ersten Administrator ist ein einmaliger Link für die vereinbarte E-Mail-Adresse in der lokalen, ignorierten Datei `.bootstrap-admin-link.txt` hinterlegt. Öffne den dortigen Link, wähle Anzeigename und eigenes Passwort (mindestens 12 Zeichen). Die Einladung läuft nach 48 Stunden ab. Im Chat und Repository stehen keine Passwörter oder Token.

## Neuinstallation / Migrationen

1. Einen getrennten Neon-Branch und eine PostgreSQL-Datenbank verwenden. Die Migrationen erwarten eine leere Anwendungsdatenbank.
2. `.env.example` nach `.env.local` kopieren und `MIGRATION_DATABASE_URL` auf die direkte **Owner-Verbindung des Zielbranches** setzen. `BETTER_AUTH_URL` passend zum Ziel festlegen.
3. `npm run db:provision`: erstellt zufällige Zugangsdaten für `playbook_app` und `playbook_auth`, einen Auth-Secret und speichert sie ausschließlich lokal. Bestehende Rollen werden nicht still überschrieben.
4. `npm run db:migrate`: führt versionierte SQL-Migrationen mit Lock und Prüfsummen aus. Kein automatisches Migrieren beim Serverstart oder Build.
5. Optional ausschließlich in Entwicklung: `npm run db:seed -- --confirm-development`. Der wiederholbare Seed fügt 13 synthetische Inhalte und kleine private Demo-Dateien ein. Bestehende Inhalte werden nicht überschrieben. Der Operator nimmt während dieser expliziten Transaktion eine gesperrte Tabelle ohne Mutationstrigger in Betrieb; außerhalb des Seeds bleiben die Trigger aktiv.
6. `npm run admin:bootstrap -- deine-admin-adresse@example.org`: erzeugt eine 48-Stunden-Einladung, nur solange kein Administrator existiert. Kein öffentlicher Bootstrap-Endpunkt und keine automatische Erhöhung des ersten Signups.
7. Link aus `.bootstrap-admin-link.txt` öffnen und eigenes Passwort setzen. Danach wird die Einladung atomar verbraucht.

Der lokale Notfallweg für den einzigen Administrator lautet `npm run admin:recover -- deine-admin-adresse@example.org`. Er setzt eine Owner-Verbindung voraus, prüft ein bereits vorhandenes aktives Admin-Konto und legt einen 30-Minuten-Link in `.recovery-admin-link.txt` ab. Er erstellt keine Benutzer und ändert keine Rollen. Beide Linkdateien nach Gebrauch entfernen.

## Datenmodell und Sicherheitsarchitektur

`db/migrations/001_foundation.sql` bis `006_revoke_invitations.sql` enthalten Auth-Tabellen, `profiles`, `content_items`, `content_assets`, `invitations`, `audit_events` und Policies. Migrationen sind unveränderlich und werden in `schema_migrations` protokolliert.

- `playbook_auth` hat ausschließlich Zugriff auf Better-Auth-Identitätstabellen und eng begrenzte Funktionen für Einladungseinlösung, Statusprüfung und Rate Limits. Kein Inhaltszugriff.
- `playbook_app` ist weder Owner noch Superuser/BYPASSRLS. Die Runtime lehnt Owner-Verbindungen ab. Jeder Datenzugriff setzt innerhalb einer Transaktion ausschließlich den von Better Auth verifizierten Sitzungstoken. Eine SQL-Funktion ermittelt daraus den Benutzer über eine reale, nicht abgelaufene Datenbanksitzung und prüft den aktuellen Kontostatus. Ein frei gesetzter Benutzer-ID-Parameter genügt nicht.
- RLS schützt alle Anwendungs- und Auth-Tabellen. Viewer lesen nur veröffentlichte Inhalte; Editoren zusätzlich eigene Entwürfe/Reviews und dürfen nur diese bearbeiten. Admins verwalten Benutzer und Veröffentlichungen. Spaltenrechte, Policies und Trigger verhindern Rollen- und Veröffentlichungseskalation auch bei direktem SQL über die eingeschränkte Runtime-Rolle.
- Privilegierte SQL-Funktionen liegen in `private`, besitzen einen leeren `search_path`, verwenden vollqualifizierte Tabellen und sind nicht für PUBLIC ausführbar.
- Benutzerrollen stammen ausschließlich aus `profiles`. Profiländerungen akzeptieren nur `display_name`. Admins können nicht den letzten aktiven Administrator deaktivieren oder herabstufen.
- Better Auth verwaltet echte Passwort-Hashes und datenbankgestützte Cookie-Sessions (12 Stunden, keine Cookie-Session-Caches). HTTPS verwendet Secure/HttpOnly-Cookies. Registrierung ist in Better Auth deaktiviert und der API-Endpunkt zusätzlich nicht freigegeben. Es gibt keine Supabase-Komponenten und keinen öffentlichen Datenbank-REST-Endpunkt.
- Rollenänderung und Deaktivierung löschen bestehende Sitzungen. RLS prüft den aktuellen Kontostatus bei jeder Datenoperation zusätzlich. Bereits ausgelieferte/geladene Inhalte lassen sich nicht nachträglich vom Gerät zurückholen; neue Anfragen werden gesperrt.
- `proxy.ts` sorgt für frühe Login-Weiterleitung und private Cache-Header. Es ist **nicht** die Autorisierung: jede private Seite, Metadatenabfrage und API prüft Sitzung/Berechtigungen erneut. Private Seiten werden dynamisch gerendert; Demo-Inhalte sind nicht in öffentlichen JavaScript-Bundles oder statischen HTML-Dateien enthalten.
- Mutationen prüfen Origin/CSRF, Schema und Rollen. Redirects erlauben nur interne Ziele. Kein dynamisches HTML aus Inhaltsdaten.
- Auth-Rate-Limits liegen in PostgreSQL; die eigenen Admin-/Einladungs-/Recovery-Limits sind atomare SQL-Zähler. Ohne vertrauenswürdig ermittelte Client-IP verwendet Better Auth lokal einen gemeinsamen Endpoint-Bucket (5 Loginversuche/Minute). Das schützt vor unbegrenzten Versuchen, kann aber auch legitime parallele Logins drosseln. Verteilte Angriffe und per-IP-Edge-Schutz sind nicht zusätzlich konfiguriert.

## Einladungen und Passwort-Reset ohne Mailanbieter

Admins erstellen unter Admin → Einladungen einen persönlichen 48-Stunden-Link. Er erscheint nur einmal und wird selbst an die vorgesehene Person weitergegeben. In `invitations` liegt nur sein SHA-256-Hash. Die Einlösung prüft Ablauf und Status in einer gesperrten Transaktion, legt echte Better-Auth-Identität und Passwort-Hash an und verknüpft die administrativ festgelegte Rolle. Widerrufene und bereits verwendete Links sind ungültig.

Unter Admin → Benutzer erzeugt „Reset-Link erstellen“ einen einmaligen 30-Minuten-Link. Der Passwortwechsel läuft über Better Auth und widerruft vorhandene Sitzungen. Der native Better-Auth-Verifikationsspeicher bleibt ausschließlich für den Auth-Dienst zugänglich. Token und Passwörter werden nicht in Audit-Events geschrieben. Links verwenden URL-Fragmente, damit die Geheimnisse nicht als GET-Query in Server-Logs stehen.

Ohne SMTP weist `/forgot-password` neutral auf den Administrator hin und behauptet nicht, eine E-Mail versendet zu haben. Bei optionaler SMTP-Konfiguration versendet die Recovery-Route neutrale Rückmeldungen und native Better-Auth-Reset-Links. Die Annahme einer manuell weitergereichten Einladung bestätigt den Besitz dieses Links; die sichere Zustellung und richtige Empfängerzuordnung liegen beim Administrator. Kein unabhängiger E-Mail-Besitznachweis ohne Mailversand.

## Private Dateien

Kleine Dateien liegen in diesem Sprint als **private PostgreSQL-bytea-Daten** in `content_assets`, geschützt durch RLS. Es gibt keinen öffentlichen Bucket und keine Dateien unter `public/downloads`. Downloads laufen ausschließlich über authentifizierte Route Handler, mit `Content-Disposition: attachment`, `nosniff` und `no-store`. Die App generiert neutrale Dateinamen und speichert keine ursprünglichen Uploadnamen. Typ-/Größenprüfung, PDF-Signaturprüfung und Prüfung auf NUL-Bytes bei Text sind implementiert.

Das ist bewusst kein externer Object-Storage-Bucket. Für große Dokumente folgt später ein privater Objektspeicher mit kurzlebigen Downloadfreigaben. Aktuelles App-Limit: 5 MB; Vercels Request-Limit kann Uploads bereits vorher begrenzen. Kein Virenscanner, keine PDF-Ingestion und keine realen Kundendokumente. JavaScript-Dateien werden nur als Download ausgeliefert, nicht ausgeführt.

## Vercel-Konfiguration für Sprint 02

Bestehendes Projekt: `playbook`, Team `dirks-projects-128f9cc0`, Framework **Next.js**, Node.js 24, Root `.`, Build `npm run build`, Output automatisch. Domain: `https://playbook.mesta.digital`.

Vor einem **gesondert autorisierten** Deployment auf dem gewählten Zielbranch provisionieren und migrieren. Dann diese serverseitigen Variablen in der passenden Vercel-Umgebung setzen:

| Variable                                                            | Wert                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `DATABASE_URL`                                                      | Gepoolte Verbindung mit Rolle `playbook_app`                                 |
| `AUTH_DATABASE_URL`                                                 | Gepoolte Verbindung mit Rolle `playbook_auth`                                |
| `BETTER_AUTH_SECRET`                                                | Zufälliges Secret, mindestens 32 Zeichen; pro Umgebung getrennt              |
| `BETTER_AUTH_URL`                                                   | Production: `https://playbook.mesta.digital`; lokal: `http://localhost:3000` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Optional, nur für echten Mailversand                                         |

**Die früher in Vercel hinterlegte Owner-`DATABASE_URL` muss für Sprint 02 ersetzt werden.** `MIGRATION_DATABASE_URL` gehört niemals in die Vercel-Runtime. `.env.local` und lokale Links sind auch durch `.vercelignore` ausgeschlossen. Keine `NEXT_PUBLIC_`-Secrets. Preview braucht einen eigenen Neon-Branch, ein eigenes Secret und einen festen vertrauenswürdigen Origin; keine pauschale `*.vercel.app`-Freigabe.

Login: `/login`; Einladung: `/accept-invite`; Passwortwechsel: `/reset-password`. Kein OAuth-/PKCE-Callback notwendig, da E-Mail/Passwort und serverseitig geprüfte Einmal-Links verwendet werden. Production-Migration, neue Runtime-Variablen und Sprint-02-Deployment wurden noch nicht durchgeführt. Es gibt keine automatische Veröffentlichung beim Build.

## Prüfungen

```sh
npm run typecheck
npm run lint
npm run build
npm run test:security
npm run test:rls
# Separat den Production Build lokal starten, dann:
npm start
npm run test:integration
```

RLS-Tests prüfen mit der echten PostgreSQL-Rolle und rollenabhängigen Policies innerhalb einer zurückgerollten Transaktion. HTTP-Tests erzeugen kurzlebige synthetische Konten, prüfen echte Better-Auth-Logins und APIs und entfernen ihre Daten anschließend. Sie respektieren die aktiven Login-Limits und können deshalb eine Minute warten. Ausschließlich gegen die isolierte Entwicklungs-/Testdatenbank ausführen. Keinen Produktions-Testlauf starten.

Sprint-02-Abnahme: TypeScript, Lint und Production Build erfolgreich; 32 echte RLS-Tests, 23 HTTP-Integrationstests und 12 Redirect-Tests erfolgreich. Ein temporärer Browser-Test prüfte Login mit Rücksprungziel, Light/Dark, private Suche/Artikel, Admin-Oberfläche, Editor-Speichern, mobile Navigation ohne horizontalen Überlauf und Logout; keine JavaScript-Laufzeitfehler. Login in Light/Dark und mobile Ansicht wurden visuell geprüft. Keine Aussage über SMTP-Zustellung oder Production-Auth, solange diese nicht eingerichtet und getestet wurden.

## Struktur

- `src/app/(private)`: dynamische geschützte Seiten mit gemeinsamer Shell.
- `src/app/api`: Auth-Allowlist, rollenbasierte Mutationen, Suche, private Assets.
- `src/lib/server`: ausschließlich serverseitige Auth-, Session-, Daten- und Mailfunktionen.
- `src/components`: bestehendes Design und echte Auth-/Admin-/Editor-Formulare.
- `src/lib/models.ts`: UI-Modelle; `src/lib/content.ts`: ausschließlich öffentliche Modulnamen und Link-Helfer.
- `scripts/fixtures`: synthetische Inhalte, nur für den expliziten Seed, nicht für Client-Fallbacks.
- `db/migrations`, `scripts`, `tests`: reproduzierbares Setup, kontrollierte Administration und Sicherheitsprüfungen.

## Bewusste Grenzen

Kein MFA, keine Virenprüfung, keine echte SAP-Integration, keine vertraulichen Daten. CSP sperrt Frames/Objekte und fremde Quellen, erlaubt aber noch Inline-Skripte/-Styles für Next.js/Theme-Initialisierung; eine Nonce-basierte CSP ist ein weiterer Härtungsschritt. Die Auth-Datenbankrolle ist bewusst privilegiert für Identitäten; ihr Secret ist entsprechend sensibel. Owner-Zugriff kann RLS administrativ umgehen und bleibt ausschließlich beim Operator. Die Datenbank speichert kleine Assets; ein privater Objektspeicher wurde nicht provisioniert.
