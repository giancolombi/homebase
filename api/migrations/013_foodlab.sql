-- FoodLab per-family ratings and per-member dietary restrictions.
-- Recipes themselves are fetched live from the public FoodLab GitHub repo and
-- cached client-side, so only the user-generated data is persisted here.

CREATE TABLE IF NOT EXISTS public.foodlab_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  dish TEXT NOT NULL,
  version TEXT NOT NULL CHECK (version IN ('veg', 'meat')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes TEXT NOT NULL DEFAULT '',
  rated_on DATE NOT NULL DEFAULT now(),
  -- One rating per member per dish+version (re-rating updates in place).
  UNIQUE (family_id, member_id, dish, version)
);

CREATE INDEX IF NOT EXISTS idx_foodlab_ratings_family
  ON public.foodlab_ratings(family_id);

CREATE TABLE IF NOT EXISTS public.member_dietary (
  member_id UUID PRIMARY KEY
    REFERENCES public.family_members(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  restrictions JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_dietary_family
  ON public.member_dietary(family_id);
