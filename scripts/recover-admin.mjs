import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import pg from "pg";
process.loadEnvFile(process.env.PLAYBOOK_ENV_FILE ?? ".env.local");
const email = process.argv[2];
if (!email) throw new Error("Usage: npm run admin:recover -- email");
const db = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
await db.connect();
try {
  await db.query("BEGIN");
  const user = (
    await db.query(
      "SELECT p.id FROM public.profiles p JOIN public.auth_user u ON p.id=u.id WHERE lower(u.email)=lower($1) AND p.role='admin' AND p.account_status='active' FOR UPDATE OF p",
      [email],
    )
  ).rows[0];
  if (!user) throw new Error("No active administrator with this email.");
  const token = randomBytes(32).toString("hex");
  await db.query(
    "DELETE FROM public.auth_verification WHERE value=$1 AND identifier LIKE 'reset-password:%'",
    [user.id],
  );
  await db.query(
    "INSERT INTO public.auth_verification(identifier,value,\"expiresAt\") VALUES($1,$2,now()+interval '30 minutes')",
    ["reset-password:" + token, user.id],
  );
  await db.query(
    "INSERT INTO public.audit_events(action,target_type,target_id) VALUES('operator_password_reset','profile',$1)",
    [user.id],
  );
  const url = new URL("/reset-password", process.env.BETTER_AUTH_URL);
  url.hash = "token=" + token;
  writeFileSync(".recovery-admin-link.txt", url.toString() + "\n", {
    mode: 0o600,
  });
  await db.query("COMMIT");
  console.log(
    "One-time recovery link stored in ignored .recovery-admin-link.txt (30 minutes).",
  );
} catch (e) {
  await db.query("ROLLBACK");
  throw e;
} finally {
  await db.end();
}
