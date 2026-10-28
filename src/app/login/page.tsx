import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { identity } from "@/lib/server/session";
import { safeReturn } from "@/lib/redirects";
export const dynamic = "force-dynamic";
export const metadata = { title: "Anmelden" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeReturn((await searchParams).next);
  if (await identity()) redirect(next);
  return <AuthForm mode="login" next={next} />;
}
