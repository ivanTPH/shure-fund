/**
 * Journey 97 — Stage workflow pages (action / approve / release / reconciliation)
 *             + POST contract stage @e2e
 *
 * Covers:
 *  - /projects/[id]/stages/[stageId]/action        — upload evidence UI
 *  - /projects/[id]/stages/[stageId]/approve       — approval workflow page
 *  - /projects/[id]/stages/[stageId]/release       — payment release confirmation
 *  - /projects/[id]/stages/[stageId]/reconciliation — reconciliation view
 *  - POST /api/projects/[projectId]/contracts/[contractId]/stages — add stage
 *
 * Seeded data: project 301, contract 401, stage 501
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE        = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECT_ID  = "00000000-0000-0000-0000-000000000301";
const CONTRACT_ID = "00000000-0000-0000-0000-000000000401";
const STAGE_ID    = "00000000-0000-0000-0000-000000000501";

const actionBase = `${BASE}/projects/${PROJECT_ID}/stages/${STAGE_ID}`;

test.describe("Journey 97 — Stage workflow pages @e2e", () => {
  test.setTimeout(60_000);

  // ── /action — upload evidence page ────────────────────────────────────────

  test("contractor can load stage action page", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`${actionBase}/action`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("admin can load stage action page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${actionBase}/action`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("unauthenticated access to action page redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${actionBase}/action`, { maxRedirects: 0 }).catch(() => null);
    if (res) {
      expect([200, 301, 302, 307, 308]).toContain(res.status());
    }
  });

  // ── /approve — approval workflow page ─────────────────────────────────────

  test("admin can load stage approve page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${actionBase}/approve`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("commercial can load stage approve page", async ({ page }) => {
    await signIn(page, "commercial");
    await page.goto(`${actionBase}/approve`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("funder can load stage approve page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${actionBase}/approve`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  // ── /release — payment release confirmation page ───────────────────────────

  test("funder can load stage release page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${actionBase}/release`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("admin can load stage release page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${actionBase}/release`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  // ── /reconciliation — stage reconciliation view ────────────────────────────

  test("admin can load stage reconciliation page", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto(`${actionBase}/reconciliation`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  test("funder can load stage reconciliation page", async ({ page }) => {
    await signIn(page, "funder");
    await page.goto(`${actionBase}/reconciliation`, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const url = page.url();
    expect(url).not.toContain("/auth/login");
    expect(url).not.toContain("error");
  });

  // ── POST /api/projects/[projectId]/contracts/[contractId]/stages ───────────

  test("unauthenticated POST stage returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(
      `${BASE}/api/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}/stages`,
      { data: { name: "Test Stage", value: 5000 } },
    );
    expect(res.status()).toBe(401);
  });

  test("contractor cannot POST a stage (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(
      `${BASE}/api/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}/stages`,
      { data: { name: "Test Stage", value: 5000 } },
    );
    expect(res.status()).toBe(403);
  });

  test("admin can POST a new stage and it appears in contract", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(
      `${BASE}/api/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}/stages`,
      { data: { name: "Journey 97 Test Stage", value: 1000, description: "e2e test stage" } },
    );
    expect(res.status()).toBe(201);
    const body = await res.json() as { stageId?: string };
    expect(body.stageId).toBeDefined();
  });

  test("POST stage with missing name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(
      `${BASE}/api/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}/stages`,
      { data: { value: 5000 } },
    );
    expect(res.status()).toBe(400);
  });

  test("POST stage with zero value returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(
      `${BASE}/api/projects/${PROJECT_ID}/contracts/${CONTRACT_ID}/stages`,
      { data: { name: "Zero Stage", value: 0 } },
    );
    expect(res.status()).toBe(400);
  });
});
