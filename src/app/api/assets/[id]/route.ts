import { z } from "zod";
import { requireApi, AccessError } from "@/lib/server/session";
import { withSession } from "@/lib/server/db";
import { errorResponse } from "@/lib/server/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApi();
    const id = z.uuid().parse((await params).id);
    const asset = await withSession(
      user.token,
      async (db) =>
        (
          await db.query(
            "SELECT filename,mime_type,data,size FROM public.content_assets WHERE id=$1",
            [id],
          )
        ).rows[0],
    );
    if (!asset) throw new AccessError(404);
    return new Response(new Uint8Array(asset.data), {
      headers: {
        "Content-Type": asset.mime_type,
        "Content-Disposition": `attachment; filename="${asset.filename}"`,
        "Content-Length": String(asset.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
