import { notFound } from "next/navigation";
import { ContentEditor } from "@/components/editor";
import { requireUser } from "@/lib/server/session";
import { readContents } from "@/lib/server/content";
export default async function EditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await requireUser();
  if (user.profile.role === "viewer")
    return (
      <div className="page">
        <h1>Zugriff verweigert</h1>
      </div>
    );
  const { id } = await searchParams;
  const item = id
    ? (await readContents(user)).find((c) => c.id === id)
    : undefined;
  if (id && !item) notFound();
  if (
    item &&
    user.profile.role === "editor" &&
    (item.createdBy !== user.profile.id ||
      !["draft", "in_review"].includes(item.publicationStatus ?? ""))
  )
    return (
      <div className="page">
        <h1>Zugriff verweigert</h1>
      </div>
    );
  return <ContentEditor key={id ?? "new"} item={item} profile={user.profile} />;
}
