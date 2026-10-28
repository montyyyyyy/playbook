import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireApi, AccessError } from "@/lib/server/session";
import { withSession } from "@/lib/server/db";
import { csrf, limit, json, errorResponse } from "@/lib/server/http";
const mimeExtensions: Record<string, string> = {
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/pdf": "pdf",
  "application/javascript": "js",
};
export async function POST(request: Request) {
  try {
    csrf(request);
    const user = await requireApi(["admin", "editor"]);
    await limit("upload-" + user.profile.id, 10, 300);
    if (Number(request.headers.get("content-length") ?? 0) > 5300000)
      throw new AccessError(413);
    const form = await request.formData();
    const contentId = z.uuid().parse(form.get("content_id"));
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > 5242880 ||
      !mimeExtensions[file.type]
    )
      throw new AccessError(
        400,
        "Erlaubt sind Text, CSV, Markdown, JavaScript und PDF bis 5 MB.",
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    if (
      file.type === "application/pdf" &&
      bytes.subarray(0, 5).toString() !== "%PDF-"
    )
      throw new AccessError(400);
    if (file.type !== "application/pdf" && bytes.includes(0))
      throw new AccessError(400);
    const id = randomUUID();
    const filename = `asset-${id}.${mimeExtensions[file.type]}`;
    await withSession(user.token, (db) =>
      db.query(
        "INSERT INTO public.content_assets(id,content_id,filename,mime_type,size,data,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id, contentId, filename, file.type, file.size, bytes, user.profile.id],
      ),
    );
    return json({ id });
  } catch (e) {
    return errorResponse(e);
  }
}
