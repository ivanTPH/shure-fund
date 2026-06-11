/**
 * Journey 42 — PWA manifest + push subscribe API @e2e
 *
 * Covers:
 *  - GET /manifest.json — manifest is served with correct shape
 *  - POST /api/push/subscribe — saves a web push subscription
 *  - DELETE /api/push/subscribe — removes a subscription
 *
 * Auth guards:
 *  - Unauthenticated POST /api/push/subscribe → 401
 *  - Unauthenticated DELETE /api/push/subscribe → 401
 *  - Authenticated POST with valid subscription → 201
 *
 * Manifest shape:
 *  - name, short_name, start_url, display, theme_color, icons[]
 *
 * Push subscribe:
 *  - Missing subscription → 400
 *  - Missing endpoint in subscription → 400
 *  - Valid subscription → 201 with id
 *  - Re-posting same endpoint is idempotent → 201
 *
 * Delete:
 *  - Missing endpoint → 400
 *  - Valid endpoint → 200
 */

import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

const BASE     = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const MANIFEST = `${BASE}/manifest.json`;
const PUSH_API = `${BASE}/api/push/subscribe`;

// Fake subscription object (same shape as PushSubscription.toJSON())
const FAKE_SUBSCRIPTION = {
  endpoint: `https://fcm.googleapis.com/e2e-test-${Date.now()}`,
  keys: {
    p256dh: "BNbxvhg5Rw4JrXsK7Oa5FZ8V8I3kDpCq1M9X3xJmRnE=",
    auth:   "ZmFrZWF1dGhrZXk=",
  },
};

test.describe("Journey 42 — PWA manifest + push subscribe @e2e", () => {
  test.setTimeout(60_000);

  // ── Manifest ───────────────────────────────────────────────────────────────

  test("GET /manifest.json returns valid PWA manifest", async ({ page }) => {
    const res  = await page.request.get(MANIFEST);
    expect(res.status()).toBe(200);

    const manifest = await res.json() as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string }>;
    };

    expect(typeof manifest.name).toBe("string");
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(typeof manifest.short_name).toBe("string");
    expect(typeof manifest.start_url).toBe("string");
    expect(typeof manifest.display).toBe("string");
    expect(typeof manifest.theme_color).toBe("string");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("manifest display is standalone or browser", async ({ page }) => {
    const manifest = await (await page.request.get(MANIFEST)).json() as { display: string };
    expect(["standalone", "browser", "fullscreen", "minimal-ui"]).toContain(manifest.display);
  });

  // ── Push subscribe auth guards ─────────────────────────────────────────────

  test("unauthenticated POST /api/push/subscribe returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.post(PUSH_API, {
      data: { subscription: FAKE_SUBSCRIPTION },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated DELETE /api/push/subscribe returns 401", async ({ page }) => {
    await page.context().clearCookies();
    const res = await page.request.delete(PUSH_API, {
      data: { endpoint: FAKE_SUBSCRIPTION.endpoint },
    });
    expect(res.status()).toBe(401);
  });

  // ── Push subscribe validation ──────────────────────────────────────────────

  test("POST without subscription returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(PUSH_API, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("POST without endpoint in subscription returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(PUSH_API, {
      data: { subscription: { keys: {} } },
    });
    expect(res.status()).toBe(400);
  });

  test("DELETE without endpoint returns 400", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.delete(PUSH_API, { data: {} });
    expect(res.status()).toBe(400);
  });

  // ── Push subscribe success ─────────────────────────────────────────────────

  test("admin POST valid subscription returns 201 with id", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(PUSH_API, {
      data: { subscription: FAKE_SUBSCRIPTION, userAgent: "E2E test" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json() as { ok: boolean; id: string };
    expect(body.ok).toBe(true);
    expect(typeof body.id).toBe("string");
  });

  test("re-posting same subscription is idempotent (201)", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.post(PUSH_API, {
      data: { subscription: FAKE_SUBSCRIPTION },
    });
    expect(res.status()).toBe(201);
  });

  test("DELETE existing subscription returns 200", async ({ page }) => {
    await signIn(page, "admin");
    const res = await page.request.delete(PUSH_API, {
      data: { endpoint: FAKE_SUBSCRIPTION.endpoint },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("funder can also register a push subscription", async ({ page }) => {
    await signIn(page, "funder");
    const funderSub = {
      ...FAKE_SUBSCRIPTION,
      endpoint: `https://fcm.googleapis.com/e2e-funder-${Date.now()}`,
    };
    const res = await page.request.post(PUSH_API, {
      data: { subscription: funderSub },
    });
    expect(res.status()).toBe(201);
  });
});
