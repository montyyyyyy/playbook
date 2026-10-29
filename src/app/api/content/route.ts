import { z } from "zod";
import { requireApi, AccessError } from "@/lib/server/session";
import { withSession } from "@/lib/server/db";
import { readContents } from "@/lib/server/content";
import { csrf, limit, readJson, json, errorResponse } from "@/lib/server/http";
const schema = z
  .object({
    id: z.uuid().optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .max(150),
    type: z.enum([
      "article",
      "template",
      "workshop",
      "architecture",
      "use_case",
    ]),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
    body: z.string().max(100000),
    technology: z.string().max(100),
    category: z.string().max(100),
    tags: z.array(z.string().max(50)).max(20),
    status: z.enum(["draft", "in_review", "approved", "published", "archived"]),
    technical_status: z.enum(["current", "review_required", "outdated"]),
    source_reference: z.string().max(500),
  })
  .strict();
export async function GET() {
  try {
    return json(await readContents(await requireApi()));
  } catch (e) {
    return errorResponse(e);
  }
}
async function mutate(request: Request) {
  try {
    csrf(request);
    const user = await requireApi(["admin", "editor"]);
    await limit("content-" + user.profile.id, 60, 300);
    const i = schema.parse(await readJson(request));
    if (
      user.profile.role === "editor" &&
      (!i.id
        ? i.status !== "draft"
        : !["draft", "in_review"].includes(i.status))
    )
      throw new AccessError(403);
    const result = await withSession(user.token, async (db) => {
      const values = [
        i.slug,
        i.type,
        i.title,
        i.description,
        i.body,
        i.technology,
        i.category,
        i.tags,
        i.status,
        i.technical_status,
        i.source_reference,
      ];
      if (i.id)
        return db.query(
          "UPDATE public.content_items SET slug=$1,type=$2,title=$3,description=$4,body=$5,technology=$6,category=$7,tags=$8,status=$9,technical_status=$10,source_reference=$11 WHERE id=$12 RETURNING id",
          [...values, i.id],
        );
      return db.query(
        "INSERT INTO public.content_items(slug,type,title,description,body,technology,category,tags,status,technical_status,source_reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id",
        values,
      );
    });
    if (!result.rowCount) throw new AccessError(403);
    return json({ id: result.rows[0].id });
  } catch (e) {
    return errorResponse(e);
  }
}
export const POST = mutate;
export const PATCH = mutate;
