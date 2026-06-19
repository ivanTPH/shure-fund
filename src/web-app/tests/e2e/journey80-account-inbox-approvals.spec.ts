/**
 * Journey 80 — Account PATCH, Inbox page & Approvals hub page @e2e
 *
 * Covers:
 *  - PATCH /api/account         — update user profile (full_name)
 *  - /inbox                     — notification inbox page
 *  - /approvals                 — sign-offs / approvals hub page
 *
 * PATCH /api/account:
 *  - Unauthenticated → 401
 *  - Missing full_name → 400
 *  - Empty full_name → 400
 *  - Valid full_name → 200 { ok: true }
 *
 * /inbox page:
 *  - All authenticated roles can load
 *  - Shows heading "Inbox"
 *  - Shows notifications or empty state
 *
 * /approvals page:
 *  - Admin/funder/developer can load
 *  - Shows heading "Approvals"
 *  - Shows pending sign-offs or empty state
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE         = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ACCOUNT_URL  = `${BASE}/api/account`;
const INBOX_URL    = `${BASE}/inbox`;
const APPROVALS_URL = `${BASE}/approvals`;

test.describe("Journey 80 — Account PATCH, Inbox page & Approvals hub @e2e", () => {
  test.setTimeout(60_000);

  // ── PATCH /api/account — auth ─────────────────────────────────────────────

  test("unauthenticated PATCH account returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(ACCOUNT_URL, {
      data: { full_name: "Test User" },
    });
    expect(res.status()).toBe(401);
  });

  // ── PATCH /api/account — validation ──────────────────────────────────────

  test("PATCH account without full_name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(ACCOUNT_URL, { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/full_name/i);
  });

  test("PATCH account with empty full_name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(ACCOUNT_URL, { data: { full_name: "  " } });
    expect(res.status()).toBe(400);
  });

  // ── PATCH /api/account — happy path ──────────────────────────────────────

  test("admin can update account full_name", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(ACCOUNT_URL, {
      data: { full_name: "Test Admin" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("funder can update account full_name", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.patch(ACCOUNT_URL, {
      data: { full_name: "Test Funder" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("contractor can update account full_name", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.patch(ACCOUNT_URL, {
      data: { full_name: "Test Contractor" },
    });
    expect(res.status()).toBe(200);
  });

  // ── /inbox page ──────────────────────────────────────────────────────────

  test("admin can load inbox page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(INBOX_URL);
    await expect(
      page.getByRole("heading", { name: /inbox/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load inbox page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(INBOX_URL);
    await expect(
      page.getByRole("heading", { name: /inbox/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("contractor can load inbox page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(INBOX_URL);
    await expect(
      page.getByRole("heading", { name: /inbox/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("inbox page shows notifications or empty state", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(INBOX_URL);
    await expect(
      page.getByRole("heading", { name: /inbox/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    // Either notifications are present or an empty state message
    await expect(
      page.getByText(/notification|message|action|attention|no notification|all caught up|empty/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── /approvals page ──────────────────────────────────────────────────────

  test("admin can load approvals page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(APPROVALS_URL);
    await expect(
      page.getByRole("heading", { name: /approval/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load approvals page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(APPROVALS_URL);
    await expect(
      page.getByRole("heading", { name: /approval/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("developer can load approvals page", async ({ page }) => {
    await signIn(page, "developer");
    await page.goto(APPROVALS_URL);
    await expect(
      page.getByRole("heading", { name: /approval/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("approvals page shows sign-offs or empty state", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(APPROVALS_URL);
    await expect(
      page.getByRole("heading", { name: /approval/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/approval|sign.off|pending|no approval|all done|awaiting/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
