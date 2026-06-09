/**
 * POST   /api/push/subscribe   — save a browser Web Push subscription
 * DELETE /api/push/subscribe   — remove a subscription by endpoint
 *
 * The browser calls POST after the user grants notification permission and the
 * service worker calls pushManager.subscribe(). The full PushSubscription JSON
 * is saved to web_push_subscriptions.
 *
 * POST body:  { subscription: PushSubscription (serialised), userAgent?: string }
 * DELETE body: { endpoint: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subscription?: unknown; userAgent?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subscription, userAgent } = body;

  if (!subscription || typeof subscription !== "object") {
    return NextResponse.json({ error: "subscription is required." }, { status: 400 });
  }

  const sub = subscription as Record<string, unknown>;
  if (!sub.endpoint || typeof sub.endpoint !== "string") {
    return NextResponse.json({ error: "subscription.endpoint is required." }, { status: 400 });
  }

  const service = createServiceClient();

  // Upsert — re-registering the same endpoint is idempotent
  const { data, error } = await service
    .from("web_push_subscriptions")
    .upsert(
      {
        user_id:      user.id,
        endpoint:     sub.endpoint,
        subscription: subscription,
        user_agent:   userAgent ?? req.headers.get("user-agent") ?? null,
      },
      { onConflict: "user_id,endpoint" },
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { endpoint?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.endpoint?.trim()) {
    return NextResponse.json({ error: "endpoint is required." }, { status: 400 });
  }

  const service = createServiceClient();

  const { error } = await service
    .from("web_push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", body.endpoint.trim());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
