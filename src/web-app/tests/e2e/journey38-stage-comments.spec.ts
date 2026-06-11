/**
 * Journey 38 — Stage comments / internal notes @e2e
 *
 * Covers GET/POST /api/stages/[stageId]/comments and
 *        DELETE   /api/stages/[stageId]/comments/[commentId]:
 *
 * Auth guards:
 *  - Unauthenticated GET → 401
 *  - Unauthenticated POST → 401
 *  - Any authenticated role can read comments
 *  - Any authenticated role can post comments
 *
 * POST validation:
 *  - Missing content → 400
 *  - Empty content → 400
 *  - Content > 2000 chars → 400
 *
 * POST success:
 *  - Admin posts comment → 201
 *  - Funder posts comment → 201
 *  - Response has comment.id, content, createdAt, author
 *
 * GET shape:
 *  - Returns comments[] with id, content, createdAt, author.name, author.role
 *  - Comments are sorted oldest-first
 *
 * DELETE:
 *  - Non-existent comment → 404
 *  - Another user's comment by non-admin → 403
 *  - Author can delete own comment → 200
 *  - Comment is gone from GET after deletion
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const STAGE_ID = "00000000-0000-0000-0000-000000000504"; // seeded stage

const ENDPOINT = `${BASE}/api/stages/${STAGE_ID}/comments`;

let adminCommentId  = "";
let funderCommentId = "";

test.describe("Journey 38 — Stage comments @e2e", () => {
  test.setTimeout(60_000);

  // ── Auth guards ────────────────────────────────────────────────────────────

  test("unauthenticated GET returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(ENDPOINT, { data: { content: "test" } });
    expect(res.status()).toBe(401);
  });

  // ── POST validation ────────────────────────────────────────────────────────

  test("POST without content returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("POST with empty content returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { content: "   " } });
    expect(res.status()).toBe(400);
  });

  test("POST with content > 2000 chars returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(ENDPOINT, { data: { content: "x".repeat(2001) } });
    expect(res.status()).toBe(400);
  });

  // ── POST success ───────────────────────────────────────────────────────────

  test("admin can post a comment (201)", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.post(ENDPOINT, {
      data: { content: "E2E admin note — stage looks good" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as {
      comment: { id: string; content: string; createdAt: string; author: { name: string; role: string } };
    };
    expect(body.comment.id).toBeTruthy();
    expect(body.comment.content).toBe("E2E admin note — stage looks good");
    expect(typeof body.comment.createdAt).toBe("string");
    expect(typeof body.comment.author.name).toBe("string");
    adminCommentId = body.comment.id;
  });

  test("funder can post a comment (201)", async ({ page }) => {
    await signIn(page, "funder");
    const res  = await page.request.post(ENDPOINT, {
      data: { content: "E2E funder note — release approved" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { comment: { id: string } };
    expect(body.comment.id).toBeTruthy();
    funderCommentId = body.comment.id;
  });

  test("contractor can post a comment (201)", async ({ page }) => {
    await signIn(page, "contractor");
    const res = await page.request.post(ENDPOINT, {
      data: { content: "E2E contractor note — work complete" },
    });
    expect(res.status()).toBe(201);
  });

  // ── GET shape ──────────────────────────────────────────────────────────────

  test("GET returns comments array with required fields", async ({ page }) => {
    await signIn(page, "admin");
    const res  = await page.request.get(ENDPOINT);
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      comments: Array<{
        id: string; content: string; createdAt: string;
        author: { id: string; name: string; role: string | null };
      }>;
    };
    expect(Array.isArray(body.comments)).toBe(true);
    if (body.comments.length > 0) {
      const c = body.comments[0];
      expect(typeof c.id).toBe("string");
      expect(typeof c.content).toBe("string");
      expect(typeof c.createdAt).toBe("string");
      expect(typeof c.author.name).toBe("string");
    }
  });

  test("GET comments are sorted oldest-first", async ({ page }) => {
    await signIn(page, "admin");
    const body = await (await page.request.get(ENDPOINT)).json() as {
      comments: Array<{ createdAt: string }>;
    };
    if (body.comments.length < 2) { return; }
    for (let i = 1; i < body.comments.length; i++) {
      const prev = new Date(body.comments[i - 1].createdAt).getTime();
      const curr = new Date(body.comments[i].createdAt).getTime();
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });

  // ── DELETE ─────────────────────────────────────────────────────────────────

  test("DELETE non-existent comment returns 404", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.delete(
      `${ENDPOINT}/00000000-0000-0000-0000-000000000001`
    );
    expect(res.status()).toBe(404);
  });

  test("funder cannot delete admin comment (403)", async ({ page }) => {
    if (!adminCommentId) { test.skip(); return; }
    await signIn(page, "funder");
    const res = await page.request.delete(`${ENDPOINT}/${adminCommentId}`);
    expect(res.status()).toBe(403);
  });

  test("funder can delete their own comment (200)", async ({ page }) => {
    if (!funderCommentId) { test.skip(); return; }
    await signIn(page, "funder");
    const res = await page.request.delete(`${ENDPOINT}/${funderCommentId}`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { deleted: boolean };
    expect(body.deleted).toBe(true);
  });

  test("admin can delete any comment (200)", async ({ page }) => {
    if (!adminCommentId) { test.skip(); return; }
    await signIn(page, "admin");
    const res = await page.request.delete(`${ENDPOINT}/${adminCommentId}`);
    expect(res.status()).toBe(200);
  });

  test("deleted comment no longer appears in GET", async ({ page }) => {
    if (!adminCommentId) { test.skip(); return; }
    await signIn(page, "admin");
    const body = await (await page.request.get(ENDPOINT)).json() as {
      comments: Array<{ id: string }>;
    };
    const ids = body.comments.map(c => c.id);
    expect(ids).not.toContain(adminCommentId);
  });
});
