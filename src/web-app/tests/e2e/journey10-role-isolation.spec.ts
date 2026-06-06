/**
 * Journey 10 — Role isolation and access control @e2e
 *
 * Validates that each role can only access what they are permitted to.
 * These are security tests — a failure here means a permission bypass.
 *
 * Checks:
 *   - contractor cannot see wallet or release payments
 *   - commercial cannot release payments
 *   - funder cannot submit evidence
 *   - developer cannot top up wallet
 *   - admin can access all views
 *   - unauthenticated requests are rejected
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet } from "./helpers/api";

const PROJECT_ID = "00000000-0000-0000-0000-000000000301";
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

test.describe("Journey 10 — Role isolation @e2e", () => {
  test.setTimeout(60_000);

  // ── Unauthenticated access ────────────────────────────────────────────────
  test("unauthenticated: protected pages redirect to login", async ({ page }) => {
    await page.goto("/projects");
    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test("unauthenticated: API endpoints return 401", async ({ page }) => {
    // Don't sign in — use raw request
    const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/wallet`);
    expect(res.status()).toBe(401);
  });

  // ── Contractor isolation ──────────────────────────────────────────────────
  test("contractor: cannot access wallet balance", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/wallet`);
    // Contractor is not project admin (funder_id or developer_id), so 403 or 404
    expect([403, 404]).toContain(res.status());
  });

  test("contractor: cannot deposit funds into wallet", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/wallet`, {
      headers: { "Content-Type": "application/json" },
      data: { amount: 1000, reference: "Contractor wallet test" },
    });
    expect(res.status()).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error.toLowerCase()).toMatch(/funder|permission|unauthori/i);
  });

  test("contractor: cannot release a payment", async ({ page }) => {
    await signIn(page, "contractor");

    // Find any available_to_release stage
    const contracts = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    const data = await contracts.json() as { contracts: Array<{ stages: Array<{ id: string; status: string }> }> };
    const releaseStage = data.contracts?.flatMap((c) => c.stages ?? []).find((s) => s.status === "available_to_release");

    if (!releaseStage) {
      console.log("No available_to_release stage — skipping contractor release gate test");
      return;
    }

    const res = await page.request.post(`${BASE}/api/stages/${releaseStage.id}/transition`, {
      headers: { "Content-Type": "application/json" },
      data: { action: "release" },
    });
    expect(res.status()).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error.toLowerCase()).toMatch(/role|permission|funder/i);
  });

  // ── Commercial isolation ──────────────────────────────────────────────────
  test("commercial: cannot release a payment", async ({ page }) => {
    await signIn(page, "commercial");

    // Find any available_to_release stage
    const contracts = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    const data = await contracts.json() as { contracts: Array<{ stages: Array<{ id: string; status: string }> }> };
    const releaseStage = data.contracts?.flatMap((c) => c.stages ?? []).find((s) => s.status === "available_to_release");

    if (!releaseStage) {
      console.log("No available_to_release stage — skipping commercial release gate test");
      return;
    }

    const res = await page.request.post(`${BASE}/api/stages/${releaseStage.id}/transition`, {
      headers: { "Content-Type": "application/json" },
      data: { action: "release" },
    });
    expect(res.status()).toBe(403);
  });

  test("commercial: cannot deposit into wallet", async ({ page }) => {
    await signIn(page, "commercial");
    const res = await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/wallet`, {
      headers: { "Content-Type": "application/json" },
      data: { amount: 1000, reference: "Commercial wallet test" },
    });
    expect(res.status()).toBe(403);
  });

  // ── Developer (project owner) isolation ──────────────────────────────────
  test("developer: cannot deposit into wallet (not the money source)", async ({ page }) => {
    await signIn(page, "developer");
    const res = await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/wallet`, {
      headers: { "Content-Type": "application/json" },
      data: { amount: 1000, reference: "Developer wallet test" },
    });
    // Developer can see wallet but cannot deposit — only funder can
    expect(res.status()).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error.toLowerCase()).toMatch(/funder|permission/i);
  });

  test("developer: can view project and audit log", async ({ page }) => {
    await signIn(page, "developer");
    await page.goto(`/projects/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  // ── Funder isolation ──────────────────────────────────────────────────────
  test("funder: cannot submit evidence for a stage", async ({ page }) => {
    await signIn(page, "funder");

    // Find an in_progress stage
    const contracts = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/contracts`);
    const data = await contracts.json() as { contracts: Array<{ id: string; stages: Array<{ id: string; status: string }> }> };
    const inProgressStage = data.contracts?.flatMap((c) => c.stages ?? []).find((s) => s.status === "in_progress");

    if (!inProgressStage) {
      console.log("No in_progress stage — skipping funder evidence gate test");
      return;
    }

    // Attempt to post evidence — funder is not a contractor
    const pdfBuffer = Buffer.from("%PDF-1.4 minimal");
    const formData = new FormData();
    formData.append("stageId", inProgressStage.id);
    formData.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), "test.pdf");

    const res = await page.request.post(`${BASE}/api/evidence`, {
      multipart: {
        stageId: inProgressStage.id,
        file: {
          name:     "funder-evidence-attempt.pdf",
          mimeType: "application/pdf",
          buffer:   pdfBuffer,
        },
      },
    });

    // Funder is not contractor or admin — should be rejected
    expect([403, 400]).toContain(res.status());
  });

  // ── Admin access ──────────────────────────────────────────────────────────
  test("admin: can access all key pages", async ({ page }) => {
    await signIn(page, "admin");

    const routes = [
      `/projects/${PROJECT_ID}`,
      `/projects/${PROJECT_ID}/audit`,
      `/admin/compliance`,
      `/admin/users`,
      `/audit-log`,
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 8_000 });
    }
  });

  test("admin: can read wallet balance for any project", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${BASE}/api/projects/${PROJECT_ID}/wallet`);
    expect(res.status()).toBe(200);
    const data = await res.json() as { wallet: { balance: number } };
    expect(typeof data.wallet.balance).toBe("number");
  });

  // ── Role badge shows correct label ────────────────────────────────────────
  test("each role sees correct label in the UI", async ({ page }) => {
    const roleLabelMap: Record<string, string> = {
      funder:     "Funder",
      developer:  "Project Owner",
      contractor: "Contractor",
      commercial: "Commercial",
      consultant: "Consultant",
      admin:      "Admin",
    };

    for (const [role, expectedLabel] of Object.entries(roleLabelMap)) {
      await signIn(page, role as "funder" | "developer" | "contractor" | "commercial" | "consultant" | "admin");
      await page.goto("/account");
      await page.waitForLoadState("networkidle");

      // The role badge is rendered by a client component after async auth resolves.
      // Wait for the text to appear rather than checking raw HTML immediately.
      await expect(page.locator(`text=${expectedLabel}`).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
