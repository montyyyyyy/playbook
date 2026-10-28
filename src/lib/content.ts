import type { Content, Section } from "./models";
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

export const hrefFor = (item: Content) => `/${item.kind}/${item.slug}`;
export const locale = "de-DE";
