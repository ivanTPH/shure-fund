-- Migration 017: add idempotency_key to wallet_transactions
-- Prevents duplicate deposits if a client retries a request.

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;
