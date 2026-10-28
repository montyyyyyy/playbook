# CX Playbook

Sprint 01: responsive Knowledge- und Enablement-Plattform mit Next.js App Router, TypeScript Strict Mode, Tailwind CSS 4, Lucide und next-themes.

## Lokal starten

Node.js 22 oder neuer verwenden (geprüft mit Node.js 24).

```sh
npm ci
npm run dev
```

Anschließend http://localhost:3000 öffnen. Für die Produktionsvorschau `npm run build` und `npm start` ausführen. Es werden keine Umgebungsvariablen benötigt.

## Umfang

- Dashboard, Knowledge Library, Templates, Workshops, Architecture, Use Cases, Settings und lesende Admin-Vorschau.
- 13 vollständig synthetische Inhalte mit Detailseiten, Metadaten, Kategorien und Tags.
- Globale Suche (Ctrl/Cmd+K), modulbezogene kombinierbare Filter, Karten-/Listenansicht und Empty States.
- Light/Dark/System mit persistierter Auswahl und früher Theme-Initialisierung durch next-themes.
- Inhaltsverzeichnisse, Demo-Code mit Hervorhebung und Clipboard-Funktion, Tabellen, Statushinweise, lokale Downloads und Workshop-Timelines.
- Mobile Navigation mit Fokusbegrenzung, Escape-Schließen, Skip-Link und sichtbaren Focus-States.
- Lokale Vektorillustrationen, keine extern geladenen Bilder oder Schriften.

## Struktur

- `src/app`: App-Router-Routen, Metadaten, semantische CSS-Tokens, Loading/Error/404.
- `src/components`: gemeinsame Shell, Bibliothek, Detailansichten, Codeblock und Administration.
- `src/lib/models.ts`: diskriminierte Content-Typen für Article, Template, Workshop, Architecture und UseCase.
- `src/lib/content.ts`: Demo-Daten, Modulbeschreibungen, Locale und einfache Zugriffsfunktionen; späterer Ansatzpunkt für serverseitiges Laden aus Neon (PostgreSQL).
- `public/downloads`: drei tatsächlich vorhandene, synthetische Demo-Dateien (CSV, Markdown, JavaScript). Keine PDFs.

Die Oberfläche ist deutsch; Dokumentensprache und Datums-Locale sind explizit festgelegt. Stabile Slugs sind unabhängig von Anzeigetexten. Eine spätere Übersetzung kann die UI-Texte in ein Wörterbuch extrahieren, ohne Content-Identitäten zu ändern.

## Prüfungen

```sh
npm run typecheck
npm run lint
npm run build
```

Sprint-Abnahme: alle drei Prüfungen erfolgreich. Ein temporärer Browser-Smoke-Test außerhalb des Repositorys prüfte System/Light/Dark inklusive Persistenz, globale Suche, Artikel-Navigation, tatsächlichen Clipboard-Inhalt, Filter/Empty State, Listenansicht, Download, Admin-Tabs, mobile Navigation und horizontale Überläufe. Keine JavaScript-Laufzeitfehler. Desktop Light/Dark und Mobile wurden visuell geprüft. Wichtige Routen und alle drei Downloads lieferten HTTP 200. Keine dauerhafte E2E-Infrastruktur.

## Grenzen und Sicherheit

Dies ist eine **ungeschützte Demo**, nicht für vertrauliche Inhalte freigegeben. Der Avatar ist ein UI-Platzhalter, keine Sitzung. `/admin` enthält ausschließlich lesende Demo-Ansichten; keine Upload-, Freigabe-, Benutzer- oder schreibenden Backend-Aktionen. Es gibt keine Authentifizierung, keine echten Benutzer und keine produktiven SAP-Integrationen. Alle Codebeispiele sind ausdrücklich Demo, keine Hersteller-API. Die Auswahl „Zuletzt angesehen“ ist als Beispielauswahl gekennzeichnet. Status und Quellen sind synthetische Angaben, keine technische Freigabe. `robots: noindex` ist keine Zugriffssicherung.

## Vercel

Repository `montyyyyyy/playbook` und Domain `playbook.mesta.digital` sind bereits mit Vercel verbunden. Production-Branch ist `main`; ein Push auf diesen Branch löst das konfigurierte Deployment aus. Framework: Next.js, Projektwurzel: Repository-Wurzel, Build: `npm run build`, Ausgabe automatisch. Der aktuelle Sprint benötigt keine Datenbankverbindung oder Secrets.

## Sprint 02

Neon (PostgreSQL) ist als Datenbank festgelegt. Im nächsten Sprint Schema, Migrationen und serverseitigen Datenzugriff anbinden; die Verbindungsdaten ausschließlich als serverseitige Umgebungsvariablen verwalten. Die Auth-Lösung ist noch festzulegen. Einladungen, serverseitige Sitzungsprüfung, Rollen und Zugriffskontrollen sowie privaten Dateispeicher ergänzen. Erst nach Prüfung der Zugriffskontrollen echte Daten verwenden. Import, Anonymisierung und redaktionelle Freigabe als getrennte, autorisierte Schritte implementieren.

