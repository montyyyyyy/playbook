import { z } from "zod";
import { randomBytes } from "node:crypto";
import { requireApi } from "@/lib/server/session";
import { withSession, required } from "@/lib/server/db";
import { csrf, limit, readJson, json, errorResponse } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    csrf(request);
    const user = await requireApi(["admin"]);
    await limit("reset-" + user.profile.id, 10, 3600);
    const { id } = z
      .object({ id: z.uuid() })
      .strict()
      .parse(await readJson(request));
    const token = randomBytes(32).toString("hex");
    await withSession(user.token, (db) =>
      db.query("SELECT private.issue_reset($1,$2)", [id, token]),
    );
    const link = new URL("/reset-password", required("BETTER_AUTH_URL"));
    link.hash = "token=" + token;
    return json({ link: link.toString() });
  } catch (e) {
    return errorResponse(e);
  }
}
