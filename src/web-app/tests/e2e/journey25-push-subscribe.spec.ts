/**
 * Journey 25 — Push subscribe API @e2e
 *
 * Tests POST and DELETE /api/push/subscribe.
 *
 * Note: full browser push delivery (service worker + PushManager) cannot be
 * tested in Playwright without a real HTTPS origin and service worker. These
 * tests cover the API contract only.
 *
 * Covers:
 *  - Unauthenticated POST returns 401
 *  - Unauthenticated DELETE returns 401
 *  - Missing subscription returns 400
 *  - Missing endpoint in subscription returns 400
 *  - Valid subscription is stored (201) with an id
 *  - Re-POSTing the same subscription is idempotent (201 or 200)
 *  - DELETE missing endpoint returns 400
 *  - DELETE known endpoint removes it (200)
 *  - Rate limit: KYC route returns 429 after exceeding limit (mock test)
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

function makeFakeSubscription(endpoint?: string) {
  return {
    endpoint: endpoint ?? `https://fcm.googleapis.com/fcm/send/test-${crypto.randomUUID()}`,
    keys: {
      p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlTiHXNI5ywnTECjS3mPW0GixMIjq2_c-z0Y4_6Q",
      auth:   "tBHItJI5svbpez7KI4CCXg",
    },
  };
}

async function subscribe(
  page: Parameters<typeof signIn>[0],
  subscription: unknown,
) {
  const res = await page.request.post(`${BASE}/api/push/subscribe`, {
    headers: { "Content-Type": "application/json" },
    data: { subscription },
  });
  return { status: res.status(), body: await res.json() };
}

async function unsubscribe(
  page: Parameters<typeof signIn>[0],
  endpoint: string,
) {
  const res = await page.request.delete(`${BASE}/api/push/subscribe`, {
    headers: { "Content-Type": "application/json" },
    data: { endpoint },
  });
  return { status: res.status(), body: res.ok() ? await res.json() : null };
}

test.describe("Journey 25 — Push subscribe API @e2e", () => {
  test.setTimeout(60_000);

  let savedEndpoint = "";

  // ── Auth gates ─────────────────────────────────────────────────────────────

  test("unauthenticated POST returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(`${BASE}/api/push/subscribe`, {
      headers: { "Content-Type": "application/json" },
      data: { subscription: makeFakeSubscription() },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated DELETE returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.delete(`${BASE}/api/push/subscribe`, {
      headers: { "Content-Type": "application/json" },
      data: { endpoint: "https://example.com/push/fake" },
    });
    expect(res.status()).toBe(401);
  });

  // ── POST validation ────────────────────────────────────────────────────────

  test("POST missing subscription returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await subscribe(page, undefined);
    expect(status).toBe(400);
  });

  test("POST subscription without endpoint returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const { status } = await subscribe(page, { keys: { p256dh: "abc", auth: "xyz" } });
    expect(status).toBe(400);
  });

  // ── POST success ───────────────────────────────────────────────────────────

  test("valid subscription is stored — returns 201 with id", async ({ page }) => {
    await signIn(page, "admin");
    const sub = makeFakeSubscription();
    savedEndpoint = sub.endpoint;

    const { status, body } = await subscribe(page, sub);
    expect(status).toBe(201);
    expect(typeof (body as { id: string }).id).toBe("string");
    console.log(`Stored push subscription: ${(body as { id: string }).id}`);
  });

  test("re-subscribing same endpoint is idempotent", async ({ page }) => {
    if (!savedEndpoint) { test.skip(); return; }
    await signIn(page, "admin");
    const { status } = await subscribe(page, makeFakeSubscription(savedEndpoint));
    expect([200, 201]).toContain(status);
  });

  // ── DELETE ────────────────────────────────────────────────────────────────

  test("DELETE missing endpoint returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.delete(`${BASE}/api/push/subscribe`, {
      headers: { "Content-Type": "application/json" },
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("DELETE known endpoint returns 200", async ({ page }) => {
    if (!savedEndpoint) { test.skip(); return; }
    await signIn(page, "admin");
    const { status } = await unsubscribe(page, savedEndpoint);
    expect(status).toBe(200);
  });

  // ── Rate limit smoke test ──────────────────────────────────────────────────

  test("rate limit: wallet deposit returns 429 after 10 rapid calls", async ({ page }) => {
    await signIn(page, "admin");
    const PROJECT_ID = "00000000-0000-0000-0000-000000000301";

    let got429 = false;
    for (let i = 0; i < 15; i++) {
      const res = await page.request.post(`${BASE}/api/projects/${PROJECT_ID}/wallet`, {
        headers: { "Content-Type": "application/json" },
        data: { amount: 1, reference: `Rate limit test ${i}` },
      });
      if (res.status() === 429) { got429 = true; break; }
    }
    expect(got429).toBe(true);
  });
});
