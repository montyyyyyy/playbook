import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AccessError } from "./session";
import { authPool, required } from "./db";
export function csrf(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(required("BETTER_AUTH_URL")).origin
  )
    throw new AccessError(403, "Ungültiger Ursprung.");
}
export async function limit(key: string, max = 10, seconds = 300) {
  const hash = createHash("sha256").update(key).digest("hex");
  const r = await authPool().query(
    "SELECT private.limit_request($1,$2,$3) AS allowed",
    [hash, max, seconds],
  );
  if (!r.rows[0].allowed)
    throw new AccessError(
      429,
      "Zu viele Versuche. Bitte später erneut versuchen.",
    );
}
export async function readJson(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 150000)
    throw new AccessError(413);
  const text = await request.text();
  if (text.length > 150000) throw new AccessError(413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AccessError(400, "Ungültige Anfrage.");
  }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function errorResponse(error: unknown) {
  if (error instanceof AccessError)
    return json({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return json({ error: "Bitte Eingaben prüfen." }, 400);
  return json(
    {
      error: "Vorgang nicht möglich. Konfiguration und Berechtigungen prüfen.",
    },
    500,
  );
}
