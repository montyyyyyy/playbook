import { z } from "zod";
import { createHash } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { authPool } from "@/lib/server/db";
import { csrf, limit, readJson, json, errorResponse } from "@/lib/server/http";
const schema = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
    name: z.string().trim().min(1).max(100),
    password: z.string().min(12).max(128),
  })
  .strict();
export async function POST(request: Request) {
  try {
    csrf(request);
    await limit("invite-accept-global", 30, 60);
    const data = schema.parse(await readJson(request));
    await limit("invite-" + data.token, 5, 300);
    const digest = createHash("sha256").update(data.token).digest("hex");
    const password = await hashPassword(data.password);
    try {
      await authPool().query("SELECT private.accept_invitation($1,$2,$3)", [
        digest,
        password,
        data.name,
      ]);
    } catch {
      return json(
        { error: "Einladung ungültig, abgelaufen oder bereits verwendet." },
        400,
      );
    }
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
