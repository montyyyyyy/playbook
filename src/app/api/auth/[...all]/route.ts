import { getAuth } from "@/lib/server/auth";
import { errorResponse, json } from "@/lib/server/http";
export const runtime = "nodejs";
const allowed = new Set([
  "sign-in/email",
  "sign-out",
  "get-session",
  "reset-password",
]);
async function handle(request: Request) {
  const path = new URL(request.url).pathname.replace("/api/auth/", "");
  if (!allowed.has(path) && !/^reset-password\/[A-Za-z0-9_-]+$/.test(path))
    return json({ error: "Nicht verfügbar." }, 404);
  try {
    return await getAuth().handler(request);
  } catch (e) {
    return errorResponse(e);
  }
}
export const GET = handle;
export const POST = handle;
