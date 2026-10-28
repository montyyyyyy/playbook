import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import pg from "pg";
process.loadEnvFile(".env.local");
const db = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
await db.connect();
let count = 0;
const users = {};
const title = "RLS-test-" + randomUUID();
async function check(name, fn) {
  await fn();
  console.log("PASS " + name);
  count++;
}
async function actor(name) {
  await db.query("RESET ROLE");
  await db.query("SET LOCAL ROLE playbook_app");
  await db.query("SELECT set_config('app.session_token',$1,true)", [
    users[name]?.token ?? "",
  ]);
}
async function denied(sql, args = []) {
  await db.query("SAVEPOINT denied");
  let rejected = false;
  try {
    const r = await db.query(sql, args);
    rejected = r.rowCount === 0;
  } catch (e) {
    rejected = ["42501", "23514", "P0001"].includes(e.code);
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT denied");
    await db.query("RELEASE SAVEPOINT denied");
  }
  assert(rejected, "operation unexpectedly permitted");
}
try {
  await db.query("BEGIN");
  for (const [name, role, status] of [
    ["admin", "admin", "active"],
    ["editor", "editor", "active"],
    ["other", "editor", "active"],
    ["viewer", "viewer", "active"],
    ["disabled", "viewer", "disabled"],
  ]) {
    const id = randomUUID(),
      token = randomBytes(32).toString("hex");
    users[name] = { id, token };
    await db.query(
      'INSERT INTO public.auth_user(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [id, "Test " + name, `${randomUUID()}@example.invalid`],
    );
    await db.query(
      "INSERT INTO public.profiles(id,display_name,role,account_status) VALUES($1,$2,$3,$4)",
      [id, "Test " + name, role, status],
    );
    await db.query(
      'INSERT INTO public.auth_session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
      [randomUUID(), token, id],
    );
  }
  await actor("admin");
  const published = (
    await db.query(
      "INSERT INTO public.content_items(slug,type,title,status) VALUES($1,'article',$2,'published') RETURNING id",
      ["published-" + randomUUID(), title],
    )
  ).rows[0].id;
  await actor("editor");
  const draft = (
    await db.query(
      "INSERT INTO public.content_items(slug,type,title) VALUES($1,'article',$2) RETURNING id",
      ["draft-" + randomUUID(), title],
    )
  ).rows[0].id;
  const asset = (
    await db.query(
      "INSERT INTO public.content_assets(content_id,filename,mime_type,size,data,uploaded_by) VALUES($1,'demo.txt','text/plain',4,$2,$3) RETURNING id",
      [draft, Buffer.from("demo"), users.editor.id],
    )
  ).rows[0].id;
  await actor("");
  await check(
    "anonymous cannot read content/profiles/invitations/assets/audit",
    async () => {
      for (const table of [
        "content_items",
        "profiles",
        "invitations",
        "content_assets",
        "audit_events",
      ])
        assert.equal(
          (await db.query(`SELECT * FROM public.${table}`)).rowCount,
          0,
        );
    },
  );
  await check("anonymous cannot insert content", () =>
    denied(
      "INSERT INTO public.content_items(slug,type,title) VALUES('anonymous-test','article','no')",
    ),
  );
  await check("runtime role cannot read auth sessions", () =>
    denied("SELECT * FROM public.auth_session"),
  );
  await check("runtime role is non-owner, non-bypass", async () => {
    const r = (
      await db.query(
        "SELECT current_user,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
      )
    ).rows[0];
    assert.equal(r.current_user, "playbook_app");
    assert.equal(r.rolsuper, false);
    assert.equal(r.rolbypassrls, false);
  });
  await actor("viewer");
  await check("viewer can read published content", async () =>
    assert.equal(
      (
        await db.query("SELECT id FROM public.content_items WHERE id=$1", [
          published,
        ])
      ).rowCount,
      1,
    ),
  );
  await check("viewer cannot read drafts or their assets", async () => {
    assert.equal(
      (
        await db.query("SELECT id FROM public.content_items WHERE id=$1", [
          draft,
        ])
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await db.query("SELECT id FROM public.content_assets WHERE id=$1", [
          asset,
        ])
      ).rowCount,
      0,
    );
  });
  await check("viewer cannot modify content", () =>
    denied("UPDATE public.content_items SET title=$1 WHERE id=$2", [
      "hacked",
      published,
    ]),
  );
  await check("viewer cannot insert content", () =>
    denied(
      "INSERT INTO public.content_items(slug,type,title) VALUES('viewer-test','article','no')",
    ),
  );
  await check("viewer cannot change own role", () =>
    denied("UPDATE public.profiles SET role='admin' WHERE id=$1", [
      users.viewer.id,
    ]),
  );
  await check("viewer can change own display name", async () =>
    assert.equal(
      (
        await db.query(
          "UPDATE public.profiles SET display_name='New test name' WHERE id=$1",
          [users.viewer.id],
        )
      ).rowCount,
      1,
    ),
  );
  await check("viewer cannot manage users through function", () =>
    denied("SELECT private.manage_user($1,'admin','active')", [
      users.viewer.id,
    ]),
  );
  await actor("editor");
  await check("editor creates and edits own draft", async () =>
    assert.equal(
      (
        await db.query("UPDATE public.content_items SET title=$1 WHERE id=$2", [
          "Updated " + title,
          draft,
        ])
      ).rowCount,
      1,
    ),
  );
  await check("editor can submit review", async () =>
    assert.equal(
      (
        await db.query(
          "UPDATE public.content_items SET status='in_review' WHERE id=$1",
          [draft],
        )
      ).rowCount,
      1,
    ),
  );
  await check("editor cannot publish directly", () =>
    denied("UPDATE public.content_items SET status='published' WHERE id=$1", [
      draft,
    ]),
  );
  await check("editor cannot create published content", () =>
    denied(
      "INSERT INTO public.content_items(slug,type,title,status) VALUES('editor-publish','article','no','published')",
    ),
  );
  await check("editor cannot approve content", () =>
    denied("UPDATE public.content_items SET status='approved' WHERE id=$1", [
      draft,
    ]),
  );
  await check("editor cannot update published content", () =>
    denied("UPDATE public.content_items SET title='no' WHERE id=$1", [
      published,
    ]),
  );
  await check("editor cannot change profiles role", () =>
    denied("UPDATE public.profiles SET role='admin' WHERE id=$1", [
      users.editor.id,
    ]),
  );
  await check("editor cannot manage invitations", () =>
    denied(
      "INSERT INTO public.invitations(email,token_hash,intended_role,expires_at) VALUES('x@example.invalid',$1,'admin',now()+interval '1 hour')",
      ["a".repeat(64)],
    ),
  );
  await check("editor cannot bypass through upsert", () =>
    denied(
      "INSERT INTO public.content_items(id,slug,type,title,status) VALUES($1,'conflict','article','no','published') ON CONFLICT(id) DO UPDATE SET status='published'",
      [draft],
    ),
  );
  await actor("other");
  await check("other editor cannot read or update another draft", async () => {
    assert.equal(
      (
        await db.query("SELECT id FROM public.content_items WHERE id=$1", [
          draft,
        ])
      ).rowCount,
      0,
    );
    await denied("UPDATE public.content_items SET title='no' WHERE id=$1", [
      draft,
    ]);
  });
  await actor("admin");
  await check("admin can publish content", async () =>
    assert.equal(
      (
        await db.query(
          "UPDATE public.content_items SET status='published' WHERE id=$1",
          [draft],
        )
      ).rowCount,
      1,
    ),
  );
  await check("admin can create invitations", async () =>
    assert.equal(
      (
        await db.query(
          "INSERT INTO public.invitations(email,token_hash,intended_role,invited_by,expires_at) VALUES($1,$2,'viewer',$3,now()+interval '1 hour')",
          [`${randomUUID()}@example.invalid`, "b".repeat(64), users.admin.id],
        )
      ).rowCount,
      1,
    ),
  );
  await check("admin can manage roles and revoke old sessions", async () => {
    await db.query("SELECT private.manage_user($1,'editor','active')", [
      users.viewer.id,
    ]);
    await actor("viewer");
    assert.equal(
      (await db.query("SELECT id FROM public.content_items")).rowCount,
      0,
    );
    await actor("admin");
  });
  await check("admin can disable accounts immediately", async () => {
    await db.query("SELECT private.manage_user($1,'editor','disabled')", [
      users.editor.id,
    ]);
    await actor("editor");
    assert.equal(
      (await db.query("SELECT id FROM public.content_items")).rowCount,
      0,
    );
    await actor("admin");
  });
  await check("audit entries exist for administrative operations", async () =>
    assert(
      (
        await db.query(
          "SELECT id FROM public.audit_events WHERE target_id=$1",
          [draft],
        )
      ).rowCount > 0,
    ),
  );
  await actor("disabled");
  await check(
    "disabled account with otherwise valid session cannot read",
    async () =>
      assert.equal(
        (await db.query("SELECT * FROM public.content_items")).rowCount,
        0,
      ),
  );
  await actor("");
  await db.query("SELECT set_config('app.user_id',$1,true)", [users.admin.id]);
  await check("forged user-id setting cannot impersonate admin", async () =>
    assert.equal(
      (await db.query("SELECT * FROM public.content_items")).rowCount,
      0,
    ),
  );
  await check("forged session cannot impersonate admin", async () => {
    await db.query("SELECT set_config('app.session_token','forged',true)");
    assert.equal(
      (await db.query("SELECT * FROM public.content_items")).rowCount,
      0,
    );
  });
  await actor("viewer");
  await check(
    "non-admin cannot revoke invitations or issue resets",
    async () => {
      await denied("SELECT private.revoke_invitation($1)", [randomUUID()]);
      await denied("SELECT private.issue_reset($1,$2)", [
        users.admin.id,
        "c".repeat(64),
      ]);
    },
  );
  await db.query("RESET ROLE");
  await db.query("SET LOCAL ROLE playbook_auth");
  await check("auth service role has no content privileges", () =>
    denied("SELECT * FROM public.content_items"),
  );
  await actor("admin");
  const activeAdmins = Number(
    (
      await db.query(
        "SELECT count(*) FROM public.profiles WHERE role='admin' AND account_status='active'",
      )
    ).rows[0].count,
  );
  if (activeAdmins === 1)
    await check(
      "last active administrator cannot be disabled or demoted",
      async () => {
        await denied("SELECT private.manage_user($1,'viewer','active')", [
          users.admin.id,
        ]);
        await denied("SELECT private.manage_user($1,'admin','disabled')", [
          users.admin.id,
        ]);
      },
    );
  console.log(
    `${count} real PostgreSQL authorization tests passed; fixtures rolled back.`,
  );
} finally {
  await db.query("ROLLBACK");
  await db.end();
}
