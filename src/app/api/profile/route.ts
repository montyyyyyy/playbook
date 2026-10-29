import { z } from "zod";
import { requireApi } from "@/lib/server/session";
import { withSession } from "@/lib/server/db";
import { csrf, readJson, json, errorResponse } from "@/lib/server/http";
export async function PATCH(request: Request) {
  try {
    csrf(request);
    const user = await requireApi();
    const { display_name } = z
      .object({ display_name: z.string().trim().min(1).max(100) })
      .strict()
      .parse(await readJson(request));
    await withSession(user.token, (db) =>
      db.query("UPDATE public.profiles SET display_name=$1 WHERE id=$2", [
        display_name,
        user.profile.id,
      ]),
    );
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
