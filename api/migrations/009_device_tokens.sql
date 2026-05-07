-- Homebase: per-user push device tokens.
--
-- One row per (user, device). A user can have multiple devices (iPhone +
-- iPad + future Android) and we deliver to all of them. The platform field
-- is open-ended for now ('ios' | 'android') so the same fan-out worker can
-- branch on FCM vs APNs later.
--
-- Token uniqueness is enforced so re-registering an existing token (which
-- happens on every cold start) is idempotent — see ON CONFLICT in the
-- /api/devices/register endpoint.

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id
  ON public.device_tokens(user_id);
