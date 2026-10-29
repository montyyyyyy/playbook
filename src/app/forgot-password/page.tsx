import { AuthForm } from "@/components/auth-form";
import { mailConfigured } from "@/lib/server/mail";
export const dynamic = "force-dynamic";
export const metadata = { title: "Passwort vergessen" };
export default function Page() {
  return <AuthForm mode="forgot-password" mailEnabled={mailConfigured()} />;
}
