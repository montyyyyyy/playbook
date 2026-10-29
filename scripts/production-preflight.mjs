import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";

process.loadEnvFile(process.env.PLAYBOOK_ENV_FILE ?? ".env.local");

if (!process.argv.includes("--confirm-production"))
  throw new Error("Use --confirm-production for the explicit production preflight.");
if (process.env.PLAYBOOK_ENVIRONMENT !== "production")
  throw new Error("PLAYBOOK_ENVIRONMENT must be production.");
if (process.env.BETTER_AUTH_URL !== "https://playbook.mesta.digital")
  throw new Error("BETTER_AUTH_URL must match the production domain exactly.");

function checkedUrl(name, expectedRole, pooled) {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is missing.`);
  const url = new URL(raw);
  if (decodeURIComponent(url.username) !== expectedRole)
    throw new Error(`${name} must use ${expectedRole}.`);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:")
    throw new Error(`${name} must be a PostgreSQL URL.`);
  if (url.searchParams.get("sslmode") !== "verify-full")
    throw new Error(`${name} must use sslmode=verify-full.`);
  const isPooled = url.hostname.includes("-pooler.");
  if (pooled !== isPooled)
    throw new Error(
      `${name} must use a ${pooled ? "pooled" : "direct"} Neon connection.`,
    );
  return raw;
}

const appUrl = checkedUrl("DATABASE_URL", "playbook_app", true);
const authUrl = checkedUrl("AUTH_DATABASE_URL", "playbook_auth", true);
const ownerRaw = process.env.MIGRATION_DATABASE_URL;
if (!ownerRaw) throw new Error("MIGRATION_DATABASE_URL is missing.");
const ownerUrl = new URL(ownerRaw);
if (ownerUrl.hostname.includes("-pooler."))
  throw new Error("MIGRATION_DATABASE_URL must use a direct Neon connection.");
if (ownerUrl.searchParams.get("sslmode") !== "verify-full")
  throw new Error("MIGRATION_DATABASE_URL must use sslmode=verify-full.");
if (["playbook_app", "playbook_auth"].includes(decodeURIComponent(ownerUrl.username)))
  throw new Error("MIGRATION_DATABASE_URL must use the migration owner.");
if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");

const owner = new pg.Client({ connectionString: ownerRaw });
const app = new pg.Client({ connectionString: appUrl });
const auth = new pg.Client({ connectionString: authUrl });
await Promise.all([owner.connect(), app.connect(), auth.connect()]);

try {
  const expected = new Map(
    readdirSync("db/migrations")
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => {
        const sql = readFileSync(`db/migrations/${name}`, "utf8").replace(
          /\r\n/g,
          "\n",
        );
        return [name, createHash("sha256").update(sql).digest("hex")];
      }),
  );
  const applied = await owner.query(
    "SELECT name,checksum FROM public.schema_migrations ORDER BY name",
  );
  if (
    applied.rowCount !== expected.size ||
    applied.rows.some((row) => expected.get(row.name) !== row.checksum)
  )
    throw new Error("Production migration set or checksum does not match Git.");

  const roles = await owner.query(
    "SELECT rolname,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls FROM pg_roles WHERE rolname=ANY($1::text[])",
    [["playbook_app", "playbook_auth"]],
  );
  if (
    roles.rowCount !== 2 ||
    roles.rows.some(
      (role) =>
        role.rolsuper ||
        role.rolcreaterole ||
        role.rolcreatedb ||
        role.rolbypassrls,
    )
  )
    throw new Error("Runtime database roles are missing or overprivileged.");

  const [appIdentity, authIdentity] = await Promise.all([
    app.query("SELECT current_user"),
    auth.query("SELECT current_user"),
  ]);
  if (appIdentity.rows[0].current_user !== "playbook_app")
    throw new Error("DATABASE_URL did not authenticate as playbook_app.");
  if (authIdentity.rows[0].current_user !== "playbook_auth")
    throw new Error("AUTH_DATABASE_URL did not authenticate as playbook_auth.");

  const fixtures = await owner.query(
    "SELECT count(*)::integer AS count FROM public.content_items WHERE source_reference LIKE 'Synthetisches CX Playbook Demo-Szenario%'",
  );
  if (fixtures.rows[0].count !== 0)
    throw new Error("Synthetic development fixtures exist in production.");

  console.log(
    "Production preflight passed: origins, secrets, connections, roles, migrations and seed isolation are valid.",
  );
} finally {
  await Promise.allSettled([owner.end(), app.end(), auth.end()]);
}
