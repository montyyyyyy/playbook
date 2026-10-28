import { z } from "zod";
import { requireApi } from "@/lib/server/session";
import { withSession } from "@/lib/server/db";
import { csrf, limit, readJson, json, errorResponse } from "@/lib/server/http";
export async function GET() {
  try {
    const user = await requireApi(["admin"]);
    return json(
      await withSession(
        user.token,
        async (db) =>
          (
            await db.query(
              "SELECT id,display_name,role,account_status,created_at FROM public.profiles ORDER BY created_at",
            )
          ).rows,
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: Request) {
  try {
    csrf(request);
    const user = await requireApi(["admin"]);
    await limit("manage-users-" + user.profile.id);
    const input = z
      .object({
        id: z.uuid(),
        role: z.enum(["admin", "editor", "viewer"]),
        status: z.enum(["active", "disabled"]),
      })
      .strict()
      .parse(await readJson(request));
    await withSession(user.token, (db) =>
      db.query("SELECT private.manage_user($1,$2,$3)", [
        input.id,
        input.role,
        input.status,
      ]),
    );
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
