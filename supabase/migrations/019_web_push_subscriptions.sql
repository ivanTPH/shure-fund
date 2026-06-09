-- Migration 019: web_push_subscriptions
-- Stores browser Web Push subscriptions (PushSubscription JSON) per user.
-- Each subscription is identified by its endpoint URL (unique per browser tab/device).

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  subscription jsonb NOT NULL,   -- full PushSubscription JSON from the browser
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_user_idx ON web_push_subscriptions (user_id);

ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscriptions
CREATE POLICY "web_push_own_read" ON web_push_subscriptions
  FOR SELECT USING (user_id = auth.uid());
