-- Homebase: track onboarding completion on the server.
-- Without this, "did the user finish onboarding?" lived only in browser
-- localStorage, so users were sent back through the wizard whenever they
-- signed in on a new device or cleared storage.

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Backfill: any family that already exists predates this column, and the
-- owner has clearly already finished onboarding (the family wouldn't exist
-- otherwise). Mark them as completed at their creation time so they don't
-- get bumped back into the wizard on next login.
UPDATE public.families
SET onboarding_completed_at = COALESCE(created_at, now())
WHERE onboarding_completed_at IS NULL;
