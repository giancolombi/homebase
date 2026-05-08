-- Homebase: track when a calendar connection has been auto-paused by
-- the iOS EventKit sync.
--
-- When an iOS user grants Calendar permission, EventKit reads every account
-- they've synced to their iPhone (iCloud + Google + Outlook + Exchange + …).
-- If the same user previously connected, say, Google via OAuth on the web,
-- the same events would now flow into the family calendar twice — once via
-- /api/calendar/sync (Google OAuth) and once via /api/calendar/eventkit/sync.
--
-- We deduplicate by pausing the OAuth/CalDAV connection of any provider
-- whose source EventKit just returned. paused_at distinguishes "auto-paused
-- by EventKit" from "user explicitly disconnected" — the former should be
-- restored if the user later disconnects EventKit; the latter should not.
--
-- Schema-additive only. Safe to run on Railway with no behavior change for
-- existing rows (paused_at NULL means "not paused").

ALTER TABLE public.calendar_connections
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
