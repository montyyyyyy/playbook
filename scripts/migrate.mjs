import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";
process.loadEnvFile(".env.local");
if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error("MIGRATION_DATABASE_URL missing");
const db = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
await db.connect();
try {
  await db.query("SELECT pg_advisory_lock(61720302)");
  await db.query(
    "CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const name of readdirSync("db/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const rawSql = readFileSync("db/migrations/" + name, "utf8");
    const sql = rawSql.replace(/\r\n/g, "\n");
    const rawHash = createHash("sha256").update(rawSql).digest("hex");
    const hash = createHash("sha256").update(sql).digest("hex");
    const done = await db.query(
      "SELECT checksum FROM public.schema_migrations WHERE name=$1",
      [name],
    );
    if (done.rowCount) {
      if (done.rows[0].checksum !== hash && done.rows[0].checksum !== rawHash)
        throw new Error("Migration checksum mismatch: " + name);
      if (done.rows[0].checksum !== hash)
        await db.query(
          "UPDATE public.schema_migrations SET checksum=$1 WHERE name=$2",
          [hash, name],
        );
      continue;
    }
    await db.query("BEGIN");
    try {
      await db.query(sql);
      await db.query(
        "INSERT INTO public.schema_migrations(name,checksum) VALUES($1,$2)",
        [name, hash],
      );
      await db.query("COMMIT");
      console.log("Applied " + name);
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    }
  }
} finally {
  await db.query("SELECT pg_advisory_unlock(61720302)");
  await db.end();
}

