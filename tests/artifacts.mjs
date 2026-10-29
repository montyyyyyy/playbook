import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
process.loadEnvFile(".env.local");
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
const secrets = [
  "DATABASE_URL",
  "AUTH_DATABASE_URL",
  "MIGRATION_DATABASE_URL",
  "BETTER_AUTH_SECRET",
]
  .map((name) => process.env[name])
  .filter(Boolean);
const privateMarkers = [
  "Ein fiktiver Webshop möchte",
  "Emarsys Web Channel Integration",
  "Ein konsistentes Event-Konzept für die Customer Journey",
];
for (const path of files(".next/static")) {
  const text = readFileSync(path, "utf8");
  for (const value of secrets)
    assert(!text.includes(value), "server secret in public bundle");
  for (const marker of privateMarkers)
    assert(!text.includes(marker), "seed content in public bundle");
}
const manifest = JSON.parse(
  readFileSync(".next/prerender-manifest.json", "utf8"),
);
for (const path of Object.keys(manifest.routes))
  assert(
    ![
      "/",
      "/knowledge",
      "/templates",
      "/workshops",
      "/architecture",
      "/use-cases",
      "/admin",
      "/settings",
      "/edit",
    ].some(
      (route) =>
        path === route || (route !== "/" && path.startsWith(route + "/")),
    ),
    "private page prerendered",
  );
console.log(
  "PASS: no runtime secrets or private seed markers in public bundles; no private prerendered pages.",
);
