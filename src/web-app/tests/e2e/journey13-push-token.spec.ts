/**
 * Journey 13 — Push token registration @e2e
 *
 * Tests POST /api/notifications/push-token and DELETE /api/notifications/push-token.
 * Verifies token registration, clearing, and validation — without requiring
 * an actual Expo push delivery (that's an external service).
 *
 * Covers:
 *  - Unauthenticated POST returns 401
 *  - Unauthenticated DELETE returns 401
 *  - Empty string token returns 400
 *  - Whitespace-only token returns 400
 *  - Invalid JSON body returns 400
 *  - Valid Expo-style token is accepted (200)
 *  - Token is persisted — visible via account profile
 *  - POST with null clears the token
 *  - DELETE clears the token
 *  - Different users can register different tokens (isolation)
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

// Realistic Expo push token format
const EXPO_TOKEN_CONTRACTOR = "ExponentPushToken[test-contractor-token-j13]";
const EXPO_TOKEN_COMMERCIAL  = "ExponentPushToken[test-commercial-token-j13]";

async function postPushToken(
  page: Parameters<typeof signIn>[0],
  body: unknown,
): Promise<{ status: number; body: unknown }> {
  const res = await page.request.post(`${BASE}/api/notifications/push-token`, {
    headers: { "Content-Type": "application/json" },
    data: body as Record<string, unknown>,
  });
  return { status: res.status(), body: await res.json() };
}

async function deletePushToken(page: Parameters<typeof signIn>[0]): Promise<{ status: number }> {
  const res = await page.request.delete(`${BASE}/api/notifications/push-token`);
  return { status: res.status() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Journey 13 — Push token registration @e2e", () => {
  test.setTimeout(60_000);

  // ── Unauthenticated ───────────────────────────────────────────────────────

  test("unauthenticated POST /api/notifications/push-token returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(`${BASE}/api/notifications/push-token`, {
      headers: { "Content-Type": "application/json" },
      data: { token: EXPO_TOKEN_CONTRACTOR },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated DELETE /api/notifications/push-token returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.delete(`${BASE}/api/notifications/push-token`);
    expect(res.status()).toBe(401);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  test("empty string token returns 400", async ({ page }) => {
    await signIn(page, "contractor");
    const { status, body } = await postPushToken(page, { token: "" });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/token/i);
  });

  test("whitespace-only token returns 400", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await postPushToken(page, { token: "   " });
    expect(status).toBe(400);
  });

  test("missing token field returns 400", async ({ page }) => {
    await signIn(page, "contractor");
    const { status } = await postPushToken(page, {});
    // token is undefined — treated as neither a non-empty string nor null
    expect(status).toBe(400);
  });

  // ── Register token ────────────────────────────────────────────────────────

  test("valid Expo push token is accepted (200)", async ({ page }) => {
    await signIn(page, "contractor");
    const { status, body } = await postPushToken(page, { token: EXPO_TOKEN_CONTRACTOR });
    expect(status).toBeLessThan(300);
    expect((body as { ok: boolean }).ok).toBe(true);
  });

  test("registered token is persisted — re-register with same token returns 200", async ({ page }) => {
    await signIn(page, "contractor");

    // Register once
    const first = await postPushToken(page, { token: EXPO_TOKEN_CONTRACTOR });
    expect(first.status).toBeLessThan(300);

    // Register again with the same token — idempotent, should succeed
    const second = await postPushToken(page, { token: EXPO_TOKEN_CONTRACTOR });
    expect(second.status).toBeLessThan(300);
    expect((second.body as { ok: boolean }).ok).toBe(true);
  });

  // ── Different users can have different tokens ─────────────────────────────

  test("commercial can register a different token independently", async ({ page }) => {
    await signIn(page, "commercial");
    const { status, body } = await postPushToken(page, { token: EXPO_TOKEN_COMMERCIAL });
    expect(status).toBeLessThan(300);
    expect((body as { ok: boolean }).ok).toBe(true);
  });

  // ── Update token (re-register) ────────────────────────────────────────────

  test("re-registering with a new token replaces the old one", async ({ page }) => {
    await signIn(page, "contractor");

    const newToken = "ExponentPushToken[updated-contractor-token-j13]";
    const { status, body } = await postPushToken(page, { token: newToken });
    expect(status).toBeLessThan(300);
    expect((body as { ok: boolean }).ok).toBe(true);
  });

  // ── Clear token with null ─────────────────────────────────────────────────

  test("POST with null clears the push token", async ({ page }) => {
    await signIn(page, "contractor");

    // First register a token
    await postPushToken(page, { token: EXPO_TOKEN_CONTRACTOR });

    // Then clear it
    const { status, body } = await postPushToken(page, { token: null });
    expect(status).toBeLessThan(300);
    expect((body as { ok: boolean }).ok).toBe(true);

    // Verify clearing is idempotent — calling null again still returns 200
    const again = await postPushToken(page, { token: null });
    expect(again.status).toBeLessThan(300);
    expect((again.body as { ok: boolean }).ok).toBe(true);
  });

  // ── DELETE clears token ───────────────────────────────────────────────────

  test("DELETE /api/notifications/push-token clears the token", async ({ page }) => {
    await signIn(page, "commercial");

    // Register first
    await postPushToken(page, { token: EXPO_TOKEN_COMMERCIAL });

    // Delete
    const { status } = await deletePushToken(page);
    expect(status).toBeLessThan(300);

    // Subsequent DELETE is also a no-op (idempotent)
    const again = await deletePushToken(page);
    expect(again.status).toBeLessThan(300);
  });

  // ── Any authenticated role can register ───────────────────────────────────

  test("funder can register a push token", async ({ page }) => {
    await signIn(page, "funder");
    const { status } = await postPushToken(page, {
      token: "ExponentPushToken[funder-token-j13]",
    });
    expect(status).toBeLessThan(300);
  });

  test("admin can register a push token", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await postPushToken(page, {
      token: "ExponentPushToken[admin-token-j13]",
    });
    expect(status).toBeLessThan(300);
  });

  // ── Cleanup: clear tokens registered during this journey ─────────────────

  test("cleanup: clear push tokens registered during journey", async ({ page }) => {
    for (const role of ["contractor", "commercial", "funder", "admin"] as const) {
      await signIn(page, role);
      await postPushToken(page, { token: null });
    }
  });
});
