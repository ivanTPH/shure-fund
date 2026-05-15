/**
 * Shared API client functions.
 * These wrap fetch calls to the Shure.Fund API endpoints.
 * Suitable for use in both web (client components) and React Native (Expo).
 *
 * Pass `baseUrl` when calling from mobile (e.g. your deployed Next.js URL).
 * In the web app, leave `baseUrl` as "" (relative URLs work natively).
 */

import type {
  AppNotification,
  Variation,
  Dispute,
  Project,
  FundingPosition,
} from "../types";

type FetchOptions = { baseUrl?: string; token?: string };

function headers(token?: string): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: FetchOptions = {},
): Promise<T> {
  const url = `${opts.baseUrl ?? ""}${path}`;
  const res = await fetch(url, { ...init, headers: { ...headers(opts.token), ...(init.headers ?? {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function listProjects(opts?: FetchOptions): Promise<Project[]> {
  const d = await apiFetch<{ projects: Project[] }>("/api/projects", {}, opts);
  return d.projects;
}

export async function createProject(
  body: { name: string; location?: string },
  opts?: FetchOptions,
): Promise<Project> {
  const d = await apiFetch<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(body) }, opts);
  return d.project;
}

// ---------------------------------------------------------------------------
// Funding
// ---------------------------------------------------------------------------

export async function getFundingPosition(projectId: string, opts?: FetchOptions): Promise<FundingPosition> {
  return apiFetch<FundingPosition>(`/api/projects/${projectId}/funding-position`, {}, opts);
}

// ---------------------------------------------------------------------------
// Variations
// ---------------------------------------------------------------------------

export async function listVariations(stageId: string, opts?: FetchOptions): Promise<Variation[]> {
  const d = await apiFetch<{ variations: Variation[] }>(`/api/variations?stageId=${stageId}`, {}, opts);
  return d.variations;
}

export async function getVariation(variationId: string, opts?: FetchOptions): Promise<Variation> {
  const d = await apiFetch<{ variation: Variation }>(`/api/variations/${variationId}`, {}, opts);
  return d.variation;
}

export async function createVariation(
  body: { stageId: string; description: string; valueChange: number },
  opts?: FetchOptions,
): Promise<Variation> {
  const d = await apiFetch<{ variation: Variation }>("/api/variations", { method: "POST", body: JSON.stringify(body) }, opts);
  return d.variation;
}

export async function transitionVariation(
  variationId: string,
  action: string,
  opts?: FetchOptions,
): Promise<void> {
  await apiFetch(`/api/variations/${variationId}`, { method: "PATCH", body: JSON.stringify({ action }) }, opts);
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------

export async function listDisputes(stageId: string, opts?: FetchOptions): Promise<Dispute[]> {
  const d = await apiFetch<{ disputes: Dispute[] }>(`/api/disputes?stageId=${stageId}`, {}, opts);
  return d.disputes;
}

export async function createDispute(
  body: { stageId: string; reason: string; evidenceUrl?: string },
  opts?: FetchOptions,
): Promise<Dispute> {
  const d = await apiFetch<{ dispute: Dispute }>("/api/disputes", { method: "POST", body: JSON.stringify(body) }, opts);
  return d.dispute;
}

export async function transitionDispute(
  disputeId: string,
  action: string,
  notes?: string,
  opts?: FetchOptions,
): Promise<void> {
  await apiFetch(`/api/disputes/${disputeId}`, { method: "PATCH", body: JSON.stringify({ action, notes }) }, opts);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(opts?: FetchOptions): Promise<AppNotification[]> {
  const d = await apiFetch<{ notifications: AppNotification[] }>("/api/notifications", {}, opts);
  return d.notifications;
}

export async function markAllNotificationsRead(opts?: FetchOptions): Promise<void> {
  await apiFetch("/api/notifications", { method: "PATCH" }, opts);
}

export async function markNotificationRead(id: string, opts?: FetchOptions): Promise<void> {
  await apiFetch(`/api/notifications/${id}`, { method: "PATCH" }, opts);
}
