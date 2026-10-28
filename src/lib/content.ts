import type { BaseContent, Content, Section } from "./models";
export const sections: Record<Section, { title: string; description: string }> =
  {
    knowledge: {
      title: "Knowledge Library",
      description:
        "Praxiswissen, das weiterbringt. Strukturiert, verständlich und schnell gefunden.",
    },
    templates: {
      title: "Templates",
      description:
        "Vorlagen, Checklisten und Code-Beispiele für deinen nächsten Projektschritt.",
    },
    workshops: {
      title: "Workshops",
      description:
        "Gemeinsam Klarheit schaffen. Von der ersten Frage zum nächsten konkreten Schritt.",
    },
    architecture: {
      title: "Architecture",
      description:
        "Systeme verstehen. Verbindungen gestalten. Das große Ganze im Blick behalten.",
    },
    "use-cases": {
      title: "Use Cases",
      description:
        "Von der Herausforderung zur Lösung: beispielhafte Szenarien für Customer Experience.",
    },
  };
const base = (
  slug: string,
  title: string,
  description: string,
  technology: string,
  category: string,
  status: BaseContent["status"] = "Aktuell",
): BaseContent => ({
  id: slug,
  slug,
  title,
  description,
  technology,
  category,
  status,
  tags: [technology, category],
  createdAt: "2026-09-01",
  updatedAt: "2026-10-20",
  sourceReference:
    "Synthetisches CX Playbook Demo-Szenario · keine Herstellerempfehlung",
});
export const demoSnippet = `// Synthetische Demo — keine SAP API\nconst preferences = {\n  consent: true,\n  channel: "web",\n  audience: "demo-segment"\n};\n\nfunction canShowExperience() {\n  return preferences.consent;\n}`;
export const contents: Content[] = [
  {
    ...base(
      "emarsys-web-channel",
      "Emarsys Web Channel Integration",
      "Personalisierte Web-Erlebnisse planen: Voraussetzungen, Einbindung und Qualitätssicherung.",
      "Emarsys",
      "Implementierung",
    ),
    kind: "knowledge",
    minutes: 8,
  },
  {
    ...base(
      "web-extend-tracking",
      "Web Extend Tracking",
      "Ein konsistentes Event-Konzept für die Customer Journey entwickeln.",
      "Emarsys",
      "Tracking",
      "Prüfung erforderlich",
    ),
    kind: "knowledge",
    minutes: 6,
  },
  {
    ...base(
      "esl-grundlagen",
      "ESL – Grundlagen",
      "Personalisierung verstehen und dynamische Inhalte strukturiert vorbereiten.",
      "Emarsys",
      "Personalisierung",
      "Veraltet",
    ),
    kind: "knowledge",
    minutes: 5,
  },
  {
    ...base(
      "consent-grundlagen",
      "Consent als gemeinsame Grundlage",
      "Einwilligungen als Voraussetzung einer abgestimmten Customer Experience betrachten.",
      "SAP CDC",
      "Strategie",
    ),
    kind: "knowledge",
    minutes: 7,
  },
  {
    ...base(
      "implementation-checklist",
      "Emarsys Implementation Checklist",
      "Eine kompakte Checkliste vom Kick-off bis zur technischen Abnahme.",
      "Emarsys",
      "Implementierung",
    ),
    kind: "templates",
    fileType: "CSV",
    download: "/downloads/implementation-checklist.csv",
  },
  {
    ...base(
      "journey-canvas",
      "Customer Journey Canvas",
      "Touchpoints, Bedürfnisse und Chancen gemeinsam sichtbar machen.",
      "Plattformübergreifend",
      "Strategie",
    ),
    kind: "templates",
    fileType: "Markdown",
    download: "/downloads/journey-canvas.md",
  },
  {
    ...base(
      "tracking-snippet",
      "Tracking-Konzept: Code-Skizze",
      "Ein bewusst vereinfachtes Beispiel für consentabhängige Entscheidungen.",
      "Emarsys",
      "Tracking",
    ),
    kind: "templates",
    fileType: "JavaScript",
    download: "/downloads/tracking-demo.js",
    snippet: demoSnippet,
  },
  {
    ...base(
      "customer-journey-mapping",
      "Customer Journey Mapping",
      "Ein gemeinsames Verständnis der Kundenerlebnisse schaffen und Verbesserungspotenziale identifizieren.",
      "Plattformübergreifend",
      "Strategie",
    ),
    kind: "workshops",
    duration: "4 Stunden",
    audience: "CX Consultants · 6–12 Personen",
    agenda: [
      { title: "Intro & Zielsetzung", minutes: 20 },
      { title: "Customer Segments", minutes: 35 },
      { title: "As-is Journey Mapping", minutes: 60 },
      { title: "Pause", minutes: 15 },
      { title: "Pain Points & Opportunities", minutes: 50 },
      { title: "To-be Journey & Maßnahmen", minutes: 60 },
    ],
  },
  {
    ...base(
      "tracking-workshop",
      "Tracking & Measurement Workshop",
      "Gemeinsam ein belastbares Messkonzept mit klaren Verantwortlichkeiten entwerfen.",
      "Emarsys",
      "Tracking",
    ),
    kind: "workshops",
    duration: "2 Stunden",
    audience: "Marketing & Entwicklung · 4–8 Personen",
    agenda: [
      { title: "Ziele und Rahmen", minutes: 20 },
      { title: "Events und Datenfelder", minutes: 45 },
      { title: "Consent und Validierung", minutes: 35 },
      { title: "Verantwortung und nächste Schritte", minutes: 20 },
    ],
  },
  {
    ...base(
      "sap-cx-architecture",
      "SAP CX Gesamtarchitektur",
      "Eine beispielhafte Systemlandschaft mit klaren Datenflüssen und Verantwortlichkeiten.",
      "SAP CDP",
      "Integration",
    ),
    kind: "architecture",
    integration: "Event-basiert",
    systems: [
      "Shop / Touchpoints",
      "Consent · SAP CDC",
      "Profil · SAP CDP",
      "Aktivierung · Emarsys",
    ],
  },
  {
    ...base(
      "commerce-emarsys",
      "SAP Commerce / Emarsys Integration",
      "Eine konzeptionelle Sicht auf die Verbindung von Commerce und Marketing.",
      "SAP Commerce",
      "Integration",
    ),
    kind: "architecture",
    integration: "API",
    systems: ["SAP Commerce", "Integrationsschicht", "Emarsys", "Reporting"],
  },
  {
    ...base(
      "marketing-automation",
      "Marketing Automation: Welcome Journey",
      "Eine konsistente Begrüßungsstrecke für neu registrierte Kontakte planen.",
      "Emarsys",
      "Lifecycle",
    ),
    kind: "use-cases",
    industry: "Handel",
    complexity: "Mittel",
    businessGoal: "Aktivierung",
  },
  {
    ...base(
      "feedback-loop",
      "Customer Feedback Loop",
      "Feedback erfassen, Themen erkennen und Verbesserungen priorisieren.",
      "Qualtrics",
      "Feedback",
    ),
    kind: "use-cases",
    industry: "Dienstleistung",
    complexity: "Einfach",
    businessGoal: "Kundenzufriedenheit",
  },
];
export const getContent = (section: string, slug: string) =>
  contents.find((item) => item.kind === section && item.slug === slug);
export const hrefFor = (item: Content) => `/${item.kind}/${item.slug}`;
export const locale = "de-DE";
