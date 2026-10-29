import { Shell } from "@/components/shell";
import { requireUser } from "@/lib/server/session";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();
  return <Shell profile={profile}>{children}</Shell>;
}
