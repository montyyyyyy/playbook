import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page empty-state">
      <span className="eyebrow">404</span>
      <h1>Hier geht es nicht weiter.</h1>
      <p>Dieser Inhalt wurde nicht gefunden.</p>
      <Link className="button" href="/knowledge">
        Zur Knowledge Library
      </Link>
    </div>
  );
}
