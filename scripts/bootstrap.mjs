import { randomBytes, createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import pg from "pg";
process.loadEnvFile(".env.local");
const email = process.argv[2];
if (!email || !/^\S+@\S+\.\S+$/.test(email))
  throw new Error("Usage: npm run admin:bootstrap -- email");
const base = process.env.BETTER_AUTH_URL;
if (!base) throw new Error("BETTER_AUTH_URL missing");
const db = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
await db.connect();
try {
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(61720301)");
  if (
    Number(
      (
        await db.query(
          "SELECT count(*) FROM public.profiles WHERE role='admin'",
        )
      ).rows[0].count,
    )
  )
    throw new Error(
      "An administrator already exists. No bootstrap elevation allowed.",
    );
  if (
    Number(
      (
        await db.query(
          "SELECT count(*) FROM public.invitations WHERE intended_role='admin' AND status='pending' AND expires_at>now()",
        )
      ).rows[0].count,
    )
  )
    throw new Error(
      "A bootstrap invitation is already pending; use the existing link.",
    );
  await db.query(
    "UPDATE public.invitations SET status='revoked' WHERE intended_role='admin' AND status='pending' AND expires_at<=now()",
  );
  const token = randomBytes(32).toString("hex");
  const digest = createHash("sha256").update(token).digest("hex");
  await db.query(
    "INSERT INTO public.invitations(email,intended_role,token_hash,expires_at) VALUES(lower($1),'admin',$2,now()+interval '48 hours')",
    [email, digest],
  );
  const url = new URL("/accept-invite", base);
  url.hash = "token=" + token;
  writeFileSync(".bootstrap-admin-link.txt", url.toString() + "\n", {
    mode: 0o600,
  });
  await db.query("COMMIT");
  console.log(
    "One-time administrator invitation saved in ignored .bootstrap-admin-link.txt (48h). No password or token printed.",
  );
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
} finally {
  await db.end();
}
