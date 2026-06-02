-- Per-family monthly budgets by spending category, compared against actual
-- transaction spend in the FinancePage budgets card.

CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (family_id, category)
);

CREATE INDEX IF NOT EXISTS idx_budgets_family ON public.budgets(family_id);
