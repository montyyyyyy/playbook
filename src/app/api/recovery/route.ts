import { z } from "zod";
import { getAuth } from "@/lib/server/auth";
import { mailConfigured } from "@/lib/server/mail";
import { required } from "@/lib/server/db";
import { csrf, limit, readJson, json, errorResponse } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    csrf(request);
    await limit("recovery-global", 20, 300);
    const { email } = z
      .object({ email: z.email().max(254) })
      .strict()
      .parse(await readJson(request));
    await limit("recovery-" + email.toLowerCase(), 3, 300);
    if (mailConfigured()) {
      try {
        await getAuth().api.requestPasswordReset({
          body: {
            email,
            redirectTo: new URL(
              "/reset-password",
              required("BETTER_AUTH_URL"),
            ).toString(),
          },
        });
      } catch {
        /* Neutral response, independent of existence and delivery. */
      }
    }
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
