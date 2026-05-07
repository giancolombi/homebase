-- Homebase: extend calendar_connections.provider CHECK to include 'eventkit'.
--
-- The iOS app reads the device's Calendar.app via EventKit and POSTs a
-- batched, normalized event feed to /api/calendar/eventkit/sync. Those rows
-- are stored under a per-(family, member) calendar_connections row with
-- provider='eventkit' so the same /api/calendar/events endpoint that the web
-- app uses for Google/Outlook/Apple events surfaces them too.
--
-- synced_calendar_events.source_provider has no CHECK constraint, so it
-- doesn't need migrating.

ALTER TABLE public.calendar_connections
  DROP CONSTRAINT IF EXISTS calendar_connections_provider_check;

ALTER TABLE public.calendar_connections
  ADD CONSTRAINT calendar_connections_provider_check
  CHECK (provider IN ('google', 'outlook', 'apple', 'homebase', 'eventkit'));
