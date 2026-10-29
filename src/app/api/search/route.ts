import { requireApi } from "@/lib/server/session";
import { readContents } from "@/lib/server/content";
import { json, errorResponse } from "@/lib/server/http";
export async function GET(request: Request) {
  try {
    const user = await requireApi();
    const query = new URL(request.url).searchParams.get("q")?.trim();
    return json(
      query ? (await readContents(user, undefined, query)).slice(0, 8) : [],
    );
  } catch (e) {
    return errorResponse(e);
  }
}
