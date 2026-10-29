import "server-only";
import { betterAuth, APIError } from "better-auth";
import { authPool, required } from "./db";
import { sendAccountMail } from "./mail";
function createAuth() {
  const baseURL = required("BETTER_AUTH_URL");
  const origin = new URL(baseURL).origin;
  if (process.env.VERCEL_ENV === "production") {
    if (origin !== "https://playbook.mesta.digital")
      throw new Error(
        "Setup erforderlich: BETTER_AUTH_URL stimmt nicht mit der Production-Domain überein.",
      );
  } else if (
    process.env.VERCEL_ENV === "preview" &&
    origin === "https://playbook.mesta.digital"
  ) {
    throw new Error(
      "Setup erforderlich: Preview darf nicht den Production-Auth-Origin verwenden.",
    );
  }
  if (process.env.VERCEL_ENV && !baseURL.startsWith("https://"))
    throw new Error("Setup erforderlich: Vercel-Auth benötigt HTTPS.");
  return betterAuth({
    appName: "CX Playbook",
    baseURL,
    secret: required("BETTER_AUTH_SECRET"),
    database: authPool(),
    trustedOrigins: [origin],
    user: { modelName: "auth_user" },
    account: { modelName: "auth_account", accountLinking: { enabled: false } },
    verification: { modelName: "auth_verification" },
    session: {
      modelName: "auth_session",
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 30,
      cookieCache: { enabled: false },
    },
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: baseURL.startsWith("https://"),
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAccountMail(
          user.email,
          "CX Playbook – Passwort zurücksetzen",
          `Setze dein Passwort über diesen Link zurück:\n\n${url}\n\nWenn du dies nicht angefordert hast, ignoriere diese E-Mail.`,
        );
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "auth_rate_limit",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 300, max: 3 },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const result = await authPool().query(
              "SELECT private.user_active($1::uuid) AS active",
              [session.userId],
            );
            if (!result.rows[0].active)
              throw new APIError("FORBIDDEN", {
                message: "Anmeldung nicht möglich.",
              });
            return { data: session };
          },
        },
      },
    },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
