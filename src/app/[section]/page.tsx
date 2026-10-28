import { notFound } from "next/navigation";
import { Library } from "@/components/library";
import { Admin, Settings } from "@/components/admin";
import { sections } from "@/lib/content";
import type { Section } from "@/lib/models";
type Props = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ technology?: string }>;
};
export async function generateMetadata({ params }: Props) {
  const { section } = await params;
  return {
    title:
      section === "admin"
        ? "Administration"
        : section === "settings"
          ? "Settings"
          : (sections[section as Section]?.title ?? "Nicht gefunden"),
  };
}
export default async function SectionPage({ params, searchParams }: Props) {
  const { section } = await params;
  if (section === "admin") return <Admin />;
  if (section === "settings") return <Settings />;
  if (!Object.hasOwn(sections, section)) notFound();
  const { technology } = await searchParams;
  return (
    <Library
      key={`${section}-${technology ?? ""}`}
      section={section as Section}
      initialTechnology={technology}
    />
  );
}
