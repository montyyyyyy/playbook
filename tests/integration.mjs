import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
process.loadEnvFile(".env.local");
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const origin = new URL(base).origin;
const db = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
await db.connect();
const ids = [],
  contentIds = [],
  inviteIds = [];
const accounts = {};
let passed = 0;
// This suite runs only against the isolated development/test branch. Clear
// persistent limiter state so interrupted or repeated runs stay deterministic.
await db.query("DELETE FROM public.auth_rate_limit");
await db.query("DELETE FROM private.request_limits");
async function request(
  path,
  { method = "GET", body, cookie, requestOrigin = origin, headers = {} } = {},
) {
  return fetch(base + path, {
    method,
    redirect: "manual",
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(method !== "GET" ? { Origin: requestOrigin } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function check(name, fn) {
  await fn();
  console.log("PASS " + name);
  passed++;
}
async function login(name) {
  const a = accounts[name];
  let r = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: { email: a.email, password: a.password },
  });
  if (r.status === 429) {
    console.log("Login rate limit active; waiting for the normal window.");
    await new Promise((resolve) => setTimeout(resolve, 60000));
    r = await request("/api/auth/sign-in/email", {
      method: "POST",
      body: { email: a.email, password: a.password },
    });
  }
  assert.equal(r.status, 200, "login " + name);
  a.cookie = r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  assert(a.cookie.includes("session_token"));
  return a.cookie;
}
try {
  for (const [name, role] of [
    ["admin", "admin"],
    ["editor", "editor"],
    ["viewer", "viewer"],
  ]) {
    const id = randomUUID(),
      email = `security-${id}@example.invalid`,
      password = randomBytes(20).toString("base64url") + "aA1!";
    ids.push(id);
    accounts[name] = { id, email, password };
    await db.query(
      'INSERT INTO public.auth_user(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [id, "Test " + name, email],
    );
    await db.query(
      "INSERT INTO public.profiles(id,display_name,role) VALUES($1,$2,$3)",
      [id, "Test " + name, role],
    );
    await db.query(
      'INSERT INTO public.auth_account(id,"accountId","providerId","userId",password) VALUES($1,$2,\'credential\',$3,$4)',
      [randomUUID(), id, id, await hashPassword(password)],
    );
  }
  await check(
    "anonymous pages redirect without content, including RSC",
    async () => {
      for (const path of [
        "/",
        "/knowledge",
        "/knowledge/emarsys-web-channel",
        "/templates",
        "/workshops",
        "/architecture",
        "/use-cases",
        "/admin",
        "/settings",
        "/edit",
      ]) {
        const r = await request(path, { headers: { RSC: "1" } });
        assert([307, 303].includes(r.status), path);
        assert(r.headers.get("location").includes("/login"));
        assert(!(await r.text()).includes("Emarsys Web Channel Integration"));
      }
    },
  );
  await check("anonymous APIs and legacy downloads denied", async () => {
    for (const path of [
      "/api/content",
      "/api/search?q=Emarsys",
      "/api/admin/users",
      "/api/assets/" + randomUUID(),
      "/downloads/implementation-checklist.csv",
    ])
      assert.equal((await request(path)).status, 401, path);
  });
  await check("forged session cookie cannot access content", async () =>
    assert.equal(
      (
        await request("/api/content", {
          cookie: "better-auth.session_token=forged",
        })
      ).status,
      401,
    ),
  );
  await check("public signup API disabled", async () =>
    assert.equal(
      (
        await request("/api/auth/sign-up/email", {
          method: "POST",
          body: {
            name: "Test",
            email: "no@example.invalid",
            password: "irrelevant",
          },
        })
      ).status,
      404,
    ),
  );
  for (const name of Object.keys(accounts)) await login(name);
  const admin = accounts.admin.cookie,
    editor = accounts.editor.cookie,
    viewer = accounts.viewer.cookie;
  await check("real authenticated dashboard and modules render", async () => {
    for (const path of [
      "/",
      "/knowledge",
      "/templates",
      "/workshops",
      "/architecture",
      "/use-cases",
      "/settings",
    ]) {
      const r = await request(path, { cookie: viewer });
      assert.equal(r.status, 200, path);
      const html = await r.text();
      assert(!html.includes("NEXT_REDIRECT"), path);
      assert(r.headers.get("cache-control").includes("no-store"));
    }
  });
  await check("viewer cannot access admin API", async () =>
    assert.equal(
      (await request("/api/admin/users", { cookie: viewer })).status,
      403,
    ),
  );
  const input = {
    slug: "test-" + randomUUID(),
    type: "article",
    title: "Security integration test",
    description: "Synthetic only",
    body: "Secret draft marker " + randomUUID(),
    technology: "Test",
    category: "Test",
    tags: [],
    status: "draft",
    technical_status: "current",
    source_reference: "Automated synthetic security test",
  };
  await check("viewer cannot create content", async () =>
    assert.equal(
      (
        await request("/api/content", {
          method: "POST",
          cookie: viewer,
          body: input,
        })
      ).status,
      403,
    ),
  );
  let contentId;
  await check("editor can create draft", async () => {
    const r = await request("/api/content", {
      method: "POST",
      cookie: editor,
      body: input,
    });
    assert.equal(r.status, 200);
    contentId = (await r.json()).id;
    contentIds.push(contentId);
  });
  await check("viewer search and listing cannot reveal drafts", async () => {
    for (const path of ["/api/content", "/api/search?q=Security"])
      assert(
        !(await (await request(path, { cookie: viewer })).text()).includes(
          input.body,
        ),
      );
  });
  await check(
    "editor cannot publish or change user roles through API",
    async () => {
      assert.equal(
        (
          await request("/api/content", {
            method: "PATCH",
            cookie: editor,
            body: { ...input, id: contentId, status: "published" },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request("/api/admin/users", {
            method: "PATCH",
            cookie: editor,
            body: { id: accounts.editor.id, role: "admin", status: "active" },
          })
        ).status,
        403,
      );
    },
  );
  await check("CSRF mutation rejected", async () =>
    assert.equal(
      (
        await request("/api/content", {
          method: "POST",
          cookie: admin,
          body: input,
          requestOrigin: "https://evil.invalid",
        })
      ).status,
      403,
    ),
  );
  await check("profile cannot carry privileged fields", async () =>
    assert.equal(
      (
        await request("/api/profile", {
          method: "PATCH",
          cookie: viewer,
          body: { display_name: "Test", role: "admin" },
        })
      ).status,
      400,
    ),
  );
  let assetId;
  await check("private asset upload and authorization", async () => {
    const f = new FormData();
    f.set("content_id", contentId);
    f.set(
      "file",
      new Blob(["synthetic file"], { type: "text/plain" }),
      "private-test.txt",
    );
    const r = await fetch(base + "/api/assets", {
      method: "POST",
      headers: { Cookie: editor, Origin: origin },
      body: f,
    });
    assert.equal(r.status, 200);
    assetId = (await r.json()).id;
    assert.equal((await request("/api/assets/" + assetId)).status, 401);
    assert.equal(
      (await request("/api/assets/" + assetId, { cookie: viewer })).status,
      404,
    );
    assert.equal(
      (await request("/api/assets/" + assetId, { cookie: editor })).status,
      200,
    );
  });
  await check(
    "admin can publish, then viewer can read and download",
    async () => {
      assert.equal(
        (
          await request("/api/content", {
            method: "PATCH",
            cookie: admin,
            body: { ...input, id: contentId, status: "published" },
          })
        ).status,
        200,
      );
      assert(
        (
          await (await request("/api/content", { cookie: viewer })).text()
        ).includes(input.body),
      );
      assert.equal(
        (await request("/api/assets/" + assetId, { cookie: viewer })).status,
        200,
      );
    },
  );
  let inviteLink,
    inviteEmail = `invite-${randomUUID()}@example.invalid`;
  await check("admin issues manual invite without mail service", async () => {
    const r = await request("/api/admin/invitations", {
      method: "POST",
      cookie: admin,
      body: { email: inviteEmail, role: "viewer" },
    });
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.delivery, "manual");
    inviteLink = data.link;
    const inv = await db.query(
      "SELECT id,token_hash FROM public.invitations WHERE email=$1",
      [inviteEmail],
    );
    inviteIds.push(inv.rows[0].id);
    assert.equal(
      inv.rows[0].token_hash,
      createHash("sha256")
        .update(
          new URLSearchParams(new URL(inviteLink).hash.slice(1)).get("token"),
        )
        .digest("hex"),
    );
  });
  const inviteToken = new URLSearchParams(
    new URL(inviteLink).hash.slice(1),
  ).get("token");
  const invitedPassword = randomBytes(20).toString("base64url");
  await check("invite creates real identity and cannot be reused", async () => {
    const data = {
      token: inviteToken,
      name: "Test invited",
      password: invitedPassword,
    };
    assert.equal(
      (await request("/api/invitations/accept", { method: "POST", body: data }))
        .status,
      200,
    );
    const id = (
      await db.query("SELECT id FROM public.auth_user WHERE email=$1", [
        inviteEmail,
      ])
    ).rows[0].id;
    ids.push(id);
    accounts.invited = { id, email: inviteEmail, password: invitedPassword };
    assert.equal(
      (await request("/api/invitations/accept", { method: "POST", body: data }))
        .status,
      400,
    );
    await login("invited");
  });
  await check("expired and revoked invitations are rejected", async () => {
    for (const mode of ["expired", "revoked"]) {
      const email = `${mode}-${randomUUID()}@example.invalid`;
      const r = await request("/api/admin/invitations", {
        method: "POST",
        cookie: admin,
        body: { email, role: "viewer" },
      });
      assert.equal(r.status, 200);
      const token = new URLSearchParams(
        new URL((await r.json()).link).hash.slice(1),
      ).get("token");
      const id = (
        await db.query("SELECT id FROM public.invitations WHERE email=$1", [
          email,
        ])
      ).rows[0].id;
      inviteIds.push(id);
      if (mode === "expired")
        await db.query(
          "UPDATE public.invitations SET expires_at=now()-interval '1 second' WHERE id=$1",
          [id],
        );
      else
        assert.equal(
          (
            await request("/api/admin/invitations", {
              method: "DELETE",
              cookie: admin,
              body: { id },
            })
          ).status,
          200,
        );
      assert.equal(
        (
          await request("/api/invitations/accept", {
            method: "POST",
            body: { token, name: "Test expired", password: invitedPassword },
          })
        ).status,
        400,
      );
    }
  });
  await check("auth origin check rejects cross-site sign-in", async () => {
    assert.equal(
      (
        await request("/api/auth/sign-in/email", {
          method: "POST",
          requestOrigin: "https://evil.invalid",
          body: {
            email: accounts.admin.email,
            password: accounts.admin.password,
          },
        })
      ).status,
      403,
    );
  });
  await check("invalid invitation rejected", async () =>
    assert.equal(
      (
        await request("/api/invitations/accept", {
          method: "POST",
          body: {
            token: "f".repeat(64),
            name: "Test",
            password: invitedPassword,
          },
        })
      ).status,
      400,
    ),
  );
  await check(
    "admin reset uses Better Auth and revokes existing sessions",
    async () => {
      const r = await request("/api/admin/reset", {
        method: "POST",
        cookie: admin,
        body: { id: accounts.invited.id },
      });
      assert.equal(r.status, 200);
      const resetLink = (await r.json()).link;
      const token = new URLSearchParams(new URL(resetLink).hash.slice(1)).get(
        "token",
      );
      const newPassword = randomBytes(20).toString("base64url");
      const reset = await request("/api/auth/reset-password", {
        method: "POST",
        body: { token, newPassword },
      });
      assert.equal(reset.status, 200);
      assert.equal(
        (await request("/api/content", { cookie: accounts.invited.cookie }))
          .status,
        401,
      );
      assert.equal(
        (
          await request("/api/auth/reset-password", {
            method: "POST",
            body: { token, newPassword },
          })
        ).status,
        400,
      );
      accounts.invited.password = newPassword;
      await login("invited");
    },
  );
  await check("disabled user loses access with existing cookie", async () => {
    assert.equal(
      (
        await request("/api/admin/users", {
          method: "PATCH",
          cookie: admin,
          body: { id: accounts.viewer.id, role: "viewer", status: "disabled" },
        })
      ).status,
      200,
    );
    assert.equal(
      (await request("/api/content", { cookie: viewer })).status,
      401,
    );
  });
  await check("logout invalidates session", async () => {
    assert.equal(
      (
        await request("/api/auth/sign-out", {
          method: "POST",
          cookie: editor,
          body: {},
        })
      ).status,
      200,
    );
    assert.equal(
      (await request("/api/content", { cookie: editor })).status,
      401,
    );
  });
  await check("recovery is neutral without mail claims", async () => {
    for (const email of [accounts.admin.email, "absent@example.invalid"])
      assert.equal(
        (await request("/api/recovery", { method: "POST", body: { email } }))
          .status,
        200,
      );
  });
  console.log(
    `${passed} application integration checks passed against real Better Auth and Neon.`,
  );
} finally {
  await db.query("DELETE FROM public.auth_rate_limit");
  await db.query("DELETE FROM private.request_limits");
  await db.query(
    "DELETE FROM public.audit_events WHERE actor_id=ANY($1::uuid[]) OR target_id=ANY($2::uuid[])",
    [ids, [...ids, ...contentIds, ...inviteIds]],
  );
  await db.query("DELETE FROM public.content_items WHERE id=ANY($1::uuid[])", [
    contentIds,
  ]);
  await db.query(
    "DELETE FROM public.invitations WHERE invited_by=ANY($1::uuid[]) OR id=ANY($2::uuid[])",
    [ids, inviteIds],
  );
  await db.query(
    "DELETE FROM public.auth_verification WHERE value=ANY($1::text[])",
    [ids],
  );
  await db.query("DELETE FROM public.auth_user WHERE id=ANY($1::uuid[])", [
    ids,
  ]);
  await db.end();
}
