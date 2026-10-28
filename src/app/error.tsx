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
      <p>
        Der Workspace ist derzeit nicht verfügbar. Bitte erneut versuchen; bei
        einer neuen Installation muss der Administrator Datenbankmigrationen und
        Serverkonfiguration prüfen.
      </p>
      <button className="button" onClick={reset}>
        Erneut versuchen
      </button>
    </div>
  );
}
