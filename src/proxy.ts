import { NextResponse, type NextRequest } from "next/server";
import { safeReturn } from "@/lib/redirects";
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicPage = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/accept-invite",
  ].includes(path);
  const authApi =
    path.startsWith("/api/auth/") ||
    path === "/api/invitations/accept" ||
    path === "/api/recovery";
  const hasCookie = !!(
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token")
  );
  let response: NextResponse;
  if (!publicPage && !authApi && !hasCookie) {
    if (path.startsWith("/api/") || path.startsWith("/downloads/"))
      response = NextResponse.json(
        { error: "Anmeldung erforderlich." },
        { status: 401 },
      );
    else {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", safeReturn(path + request.nextUrl.search));
      response = NextResponse.redirect(url);
    }
  } else response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
