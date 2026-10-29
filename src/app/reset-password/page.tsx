import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Passwort zurücksetzen" };
export default function Page() {
  return <AuthForm mode="reset-password" />;
}
