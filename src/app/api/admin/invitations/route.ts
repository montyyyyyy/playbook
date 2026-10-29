import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { requireApi } from "@/lib/server/session";
import { withSession, required } from "@/lib/server/db";
import { csrf, limit, readJson, json, errorResponse } from "@/lib/server/http";
import { mailConfigured, sendAccountMail } from "@/lib/server/mail";
export async function GET() {
  try {
    const user = await requireApi(["admin"]);
    return json(
      await withSession(
        user.token,
        async (db) =>
          (
            await db.query(
              "SELECT id,email,intended_role,status,created_at,expires_at FROM public.invitations ORDER BY created_at DESC LIMIT 100",
            )
          ).rows,
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    csrf(request);
    const user = await requireApi(["admin"]);
    await limit("invite-" + user.profile.id, 10, 3600);
    const input = z
      .object({
        email: z.email().max(254),
        role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
      })
      .strict()
      .parse(await readJson(request));
    const token = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    const link = new URL("/accept-invite", required("BETTER_AUTH_URL"));
    link.hash = "token=" + token;
    await withSession(user.token, async (db) => {
      await db.query(
        "INSERT INTO public.invitations(email,intended_role,invited_by,token_hash,expires_at) VALUES(lower($1),$2,$3,$4,now()+interval '48 hours')",
        [input.email, input.role, user.profile.id, hash],
      );
      if (mailConfigured())
        await sendAccountMail(
          input.email,
          "Einladung zu CX Playbook",
          `Deine persönliche Einladung (48 Stunden gültig):\n\n${link}\n\nDer Link kann nur einmal verwendet werden.`,
        );
    });
    return json({
      ok: true,
      link: mailConfigured() ? undefined : link.toString(),
      delivery: mailConfigured() ? "email" : "manual",
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    csrf(request);
    const user = await requireApi(["admin"]);
    await limit("invite-" + user.profile.id, 10, 3600);
    const { id } = z
      .object({ id: z.uuid() })
      .strict()
      .parse(await readJson(request));
    await withSession(user.token, (db) =>
      db.query("SELECT private.revoke_invitation($1)", [id]),
    );
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
