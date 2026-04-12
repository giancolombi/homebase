-- Calendar integration: add OAuth tokens and synced events

-- Add OAuth token columns to calendar_connections
ALTER TABLE public.calendar_connections
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS external_email TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Unique constraint: one connection per member per provider
ALTER TABLE public.calendar_connections
  ADD CONSTRAINT calendar_connections_member_provider_unique
  UNIQUE (member_id, provider);

-- Synced events from external calendars (separate from homebase events)
CREATE TABLE IF NOT EXISTS public.synced_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  source_provider TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_synced_events_connection ON public.synced_calendar_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_family_date ON public.synced_calendar_events(family_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_synced_events_external ON public.synced_calendar_events(connection_id, external_id);

CREATE TRIGGER update_synced_calendar_events_updated_at
  BEFORE UPDATE ON public.synced_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON public.calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
