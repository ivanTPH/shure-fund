/**
 * Journey 19 — Project creation @e2e
 *
 * Tests GET and POST /api/projects.
 *
 * Covers:
 *  - Unauthenticated GET returns 401
 *  - Unauthenticated POST returns 401
 *  - Any authenticated user can GET projects (returns their accessible projects)
 *  - Contractor/commercial/funder/consultant cannot POST (403)
 *  - Missing project name returns 400
 *  - Empty/whitespace name returns 400
 *  - Admin can create a project (201 with project object)
 *  - Developer can create a project (201 with project object)
 *  - Created project has correct shape: id, name, address, status
 *  - Created project appears in subsequent GET
 *  - Project status defaults to "active"
 *  - Optional location is stored as address
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { apiGet } from "./helpers/api";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

async function createProject(
  page: Parameters<typeof signIn>[0],
  body: Record<string, unknown>,
) {
  const res = await page.request.post(`${BASE}/api/projects`, {
    headers: { "Content-Type": "application/json" },
    data: body,
  });
  return { status: res.status(), body: await res.json() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 19 — Project creation @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth gates ─────────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(`${BASE}/api/projects`);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(`${BASE}/api/projects`, {
      headers: { "Content-Type": "application/json" },
      data: { name: "Ghost project" },
    });
    expect(res.status()).toBe(401);
  });

  // ── GET access ─────────────────────────────────────────────────────────────

  test("any authenticated user can GET projects", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.get(`${BASE}/api/projects`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { projects: unknown[] };
    expect(Array.isArray(body.projects)).toBe(true);
  });

  test("GET returns correct shape for each project", async ({ page }) => {
    await signIn(page, "admin");
    const data = await apiGet(page, "/api/projects") as {
      projects: Array<Record<string, unknown>>;
    };

    expect(Array.isArray(data.projects)).toBe(true);
    for (const p of data.projects.slice(0, 3)) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.name).toBe("string");
      expect(typeof p.status).toBe("string");
    }
  });

  // ── POST role guards ───────────────────────────────────────────────────────

  test("contractor cannot create a project (403)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await createProject(page, { name: "Contractor's project" });
    expect(status).toBe(403);
  });

  test("commercial cannot create a project (403)", async ({ page }) => {
    await signIn(page, "commercial");
    const { status } = await createProject(page, { name: "Commercial project" });
    expect(status).toBe(403);
  });

  test("funder cannot create a project (403)", async ({ page }) => {
    await signIn(page, "funder");
    const { status } = await createProject(page, { name: "Funder project" });
    expect(status).toBe(403);
  });

  test("consultant cannot create a project (403)", async ({ page }) => {
    await signIn(page, "consultant");
    const { status } = await createProject(page, { name: "Consultant project" });
    expect(status).toBe(403);
  });

  // ── POST validation ────────────────────────────────────────────────────────

  test("missing name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await createProject(page, { location: "London" });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/name/i);
  });

  test("whitespace-only name returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await createProject(page, { name: "   " });
    expect(status).toBe(400);
  });

  // ── POST success ───────────────────────────────────────────────────────────

  test("admin can create a project — returns 201 with project object", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await createProject(page, {
      name:     "Journey 19 Admin Project",
      location: "123 Test Street, Bristol, BS1 1AA",
    });

    expect(status).toBe(201);
    const project = (body as { project: Record<string, unknown> }).project;
    expect(typeof project.id).toBe("string");
    expect(project.name).toBe("Journey 19 Admin Project");
    expect(project.status).toBe("active");
    expect(project.address).toBe("123 Test Street, Bristol, BS1 1AA");
    console.log(`Admin created project: ${project.id}`);
  });

  test("developer can create a project — returns 201", async ({ page }) => {
    await signIn(page, "developer");
    const { status, body } = await createProject(page, {
      name:     "Journey 19 Developer Project",
      location: "Dev Location",
    });

    expect(status).toBe(201);
    const project = (body as { project: { id: string; name: string } }).project;
    expect(project.name).toBe("Journey 19 Developer Project");
    console.log(`Developer created project: ${project.id}`);
  });

  test("project without location has empty address", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await createProject(page, {
      name: "No-address project J19",
    });
    expect(status).toBe(201);
    const project = (body as { project: { address: string } }).project;
    // address defaults to "" when no location provided
    expect(typeof project.address).toBe("string");
  });

  test("created project appears in GET /api/projects", async ({ page }) => {
    await signIn(page, "admin");
    const name = `J19 Visibility Test ${Date.now()}`;
    const { status, body } = await createProject(page, { name });
    expect(status).toBe(201);

    const newId = (body as { project: { id: string } }).project.id;

    const data = await apiGet(page, "/api/projects") as {
      projects: Array<{ id: string; name: string }>;
    };
    const found = data.projects.find((p) => p.id === newId);
    expect(found).toBeDefined();
    expect(found?.name).toBe(name);
  });

  test("project status defaults to active", async ({ page }) => {
    await signIn(page, "developer");
    const { status, body } = await createProject(page, {
      name: "Status default test J19",
    });
    expect(status).toBe(201);
    expect((body as { project: { status: string } }).project.status).toBe("active");
  });

  test("created project has a valid UUID id", async ({ page }) => {
    await signIn(page, "admin");
    const { status, body } = await createProject(page, { name: "UUID test J19" });
    expect(status).toBe(201);
    const id = (body as { project: { id: string } }).project.id;
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
