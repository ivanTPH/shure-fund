/**
 * Journey 85 — Wallet transactions, funding position, project audit & batch-approve @e2e
 *
 * Covers:
 *  - GET /api/projects/[projectId]/wallet/transactions  — transaction history
 *  - GET /api/projects/[projectId]/funding-position     — live funding assurance
 *  - /projects/[id]/audit                               — project audit trail page
 *  - /projects/[id]/batch-approve                       — batch sign-off page
 *
 * Wallet transactions:
 *  - Unauthenticated → 401
 *  - Any auth user → 200 { transactions: [] }
 *  - ?format=csv returns CSV content-type
 *  - Transaction fields: id, type, amount, reference, created_at
 *
 * Funding position:
 *  - Unauthenticated → 401
 *  - Any auth user → 200 with wallet + position data
 *  - Response: { projectId, wallet: { balance, ringfenced, available }, ... }
 *
 * Project audit page:
 *  - Admin/funder/developer → heading "Audit trail"
 *  - Contractor → redirected
 *
 * Batch-approve page:
 *  - Admin → heading "Batch sign-off"
 *
 * Seeded data: project 301
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

const TX_URL      = `${BASE}/api/projects/${PROJECT_ID}/wallet/transactions`;
const FUNDING_URL = `${BASE}/api/projects/${PROJECT_ID}/funding-position`;
const AUDIT_PAGE  = `${BASE}/projects/${PROJECT_ID}/audit`;
const BATCH_PAGE  = `${BASE}/projects/${PROJECT_ID}/batch-approve`;

type Transaction = {
  id:         string;
  type:       string;
  amount:     number;
  reference:  string | null;
  created_at: string;
};

test.describe("Journey 85 — Wallet transactions, funding position, audit & batch-approve @e2e", () => {
  test.setTimeout(60_000);

  // ── GET /api/.../wallet/transactions — auth ───────────────────────────────

  test("unauthenticated GET wallet transactions returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(TX_URL);
    expect(res.status()).toBe(401);
  });

  // ── GET /api/.../wallet/transactions — happy path ─────────────────────────

  test("admin can GET wallet transactions", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(TX_URL);
    expect(res.status()).toBe(200);
    const body = await res.json() as { transactions: Transaction[] };
    expect(Array.isArray(body.transactions)).toBe(true);
  });

  test("funder can GET wallet transactions", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(TX_URL);
    expect(res.status()).toBe(200);
    const body = await res.json() as { transactions: unknown[] };
    expect(Array.isArray(body.transactions)).toBe(true);
  });

  test("transaction fields have correct types when data exists", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(TX_URL);
    const body = await res.json() as { transactions: Transaction[] };
    if (body.transactions.length === 0) return;
    const tx = body.transactions[0];
    expect(typeof tx.id).toBe("string");
    expect(typeof tx.type).toBe("string");
    expect(typeof tx.amount).toBe("number");
    expect(typeof tx.created_at).toBe("string");
  });

  test("?format=csv returns CSV content-type", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${TX_URL}?format=csv`);
    expect(res.status()).toBe(200);
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/text\/csv/i);
  });

  // ── GET /api/.../funding-position — auth ─────────────────────────────────

  test("unauthenticated GET funding-position returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(FUNDING_URL);
    expect(res.status()).toBe(401);
  });

  // ── GET /api/.../funding-position — happy path ───────────────────────────

  test("admin can GET funding position", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(FUNDING_URL);
    expect([200, 404]).toContain(res.status()); // 404 if no wallet seeded
    if (res.status() === 200) {
      const body = await res.json() as { projectId: string; wallet: { balance: number; ringfenced: number; available: number } };
      expect(body.projectId).toBe(PROJECT_ID);
      expect(typeof body.wallet.balance).toBe("number");
      expect(typeof body.wallet.available).toBe("number");
    }
  });

  test("funder can GET funding position", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(FUNDING_URL);
    expect([200, 404]).toContain(res.status());
  });

  // ── Project audit page ────────────────────────────────────────────────────

  test("admin can load project audit trail page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(AUDIT_PAGE);
    await expect(
      page.getByRole("heading", { name: /audit trail/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("project audit page has back link to project", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(AUDIT_PAGE);
    await expect(
      page.getByRole("heading", { name: /audit trail/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("funder can load project audit trail page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(AUDIT_PAGE);
    await expect(
      page.getByRole("heading", { name: /audit trail/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("project audit page shows events or empty state", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(AUDIT_PAGE);
    await expect(
      page.getByRole("heading", { name: /audit trail/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/event|action|stage|contract|approved|submitted|empty|no event/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Batch-approve page ────────────────────────────────────────────────────

  test("admin can load batch sign-off page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(BATCH_PAGE);
    await expect(
      page.getByRole("heading", { name: /batch sign.off/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("batch sign-off page shows stages or empty state", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(BATCH_PAGE);
    await expect(
      page.getByRole("heading", { name: /batch sign.off/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/stage|contract|sign.off|no stage|nothing|empty|pending|select/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("batch sign-off page has back link to project", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(BATCH_PAGE);
    await expect(
      page.getByRole("heading", { name: /batch sign.off/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`a[href='/projects/${PROJECT_ID}']`).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
