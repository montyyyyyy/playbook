import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturn } from "../src/lib/redirects";
for (const input of [
  "https://evil.invalid",
  "//evil.invalid",
  "/\\evil.invalid",
  "/%2f%2fevil.invalid",
  "/%5cevil.invalid",
  "/\nevil.invalid",
  "/api/auth/sign-out",
  "/login",
  undefined,
])
  test(`reject unsafe redirect ${String(input)}`, () =>
    assert.equal(safeReturn(input), "/"));
for (const input of [
  "/knowledge",
  "/knowledge?technology=Emarsys",
  "/templates/demo#sources",
])
  test(`preserve internal redirect ${input}`, () =>
    assert.equal(safeReturn(input), input));
