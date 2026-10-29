import Link from "next/link";
import { notFound } from "next/navigation";
import { Library } from "@/components/library";
import { Admin, Settings } from "@/components/admin";
import { sections } from "@/lib/content";
import type { Section } from "@/lib/models";
import { requireUser } from "@/lib/server/session";
import { readContents } from "@/lib/server/content";
import { withSession } from "@/lib/server/db";
type Props = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ technology?: string }>;
};
export async function generateMetadata() {
  await requireUser();
  return { title: "Workspace" };
}
export default async function SectionPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { section } = await params;
  if (section === "settings") return <Settings profile={user.profile} />;
  if (section === "admin") {
    if (user.profile.role !== "admin")
      return (
        <div className="page">
          <h1>Zugriff verweigert</h1>
          <p>Dieser Bereich ist Administratoren vorbehalten.</p>
        </div>
      );
    const data = await withSession(user.token, async (db) => ({
      users: (
        await db.query(
          "SELECT id,display_name,role,account_status FROM public.profiles ORDER BY created_at",
        )
      ).rows,
      invitations: (
        await db.query(
          "SELECT id,email,intended_role,status,expires_at FROM public.invitations ORDER BY created_at DESC LIMIT 100",
        )
      ).rows,
    }));
    return <Admin {...data} items={await readContents(user)} />;
  }
  if (!Object.hasOwn(sections, section)) notFound();
  const { technology } = await searchParams;
  return (
    <>
      {user.profile.role !== "viewer" && (
        <div className="page editor-link">
          <Link className="button secondary" href="/edit">
            Entwurf erstellen
          </Link>
        </div>
      )}
      <Library
        key={`${section}-${technology ?? ""}`}
        section={section as Section}
        contents={await readContents(user, section as Section)}
        initialTechnology={technology}
      />
    </>
  );
}
