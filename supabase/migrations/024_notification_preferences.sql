-- Migration 024: Notification preferences
--
-- Per-user, per-event-type preferences for email and push notifications.
-- Defaults to enabled for all channels. Missing rows = enabled (app handles default).

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    text    NOT NULL,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled  boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_type)
);

CREATE INDEX IF NOT EXISTS notif_pref_user_idx ON notification_preferences (user_id);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_pref: own read"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notif_pref: own write"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
