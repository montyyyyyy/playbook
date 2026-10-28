import { notFound } from "next/navigation";
import { Detail } from "@/components/detail";
import { contents, getContent } from "@/lib/content";
type Props = { params: Promise<{ section: string; slug: string }> };
export function generateStaticParams() {
  return contents.map((c) => ({ section: c.kind, slug: c.slug }));
}
export async function generateMetadata({ params }: Props) {
  const { section, slug } = await params;
  return { title: getContent(section, slug)?.title ?? "Nicht gefunden" };
}
export default async function DetailPage({ params }: Props) {
  const { section, slug } = await params;
  const item = getContent(section, slug);
  if (!item) notFound();
  return <Detail item={item} />;
}
