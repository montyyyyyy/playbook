"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page empty-state">
      <h1>Das hat gerade nicht geklappt.</h1>
      <p>Bitte lade den Inhalt erneut.</p>
      <button className="button" onClick={reset}>
        Erneut versuchen
      </button>
    </div>
  );
}
