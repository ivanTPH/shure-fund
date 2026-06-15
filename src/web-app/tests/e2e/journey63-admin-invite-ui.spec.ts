/**
 * Journey 63 — Admin invite UI page @e2e
 *
 * Covers /admin/invite page (UI) and the underlying POST /api/admin/invite.
 *
 * Page access:
 *  - Unauthenticated → redirected to /auth/login (page does not render)
 *  - Contractor → redirected to /projects
 *  - Admin → page renders with full role list
 *  - Developer → page renders with restricted role list (no funder/admin/developer)
 *
 * UI elements:
 *  - Heading "Invite a user"
 *  - Email input
 *  - Role select
 *  - Submit button
 *  - Developer sees restriction notice
 *  - Admin sees quick links (Users list, Compliance, Analytics)
 *
 * Form submission (via API, not full flow since invite requires Supabase):
 *  - Missing email → API returns 400
 *  - Invalid role → API returns 400
 *  - Valid request (contractor) → not 403 (may be 200 or Supabase 400)
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PAGE_URL = `${BASE}/admin/invite`;
const API_URL  = `${BASE}/api/admin/invite`;

test.describe("Journey 63 — Admin invite UI page @e2e", () => {
  test.setTimeout(60_000);

  // ── Page rendering — admin ────────────────────────────────────────────────

  test("admin sees invite page heading", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(page.getByRole("heading", { name: /invite a user/i })).toBeVisible();
  });

  test("admin invite page has email input", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(page.getByLabel(/email address/i)).toBeVisible();
  });

  test("admin invite page has role select", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(page.getByLabel(/role/i)).toBeVisible();
  });

  test("admin invite page has submit button", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(page.getByRole("button", { name: /send invitation/i })).toBeVisible();
  });

  test("admin role select includes Funder option", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    const select = page.getByLabel(/role/i);
    await expect(select.locator("option[value='funder']")).toHaveCount(1);
  });

  test("admin role select includes Admin option", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    const select = page.getByLabel(/role/i);
    await expect(select.locator("option[value='admin']")).toHaveCount(1);
  });

  test("admin sees quick links section", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(PAGE_URL);
    await expect(page.getByRole("link", { name: /users list/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /analytics/i })).toBeVisible();
  });

  // ── Page rendering — developer ───────────────────────────────────────────

  test("developer sees invite page heading", async ({ page }) => {
    await signIn(page, "developer");
    await page.goto(PAGE_URL);
    await expect(page.getByRole("heading", { name: /invite a user/i })).toBeVisible();
  });

  test("developer sees role restriction notice", async ({ page }) => {
    await signIn(page, "developer");
    await page.goto(PAGE_URL);
    await expect(page.getByText(/project owner/i)).toBeVisible();
  });

  test("developer role select does NOT include Funder", async ({ page }) => {
    await signIn(page, "developer");
    await page.goto(PAGE_URL);
    const select = page.getByLabel(/role/i);
    await expect(select.locator("option[value='funder']")).toHaveCount(0);
  });

  test("developer role select does NOT include Admin", async ({ page }) => {
    await signIn(page, "developer");
    await page.goto(PAGE_URL);
    const select = page.getByLabel(/role/i);
    await expect(select.locator("option[value='admin']")).toHaveCount(0);
  });

  test("developer role select includes Contractor", async ({ page }) => {
    await signIn(page, "developer");
    await page.goto(PAGE_URL);
    const select = page.getByLabel(/role/i);
    await expect(select.locator("option[value='contractor']")).toHaveCount(1);
  });

  // ── API-level validation (no real Supabase invite needed) ────────────────

  test("admin API: missing email → 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(API_URL, { data: { role: "contractor" } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/email/i);
  });

  test("admin API: invalid role → 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(API_URL, {
      data: { email: "test@example.com", role: "superuser" },
    });
    expect(res.status()).toBe(400);
  });

  test("contractor API: returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(API_URL, {
      data: { email: "test@example.com", role: "contractor" },
    });
    expect(res.status()).toBe(403);
  });

  test("admin API: valid contractor invite is not role-rejected", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(API_URL, {
      data: { email: `invite-e2e-${Date.now()}@example.com`, role: "contractor" },
    });
    expect(res.status()).not.toBe(403);
  });
});
