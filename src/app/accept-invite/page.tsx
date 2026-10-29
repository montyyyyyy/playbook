import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Einladung annehmen" };
export default function Page() {
  return <AuthForm mode="accept-invite" />;
}
