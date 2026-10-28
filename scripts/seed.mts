import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createHash } from "node:crypto";
import pg from "pg";
import { contents, demoSnippet } from "./fixtures/content";
process.loadEnvFile(".env.local");
if (!process.argv.includes("--confirm-development"))
  throw new Error("Use --confirm-development on a development database only.");
const db = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const kindMap = {
  knowledge: "article",
  templates: "template",
  workshops: "workshop",
  architecture: "architecture",
  "use-cases": "use_case",
};
const bodies: Record<string, string> = {
  "emarsys-web-channel":
    "Zielsetzung\nEin fiktiver Webshop möchte für ein generisches Segment passende Inhalte anzeigen. Zuerst werden Zielgruppe, Einwilligung, Platzierung und Erfolgskriterien gemeinsam beschrieben.\n\nVoraussetzungen\nEine isolierte Testumgebung, synthetische Profile und ein abgestimmtes Consent-Konzept sind Voraussetzung. Die aktuelle Produktdokumentation muss vor einer echten Integration geprüft werden.\n\nUmsetzung\nIm Demo-Konzept wird die Anzeige erst nach einer positiven Einwilligungsentscheidung geprüft. Fehlende Daten führen zu einem neutralen Fallback.\n\nQualitätssicherung\nMit erteilter, fehlender und widerrufener Einwilligung testen. Darstellung auf schmalen Displays prüfen und den Abbruch bei unvollständigen Daten dokumentieren.",
  "web-extend-tracking":
    "Ein Event-Konzept definiert Ereignis, Auslöser, Datenfelder und Verantwortlichkeit. Für dieses Demo-Szenario werden Seitenansicht, Produktinteresse und abgeschlossene Aktion unterschieden.\n\nDoppelte Ereignisse und fehlende Pflichtfelder gehören zu den Testfällen. Einwilligungen sind vor einer Aktivierung zu prüfen. Diese Skizze ist keine aktuelle API-Anleitung; eine technische Prüfung steht aus.",
  "esl-grundlagen":
    "Personalisierte Inhalte benötigen nachvollziehbare Bedingungen und sichere Fallback-Texte. In dieser historischen Demo wird zunächst die fachliche Entscheidung beschrieben, bevor konkrete Syntax eingesetzt wird.\n\nDie Inhalte sind veraltet und dürfen nicht als aktuelle Herstellerempfehlung verwendet werden.",
  "consent-grundlagen":
    "Eine gemeinsame Begrifflichkeit für Einwilligungen verhindert widersprüchliche Annahmen zwischen Marketing und Entwicklung.\n\nFür das Demo-Szenario werden Zweck, Status, Zeitpunkt und Widerruf getrennt betrachtet. Keine Rechtsberatung oder fertige Implementierung.",
  "customer-journey-mapping":
    "Zielsetzung\nEin gemeinsames Verständnis der Kundenerlebnisse entlang relevanter Touchpoints schaffen und konkrete Verbesserungspotenziale identifizieren.\n\nMaterialien\nWhiteboard, Notizzettel und eine generische Journey-Vorlage vorbereiten.\n\nModerationshinweise\nMit stiller Einzelarbeit beginnen. Beobachtungen und Annahmen getrennt dokumentieren. Zum Abschluss höchstens drei Maßnahmen mit klarer Verantwortung priorisieren.",
  "marketing-automation":
    "Ausgangssituation\nEin fiktives Handelsunternehmen möchte neue Kontakte strukturiert begrüßen.\n\nHerausforderung\nEinwilligungen, Timing und Inhalte müssen zusammenpassen.\n\nLösungsansatz\nEine kleine Welcome Journey mit eindeutigem Einstieg und Ausstieg planen.\n\nTechnische Voraussetzungen\nSynthetische Testprofile, dokumentiertes Datenmodell und isolierte Testumgebung.\n\nUmsetzung\nSegment bestimmen, Entscheidungskriterien modellieren, Positiv- und Negativfälle testen.\n\nLessons Learned\nWenige überprüfbare Schritte erleichtern die Qualitätssicherung. Diese Aussagen beschreiben das Demo-Szenario, kein reales Projekt.",
};
function uuid(key: string) {
  const h = createHash("sha256")
    .update("cx-playbook-demo:" + key)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
await db.connect();
try {
  await db.query("BEGIN");
  await db.query("LOCK TABLE public.content_items IN EXCLUSIVE MODE");
  await db.query("ALTER TABLE public.content_items DISABLE TRIGGER USER");
  for (const item of contents) {
    const id = uuid(item.slug);
    const details = {
      ...item,
      snippet: item.kind === "templates" ? item.snippet : undefined,
    };
    const body =
      bodies[item.slug] ??
      `${item.description}\n\nVorgehen\nFachliche Ziele und Zuständigkeiten klären, einen begrenzten Ablauf modellieren und mit synthetischen Daten prüfen.\n\nEinordnung\nVollständig synthetisches Demo-Szenario. Keine Herstellerempfehlung oder Kundendokumentation.`;
    await db.query(
      `INSERT INTO public.content_items(id,slug,type,title,description,body,technology,category,tags,details,status,technical_status,source_reference,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published',$11,$12,now()) ON CONFLICT(id) DO NOTHING`,
      [
        id,
        item.slug,
        kindMap[item.kind],
        item.title,
        item.description,
        body,
        item.technology,
        item.category,
        item.tags,
        details,
        item.status === "Aktuell"
          ? "current"
          : item.status === "Veraltet"
            ? "outdated"
            : "review_required",
        item.sourceReference,
      ],
    );
    let file: string | undefined;
    if (item.kind === "templates") file = basename(item.download);
    if (item.slug === "customer-journey-mapping") file = "journey-canvas.md";
    if (file) {
      const bytes = readFileSync("scripts/fixtures/" + file);
      const mime = file.endsWith(".csv")
        ? "text/csv"
        : file.endsWith(".js")
          ? "application/javascript"
          : "text/markdown";
      await db.query(
        "INSERT INTO public.content_assets(id,content_id,filename,mime_type,size,data) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING",
        [uuid("asset:" + item.slug), id, file, mime, bytes.length, bytes],
      );
    }
  }
  await db.query("ALTER TABLE public.content_items ENABLE TRIGGER USER");
  await db.query("COMMIT");
  console.log(
    "13 synthetic demo items seeded idempotently; private demo assets stored in PostgreSQL.",
  );
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
} finally {
  await db.end();
}
void demoSnippet;
