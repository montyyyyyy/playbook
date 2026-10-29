import { listContents } from "@/lib/server/content";
import { requireUser } from "@/lib/server/session";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Files,
  Users,
  Lightbulb,
  Network,
  ArrowUpRight,
  Clock3,
} from "lucide-react";
import { hrefFor } from "@/lib/content";
import { ContentCard } from "@/components/library";
const modules = [
  {
    slug: "knowledge",
    name: "Knowledge",
    description: "Wissen für die Praxis",
    icon: BookOpen,
    count: "4 Artikel",
  },
  {
    slug: "templates",
    name: "Templates",
    description: "Direkt ins Machen kommen",
    icon: Files,
    count: "3 Vorlagen",
  },
  {
    slug: "workshops",
    name: "Workshops",
    description: "Gemeinsam Ideen entwickeln",
    icon: Users,
    count: "2 Workshops",
  },
  {
    slug: "architecture",
    name: "Architecture",
    description: "Verbindungen verstehen",
    icon: Network,
    count: "2 Architekturen",
  },
];
export default async function Home() {
  const contents = await listContents();
  const { profile } = await requireUser();
  return (
    <div className="page dashboard">
      <div className="welcome-line">
        <span>DEIN WORKSPACE</span>
        <span>
          Willkommen zurück, {profile.display_name}{" "}
          <span className="sand">✦</span>
        </span>
      </div>
      <section className="hero">
        <div className="landscape" aria-hidden="true">
          <svg viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sky" x2="0" y2="1">
                <stop stopColor="#22282c" />
                <stop offset=".55" stopColor="#a17459" />
                <stop offset="1" stopColor="#d3ad7d" />
              </linearGradient>
              <linearGradient id="mountain" x2="0" y2="1">
                <stop stopColor="#39403e" />
                <stop offset="1" stopColor="#111c1c" />
              </linearGradient>
              <radialGradient id="sun">
                <stop stopColor="#f8d2a0" stopOpacity=".7" />
                <stop offset="1" stopColor="#d2a17b" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path fill="url(#sky)" d="M0 0h1200v500H0z" />
            <ellipse cx="960" cy="170" rx="240" ry="170" fill="url(#sun)" />
            <path
              d="M0 320L170 180 260 250 430 115 510 225 590 190 720 300 840 200 960 300 1070 150 1200 230V500H0Z"
              fill="#73655a"
              opacity=".65"
            />
            <path
              d="M0 380L150 240 240 315 390 195 510 350 640 270 750 370 920 250 1000 340 1150 230 1200 280V500H0Z"
              fill="#414c47"
            />
            <path
              d="M0 470L180 370 350 450 490 360 680 455 860 355 980 385 1110 310 1200 340V500H0Z"
              fill="url(#mountain)"
            />
            <g fill="#182322">
              <path d="M1000 400l9-142h9l9 142z" />
              <path d="M1014 304l-61-42 5-7 59 31 60-51 5 8-63 65z" />
              <ellipse cx="1012" cy="230" rx="86" ry="43" />
              <ellipse cx="962" cy="248" rx="47" ry="26" />
              <ellipse cx="1068" cy="248" rx="54" ry="29" />
            </g>
          </svg>
        </div>
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-dot" /> CX PLAYBOOK
          </span>
          <h1>
            Wissen. Erfahrungen.
            <br />
            Schneller zum Ergebnis.
          </h1>
          <p>
            Praxiswissen, erprobte Vorgehensmodelle und konkrete
            <br className="desktop-break" /> Vorlagen rund um SAP Customer
            Experience.
          </p>
          <Link className="hero-link" href="/knowledge">
            Wissen entdecken <ArrowRight size={17} />
          </Link>
        </div>
        <span className="hero-caption">PERSPEKTIVEN VERBINDEN.</span>
      </section>
      <div className="module-grid">
        {modules.map(({ slug, name, description, icon: Icon }) => (
          <Link className="module-card" href={`/${slug}`} key={slug}>
            <div>
              <Icon size={25} />
              <ArrowUpRight size={17} />
            </div>
            <h2>{name}</h2>
            <p>{description}</p>
            <small>
              {contents.filter((c) => c.kind === slug).length} Inhalte
            </small>
          </Link>
        ))}
      </div>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">WEITER GEHT’S</span>
            <h2>
              <Clock3 size={19} /> Zuletzt angesehen
            </h2>
          </div>
          <Link href="/knowledge">
            Alle Inhalte <ArrowRight size={15} />
          </Link>
        </div>
        <p className="section-note">Beispielauswahl für deinen Workspace</p>
        <div className="card-grid">
          {contents.slice(0, 3).map((item) => (
            <ContentCard key={item.id} item={item} visual />
          ))}
        </div>
      </section>
      <div className="home-bottom">
        <section>
          <div className="section-heading">
            <h2>Für dich empfohlen</h2>
            <Lightbulb size={20} />
          </div>
          {contents.slice(3, 5).map((item) => (
            <Link className="recommended" key={item.id} href={hrefFor(item)}>
              <span className="recommend-icon">
                {item.kind === "templates" ? (
                  <Files size={21} />
                ) : (
                  <Lightbulb size={21} />
                )}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.category} · {item.technology}
                </small>
              </span>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </section>
        <section className="topics">
          <span className="eyebrow">DEIN CX-ÖKOSYSTEM</span>
          <h2>Ein Thema. Viele Perspektiven.</h2>
          <p>Entdecke Wissen entlang deiner Technologien.</p>
          <div>
            {["Emarsys", "SAP CDP", "SAP CDC", "SAP Commerce", "Qualtrics"].map(
              (t) => (
                <Link
                  className="chip"
                  href={`/knowledge?technology=${encodeURIComponent(t)}`}
                  key={t}
                >
                  {t}
                  <ArrowUpRight size={12} />
                </Link>
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
