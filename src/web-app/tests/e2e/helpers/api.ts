import type { Page, APIRequestContext } from "@playwright/test";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

/**
 * Fetch JSON from the app's API, sharing the browser's auth cookies.
 * Use this for DB-state assertions after UI actions.
 */
export async function apiGet(page: Page, path: string): Promise<unknown> {
  const res = await page.request.get(`${BASE}${path}`);
  if (!res.ok()) {
    throw new Error(`GET ${path} returned ${res.status()}: ${await res.text()}`);
  }
  return res.json();
}

export async function apiPost(
  page: Page,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await page.request.post(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    data: body,
  });
  if (!res.ok()) {
    throw new Error(`POST ${path} returned ${res.status()}: ${await res.text()}`);
  }
  return res.json();
}

export async function apiPatch(
  page: Page,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await page.request.patch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    data: body,
  });
  if (!res.ok()) {
    throw new Error(`PATCH ${path} returned ${res.status()}: ${await res.text()}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

export interface Wallet {
  id: string;
  balance: number;
  available_amount: number;
  ringfenced_amount: number;
}

export async function getWallet(page: Page, projectId: string): Promise<Wallet> {
  const d = await apiGet(page, `/api/projects/${projectId}/wallet`) as { wallet: Wallet };
  return d.wallet;
}

export async function depositFunds(
  page: Page,
  projectId: string,
  amount: number,
  reference = "Test deposit",
): Promise<Wallet> {
  const d = await apiPost(page, `/api/projects/${projectId}/wallet`, { amount, reference }) as { wallet: Wallet };
  return d.wallet;
}

export async function getStageStatus(page: Page, stageId: string): Promise<string> {
  const d = await apiGet(page, `/api/stages/${stageId}/transition`) as { currentStatus: string };
  return d.currentStatus;
}

export async function transitionStage(
  page: Page,
  stageId: string,
  action: string,
  reason?: string,
): Promise<{ to: string }> {
  const body: Record<string, unknown> = { action };
  if (reason) body.reason = reason;
  return apiPost(page, `/api/stages/${stageId}/transition`, body) as Promise<{ to: string }>;
}
