/**
 * GET /api/email/digest
 *
 * Sends a daily digest email to every active user who has unread notifications
 * created in the past 24 hours.
 *
 * Authentication: Bearer token checked against DIGEST_SECRET env var.
 * Intended to be called by a Vercel Cron Job — see vercel.json.
 *
 * Vercel Cron example (vercel.json):
 * {
 *   "crons": [{ "path": "/api/email/digest", "schedule": "0 7 * * *" }]
 * }
 *
 * Manual trigger:
 *   curl -H "Authorization: Bearer $DIGEST_SECRET" https://your-domain/api/email/digest
 *
 * Response: { ok: true, sent: number, skipped: number }
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail, buildDigestEmail } from "@/lib/email/emailService";

const DIGEST_SECRET = process.env.DIGEST_SECRET ?? "";
const SITE_URL      = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.shure.fund";

// How far back to look for unread notifications
const WINDOW_HOURS = 24;

export async function GET(req: NextRequest) {
  // Auth check
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!DIGEST_SECRET || token !== DIGEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  // Find all users with unread notifications in the window
  const { data: rows, error } = await service
    .from("notifications")
    .select(`
      user_id,
      type, required_action, message, entity_name, action_url, created_at
    `)
    .eq("read", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: "No unread notifications in window." });
  }

  // Group by user_id
  const byUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const existing = byUser.get(row.user_id) ?? [];
    existing.push(row);
    byUser.set(row.user_id, existing);
  }

  // Fetch user details for all recipients
  const userIds = Array.from(byUser.keys());
  const { data: users } = await service
    .from("users")
    .select("id, full_name, email, active")
    .in("id", userIds)
    .eq("active", true);

  let sent = 0;
  let skipped = 0;

  for (const user of users ?? []) {
    if (!user.email) { skipped++; continue; }

    const notifications = byUser.get(user.id) ?? [];
    if (!notifications.length) { skipped++; continue; }

    const { subject, html, text } = buildDigestEmail(
      user.full_name ?? "there",
      notifications,
      SITE_URL,
    );

    await sendEmail({ to: user.email, subject, html, text });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
