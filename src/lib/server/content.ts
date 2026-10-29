import "server-only";
import { z } from "zod";
import type { Content, Section } from "@/lib/models";
import { withSession } from "./db";
import { requireUser, type Identity } from "./session";
export const types: Record<Section, string> = {
  knowledge: "article",
  templates: "template",
  workshops: "workshop",
  architecture: "architecture",
  "use-cases": "use_case",
};
const text = z.string().catch("");
const detailSchema = z.object({
  minutes: z.number().catch(5),
  fileType: text,
  snippet: text,
  duration: text,
  audience: text,
  agenda: z
    .array(z.object({ title: z.string(), minutes: z.number() }))
    .catch([]),
  integration: text,
  systems: z.array(z.string()).catch([]),
  industry: text,
  complexity: text,
  businessGoal: text,
});
export function toContent(row: Record<string, unknown>): Content {
  const kind = (Object.keys(types) as Section[]).find(
    (k) => types[k] === row.type,
  )!;
  const d = detailSchema.parse(row.details ?? {});
  const base = {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description),
    body: String(row.body),
    category: String(row.category),
    technology: String(row.technology),
    tags: row.tags as string[],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    status: (
      {
        current: "Aktuell",
        review_required: "Prüfung erforderlich",
        outdated: "Veraltet",
      } as const
    )[row.technical_status as "current"],
    sourceReference: String(row.source_reference),
    publicationStatus: row.status as Content["publicationStatus"],
    createdBy: row.created_by ? String(row.created_by) : undefined,
    assetDownload: row.asset_id ? `/api/assets/${row.asset_id}` : undefined,
  };
  switch (kind) {
    case "knowledge":
      return { ...base, kind, minutes: d.minutes };
    case "templates":
      return {
        ...base,
        kind,
        fileType: d.fileType,
        download: base.assetDownload ?? "",
        snippet: d.snippet,
      };
    case "workshops":
      return {
        ...base,
        kind,
        duration: d.duration,
        audience: d.audience,
        agenda: d.agenda,
      };
    case "architecture":
      return { ...base, kind, integration: d.integration, systems: d.systems };
    case "use-cases":
      return {
        ...base,
        kind,
        industry: d.industry,
        complexity: d.complexity,
        businessGoal: d.businessGoal,
      };
  }
}
const columns =
  "c.*, (SELECT a.id FROM public.content_assets a WHERE a.content_id=c.id ORDER BY a.created_at LIMIT 1) AS asset_id";
export async function readContents(
  user: Identity,
  section?: Section,
  search?: string,
) {
  return withSession(user.token, async (db) => {
    const r = await db.query(
      `SELECT ${columns} FROM public.content_items c WHERE ($1::text IS NULL OR c.type=$1) AND ($2::text IS NULL OR to_tsvector('german',c.title || ' ' || c.description || ' ' || c.body) @@ websearch_to_tsquery('german',$2) OR c.title ILIKE '%' || $2 || '%') ORDER BY c.updated_at DESC,c.id LIMIT 200`,
      [section ? types[section] : null, search?.slice(0, 100) || null],
    );
    return r.rows.map(toContent);
  });
}
export async function listContents(section?: Section) {
  return readContents(await requireUser(), section);
}
export async function readContent(
  user: Identity,
  section: string,
  slug: string,
) {
  if (!Object.hasOwn(types, section)) return undefined;
  return withSession(user.token, async (db) => {
    const r = await db.query(
      `SELECT ${columns} FROM public.content_items c WHERE c.type=$1 AND c.slug=$2`,
      [types[section as Section], slug],
    );
    return r.rows[0] ? toContent(r.rows[0]) : undefined;
  });
}
