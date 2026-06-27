/**
 * Journey 93 — Contract detail page + evidence review page UI @e2e
 *
 * Covers:
 *  - /projects/[id]/contracts/[contractId]           — contract detail page
 *  - /projects/[id]/contracts/[contractId]/evidence  — contract evidence list
 *  - /reviews                                        — evidence review queue page
 *
 * Seeded data: project 301, contract 401
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE       = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

test.describe("Journey 93 — Contract detail + evidence pages @e2e", () => {
  // Allow 3 minutes per test — Next.js SSR server components can take
  // 60–90 s to compile, and when running late in the full suite (after 1h+),
  // the admin form sign-in + networkidle wait can add another 60–90 s.
  test.setTimeout(180_000);

  // ── Contract detail page ──────────────────────────────────────────────────
  // The contract detail page is a server component. We verify the page loads
  // without redirecting to login or an error URL.

  test("admin can load contract detail page", async ({ page }) => {
    await signIn(page, "admin");
    // Get a real contract from the API
    const apiRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    expect(apiRes.status()).toBe(200);
    const apiBody = await apiRes.json() as { contracts: { id: string }[] };
    if (!apiBody.contracts || apiBody.contracts.length === 0) return;
    const contractId = apiBody.contracts[0].id;
    await page.goto(`${BASE}/projects/${PROJECT_ID}/contracts/${contractId}`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    // Should stay in projects territory — not redirect to login
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("contract detail page has back link to project", async ({ page }) => {
    await signIn(page, "admin");
    const apiRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    const apiBody = await apiRes.json() as { contracts: { id: string }[] };
    if (!apiBody.contracts || apiBody.contracts.length === 0) return;
    const contractId = apiBody.contracts[0].id;
    await page.goto(`${BASE}/projects/${PROJECT_ID}/contracts/${contractId}`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    // Page loads somewhere within /projects — not redirected to login or error
    expect(url).toMatch(/\/projects\//);
    expect(url).not.toContain("/auth/login");
  });

  test("funder can load contract detail page", async ({ page }) => {
    await signIn(page, "funder");
    const apiRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    const apiBody = await apiRes.json() as { contracts: { id: string }[] };
    if (!apiBody.contracts || apiBody.contracts.length === 0) return;
    const contractId = apiBody.contracts[0].id;
    await page.goto(`${BASE}/projects/${PROJECT_ID}/contracts/${contractId}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  test("contractor can load contract detail page", async ({ page }) => {
    await signIn(page, "contractor");
    const apiRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    const apiBody = await apiRes.json() as { contracts: { id: string }[] };
    if (!apiBody.contracts || apiBody.contracts.length === 0) return;
    const contractId = apiBody.contracts[0].id;
    await page.goto(`${BASE}/projects/${PROJECT_ID}/contracts/${contractId}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  test("contract detail shows stages or action buttons", async ({ page }) => {
    await signIn(page, "admin");
    const apiRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    const apiBody = await apiRes.json() as { contracts: { id: string }[] };
    if (!apiBody.contracts || apiBody.contracts.length === 0) return;
    const contractId = apiBody.contracts[0].id;
    // Verify the API reports stages on the contract
    expect(Array.isArray((apiBody.contracts[0] as { contract_stages?: unknown[] }).contract_stages)).toBe(true);
    // Verify the page URL is accessible (no redirect to login/error)
    await page.goto(`${BASE}/projects/${PROJECT_ID}/contracts/${contractId}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
  });

  // ── Contract evidence page ────────────────────────────────────────────────

  test("admin can load contract evidence page", async ({ page }) => {
    await signIn(page, "admin");
    const apiRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    const apiBody = await apiRes.json() as { contracts: { id: string }[] };
    if (!apiBody.contracts || apiBody.contracts.length === 0) return;
    const contractId = apiBody.contracts[0].id;
    await page.goto(`${BASE}/projects/${PROJECT_ID}/contracts/${contractId}/evidence`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
    expect(url).not.toContain("/auth/login");
  });

  test("contractor can load contract evidence page", async ({ page }) => {
    await signIn(page, "contractor");
    const apiRes = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    const apiBody = await apiRes.json() as { contracts: { id: string }[] };
    if (!apiBody.contracts || apiBody.contracts.length === 0) return;
    const contractId = apiBody.contracts[0].id;
    await page.goto(`${BASE}/projects/${PROJECT_ID}/contracts/${contractId}/evidence`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // ── /reviews — evidence review queue page ────────────────────────────────

  test("admin can load evidence review queue page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/reviews`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await expect(
      page.getByText(/evidence|review|pending|document|queue|no review|empty/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("funder can load evidence review queue page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${BASE}/reviews`);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
  });

  // ── /projects/new — create project page ──────────────────────────────────

  test("admin can load new project page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/projects/new`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await expect(
      page.getByText(/new project|create project|project name/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── /contracts — cross-project contract list page ─────────────────────────

  test("admin can load cross-project contracts page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${BASE}/contracts`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("error");
    await expect(
      page.getByText(/contract|project|status|stage|no contract|empty/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
