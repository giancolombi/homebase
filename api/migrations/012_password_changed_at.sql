-- Track when a user's password last changed so that JWTs issued before that
-- moment can be rejected. This invalidates all existing sessions on password
-- reset / change, closing the window where a leaked or pre-reset token stays
-- valid for the full 7-day token lifetime.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;
