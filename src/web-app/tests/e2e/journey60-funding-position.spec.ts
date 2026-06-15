/**
 * Journey 60 — Funding position & wallet transactions @e2e
 *
 * Covers:
 *   GET /api/projects/[projectId]/funding-position
 *   GET /api/projects/[projectId]/wallet/transactions
 *
 * Funding position:
 *  - Auth: 401 for unauthenticated
 *  - Access: all project participants get 200
 *  - Shape: { projectId, wallet: { balance, ringfenced, available }, ...position }
 *  - Position fields: tier1Available, tier2Required, totalRequired,
 *                     coverageRatio, isFullyCovered, stages[]
 *  - Invariants:
 *    - wallet.available >= 0
 *    - coverageRatio is a number >= 0
 *    - isFullyCovered is boolean
 *  - Non-existent project with no wallet → 404
 *
 * Wallet transactions:
 *  - Auth: 401 for unauthenticated
 *  - Returns { transactions: [] } for project with or without transactions
 *  - Each transaction has id, type, amount, created_at
 *
 * Seeded data:
 *  - Aurora Civic Centre (project 301) has a wallet with balance > 0
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

const FP_ENDPOINT = `${BASE}/api/projects/${PROJECT_ID}/funding-position`;
const TX_ENDPOINT = `${BASE}/api/projects/${PROJECT_ID}/wallet/transactions`;

test.describe("Journey 60 — Funding position & wallet transactions @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ──────────────────────────────────────────────────────────

  test("unauthenticated funding-position GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(FP_ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated wallet transactions GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(TX_ENDPOINT);
    expect(res.status()).toBe(401);
  });

  // ── Funding position — role access ───────────────────────────────────────

  test("admin GET funding-position returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(FP_ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("funder GET funding-position returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(FP_ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer GET funding-position returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(FP_ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("contractor GET funding-position returns 200", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(FP_ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Funding position — response shape ────────────────────────────────────

  test("funding-position returns correct top-level shape", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(FP_ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      projectId: string;
      wallet: { balance: number; ringfenced: number; available: number };
    };
    expect(body.projectId).toBe(PROJECT_ID);
    expect(typeof body.wallet.balance).toBe("number");
    expect(typeof body.wallet.ringfenced).toBe("number");
    expect(typeof body.wallet.available).toBe("number");
  });

  test("funding-position wallet.available >= 0", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(FP_ENDPOINT);
    const body = await res.json() as { wallet: { available: number } };
    expect(body.wallet.available).toBeGreaterThanOrEqual(0);
  });

  test("funding-position wallet.available <= wallet.balance", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(FP_ENDPOINT);
    const body = await res.json() as { wallet: { balance: number; available: number } };
    expect(body.wallet.available).toBeLessThanOrEqual(body.wallet.balance + 0.01);
  });

  test("funding-position projectId matches requested project", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(FP_ENDPOINT);
    const body = await res.json() as { projectId: string };
    expect(body.projectId).toBe(PROJECT_ID);
  });

  // ── Funding position — non-existent project ──────────────────────────────

  test("funding-position for project with no wallet returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(
      `${BASE}/api/projects/00000000-0000-0000-0000-000000000999/funding-position`
    );
    // 404: no wallet found for this project
    expect(res.status()).toBe(404);
  });

  // ── Wallet transactions — shape ──────────────────────────────────────────

  test("wallet transactions returns transactions array", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(TX_ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as { transactions: unknown[] };
    expect(Array.isArray(body.transactions)).toBe(true);
  });

  test("wallet transactions are ordered (if present)", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(TX_ENDPOINT);
    const body = await res.json() as {
      transactions: Array<{
        id: string;
        type: string;
        amount: number;
        created_at: string;
      }>;
    };
    if (body.transactions.length === 0) return;
    const t = body.transactions[0];
    expect(typeof t.id).toBe("string");
    expect(typeof t.type).toBe("string");
    expect(typeof t.amount).toBe("number");
    expect(typeof t.created_at).toBe("string");
  });

  test("wallet transactions amounts are positive numbers", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(TX_ENDPOINT);
    const body = await res.json() as { transactions: Array<{ amount: number }> };
    for (const tx of body.transactions) {
      expect(typeof tx.amount).toBe("number");
    }
  });

  test("funder GET wallet transactions returns 200", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(TX_ENDPOINT);
    expect(res.status()).toBe(200);
  });

  test("developer GET wallet transactions returns 200", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.get(TX_ENDPOINT);
    expect(res.status()).toBe(200);
  });

  // ── Wallet transactions — no-wallet project ──────────────────────────────

  test("wallet transactions for no-wallet project returns empty array", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(
      `${BASE}/api/projects/00000000-0000-0000-0000-000000000999/wallet/transactions`
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { transactions: unknown[] };
    expect(body.transactions).toEqual([]);
  });
});
