import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import pg from "pg";
process.loadEnvFile(".env.local");
const owner = process.env.MIGRATION_DATABASE_URL;
if (!owner) throw new Error("MIGRATION_DATABASE_URL missing");
const client = new pg.Client({ connectionString: owner });
await client.connect();
try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    "SELECT current_user, (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='profiles') AS installed",
  );
  if (Number(rows[0].installed))
    throw new Error(
      "Database already provisioned. Use db:migrate; credentials will not be rotated.",
    );
  const urls = {};
  for (const role of ["playbook_app", "playbook_auth"]) {
    const password = randomBytes(36).toString("base64url");
    const exists = await client.query(
      "SELECT 1 FROM pg_roles WHERE rolname=$1",
      [role],
    );
    if (exists.rowCount)
      throw new Error(
        "Role exists: " +
          role +
          "; use existing credentials, do not overwrite.",
      );
    await client.query(
      `CREATE ROLE ${role} LOGIN PASSWORD ${pg.escapeLiteral(password)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`,
    );
    await client.query(
      `GRANT ${role} TO ${pg.escapeIdentifier(rows[0].current_user)}`,
    );
    const url = new URL(owner);
    url.username = role;
    url.password = password;
    url.searchParams.set("sslmode", "verify-full");
    url.hostname = url.hostname.replace(/(?<!-pooler)\.c-/, "-pooler.c-");
    urls[role] = url.toString();
  }
  const existing = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^(DATABASE_URL|AUTH_DATABASE_URL|BETTER_AUTH_SECRET)=/.test(line),
    )
    .join("\n");
  writeFileSync(
    ".env.local",
    existing +
      "\nDATABASE_URL=" +
      urls.playbook_app +
      "\nAUTH_DATABASE_URL=" +
      urls.playbook_auth +
      "\nBETTER_AUTH_SECRET=" +
      randomBytes(48).toString("base64url") +
      (process.env.BETTER_AUTH_URL
        ? "\n"
        : "\nBETTER_AUTH_URL=http://localhost:3000\n"),
  );
  await client.query("COMMIT");
  console.log(
    "Restricted roles provisioned; credentials saved only in ignored .env.local.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
