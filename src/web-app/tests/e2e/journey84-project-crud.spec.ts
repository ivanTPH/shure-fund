/**
 * Journey 84 — Project CRUD: GET/PATCH /api/projects/[projectId] + GET/POST /api/projects @e2e
 *
 * Covers:
 *  - GET  /api/projects                      — list all projects
 *  - POST /api/projects                      — create project (admin/developer only)
 *  - GET  /api/projects/[projectId]          — get single project
 *  - PATCH /api/projects/[projectId]         — update project (admin/developer only)
 *
 * GET /api/projects:
 *  - Unauthenticated → 401
 *  - Any auth user → 200 { projects: [] }
 *
 * POST /api/projects:
 *  - Unauthenticated → 401
 *  - Non-admin/developer (contractor, funder, commercial) → 403
 *  - Missing name → 400
 *  - Valid → 201 { project }
 *
 * GET /api/projects/[projectId]:
 *  - Unauthenticated → 401
 *  - Valid → 200 { project: { id, name, address, status, created_at } }
 *  - Non-existent → 404
 *
 * PATCH /api/projects/[projectId]:
 *  - Unauthenticated → 401
 *  - Non-admin/developer → 403
 *  - Empty name → 400
 *  - Invalid status → 400
 *  - No fields → 400
 *  - Valid name/address/status → 200 { project }
 *
 * Seeded data: project 301
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE        = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const PROJECTS    = `${BASE}/api/projects`;
const PROJECT_ID  = "00000000-0000-0000-0000-000000000301";
const PROJECT_URL = `${PROJECTS}/${PROJECT_ID}`;

type Project = {
  id:         string;
  name:       string;
  address:    string | null;
  status:     string;
  created_at: string;
};

test.describe("Journey 84 — Project CRUD API @e2e", () => {
  test.setTimeout(60_000);

  // ── GET /api/projects — auth ───────────────────────────────────────────────

  test("unauthenticated GET /api/projects returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(PROJECTS);
    expect(res.status()).toBe(401);
  });

  // ── GET /api/projects — happy path ────────────────────────────────────────

  test("admin GET /api/projects returns 200 with projects array", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(PROJECTS);
    expect(res.status()).toBe(200);
    const body = await res.json() as { projects: Project[] };
    expect(Array.isArray(body.projects)).toBe(true);
  });

  test("projects list includes seeded project 301", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(PROJECTS);
    const body = await res.json() as { projects: Project[] };
    const found = body.projects.find((p) => p.id === PROJECT_ID);
    expect(found).toBeDefined();
  });

  test("funder can list projects", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.get(PROJECTS);
    expect(res.status()).toBe(200);
    const body = await res.json() as { projects: unknown[] };
    expect(Array.isArray(body.projects)).toBe(true);
  });

  // ── POST /api/projects — auth ─────────────────────────────────────────────

  test("unauthenticated POST /api/projects returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(PROJECTS, { data: { name: "Test" } });
    expect(res.status()).toBe(401);
  });

  test("contractor POST /api/projects returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(PROJECTS, { data: { name: "Test" } });
    expect(res.status()).toBe(403);
  });

  test("funder POST /api/projects returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.post(PROJECTS, { data: { name: "Test" } });
    expect(res.status()).toBe(403);
  });

  // ── POST /api/projects — validation ──────────────────────────────────────

  test("POST /api/projects without name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(PROJECTS, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("POST /api/projects with empty name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(PROJECTS, { data: { name: "   " } });
    expect(res.status()).toBe(400);
  });

  // ── POST /api/projects — happy path ──────────────────────────────────────

  test("admin can create a project", async ({ page }) => {
    await signIn(page, "admin");
    const name = `E2E Project ${Date.now()}`;
    const res  = await page.request.post(PROJECTS, {
      data: { name, location: "E2E Test Location" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { project: Project };
    expect(body.project.name).toBe(name);
    expect(typeof body.project.id).toBe("string");
    expect(body.project.status).toBe("active");
  });

  // ── GET /api/projects/[projectId] — auth ──────────────────────────────────

  test("unauthenticated GET project returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(PROJECT_URL);
    expect(res.status()).toBe(401);
  });

  // ── GET /api/projects/[projectId] — happy path ───────────────────────────

  test("admin can GET single project", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(PROJECT_URL);
    expect(res.status()).toBe(200);
    const body = await res.json() as { project: Project };
    expect(body.project.id).toBe(PROJECT_ID);
    expect(typeof body.project.name).toBe("string");
    expect(typeof body.project.status).toBe("string");
  });

  test("project response has expected fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(PROJECT_URL);
    const body = await res.json() as { project: Project };
    expect(body.project).toHaveProperty("id");
    expect(body.project).toHaveProperty("name");
    expect(body.project).toHaveProperty("status");
    expect(body.project).toHaveProperty("created_at");
  });

  test("GET non-existent project returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.get(`${PROJECTS}/00000000-0000-0000-0000-999999999999`);
    expect(res.status()).toBe(404);
  });

  // ── PATCH /api/projects/[projectId] — auth ────────────────────────────────

  test("unauthenticated PATCH project returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.patch(PROJECT_URL, { data: { name: "New Name" } });
    expect(res.status()).toBe(401);
  });

  test("contractor PATCH project returns 403", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.patch(PROJECT_URL, { data: { name: "New Name" } });
    expect(res.status()).toBe(403);
  });

  test("funder PATCH project returns 403", async ({ page }) => {
    await signIn(page, "funder");
    const res = await page.request.patch(PROJECT_URL, { data: { name: "New Name" } });
    expect(res.status()).toBe(403);
  });

  // ── PATCH /api/projects/[projectId] — validation ──────────────────────────

  test("PATCH with invalid status returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(PROJECT_URL, { data: { status: "invalid_status" } });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/active|on_hold|completed|cancelled/i);
  });

  test("PATCH with empty name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(PROJECT_URL, { data: { name: "" } });
    expect(res.status()).toBe(400);
  });

  test("PATCH with no fields returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(PROJECT_URL, { data: {} });
    expect(res.status()).toBe(400);
  });

  // ── PATCH /api/projects/[projectId] — happy path ──────────────────────────

  test("admin can update project address", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.patch(PROJECT_URL, {
      data: { address: `E2E Address ${Date.now()}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { project: Project };
    expect(body.project.id).toBe(PROJECT_ID);
  });

  test("admin can update project status to on_hold", async ({ page }) => {
    await signIn(page, "admin");
    // Set to on_hold then restore to active
    const res1 = await page.request.patch(PROJECT_URL, { data: { status: "on_hold" } });
    expect(res1.status()).toBe(200);
    const res2 = await page.request.patch(PROJECT_URL, { data: { status: "active" } });
    expect(res2.status()).toBe(200);
    const body = await res2.json() as { project: Project };
    expect(body.project.status).toBe("active");
  });
});
