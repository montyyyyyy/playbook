import "server-only";
import { Pool, type PoolClient } from "pg";
export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Setup erforderlich: ${name} fehlt.`);
  return value;
}
function runtimeUrl(name: string, role: string) {
  const value = required(name);
  if (decodeURIComponent(new URL(value).username) !== role)
    throw new Error("Setup erforderlich: eingeschränkte Datenbankrolle fehlt.");
  return value;
}
const globalDb = globalThis as unknown as { appPool?: Pool; authPool?: Pool };
export function appPool() {
  return (globalDb.appPool ??= new Pool({
    connectionString: runtimeUrl("DATABASE_URL", "playbook_app"),
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
  }));
}
export function authPool() {
  return (globalDb.authPool ??= new Pool({
    connectionString: runtimeUrl("AUTH_DATABASE_URL", "playbook_auth"),
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
  }));
}
export async function withSession<T>(
  token: string,
  run: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const db = await appPool().connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT set_config('app.session_token',$1,true)", [token]);
    const result = await run(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
