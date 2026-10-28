import { notFound } from "next/navigation";
import { Detail } from "@/components/detail";
import { readContent, readContents } from "@/lib/server/content";
import { requireUser } from "@/lib/server/session";
import { EditorLink } from "@/components/editor";
type Props = { params: Promise<{ section: string; slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props) {
  const user = await requireUser();
  const { section, slug } = await params;
  const item = await readContent(user, section, slug);
  return { title: item?.title ?? "Nicht gefunden" };
}
export default async function DetailPage({ params }: Props) {
  const user = await requireUser();
  const { section, slug } = await params;
  const item = await readContent(user, section, slug);
  if (!item) notFound();
  const related = (await readContents(user))
    .filter((c) => c.id !== item.id && c.technology === item.technology)
    .slice(0, 2);
  return (
    <>
      <EditorLink item={item} profile={user.profile} />
      <Detail item={item} related={related} />
    </>
  );
}
