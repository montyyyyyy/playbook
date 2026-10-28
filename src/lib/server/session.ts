import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { withSession } from "./db";
export type Role = "admin" | "editor" | "viewer";
export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  account_status: "active" | "disabled";
};
export type Identity = { profile: Profile; token: string };
export class AccessError extends Error {
  constructor(
    public status: number,
    message = "Zugriff verweigert",
  ) {
    super(message);
  }
}
export async function identity(): Promise<Identity | null> {
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!session) return null;
  const profile = await withSession(
    session.session.token,
    async (db) =>
      (
        await db.query<Profile>(
          "SELECT id,display_name,role,account_status FROM public.profiles WHERE id=$1",
          [session.user.id],
        )
      ).rows[0],
  );
  return profile?.account_status === "active"
    ? { profile, token: session.session.token }
    : null;
}
export async function requireUser() {
  const user = await identity();
  if (!user) redirect("/login");
  return user;
}
export async function requireApi(roles?: Role[]) {
  const user = await identity();
  if (!user) throw new AccessError(401);
  if (roles && !roles.includes(user.profile.role)) throw new AccessError(403);
  return user;
}
