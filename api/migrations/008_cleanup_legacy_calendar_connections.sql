-- Homebase: clean up legacy calendar_connections rows.
--
-- The original /api/onboarding/complete inserted rows from the frontend's
-- mock calendar list (including Apple, which we don't support via OAuth).
-- Those rows have connected = true but no access_token_encrypted and no
-- refresh_token_encrypted, so any sync attempt fails with
-- "No refresh token available" and the UI shows a permanent red error.
--
-- Real OAuth-completed connections always have access_token_encrypted set
-- (api/calendar.ts callback inserts both columns atomically), so deleting
-- rows with NULL access_token_encrypted is safe — the sync code can't do
-- anything useful with them either way.

DELETE FROM public.calendar_connections
WHERE access_token_encrypted IS NULL;
