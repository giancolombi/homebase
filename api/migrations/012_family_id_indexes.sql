-- Every authenticated request runs the family-membership check
-- (family_members WHERE family_id = $1 AND user_id = $2), and every
-- family-scoped table is queried by family_id — none of which had indexes,
-- so they all degrade to sequential scans as data grows.

-- Membership check (resolveFamilyId / isFamilyMember) + userPayload lookup.
CREATE INDEX IF NOT EXISTS idx_family_members_user_family
  ON public.family_members(user_id, family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family
  ON public.family_members(family_id);

-- Family-scoped list queries.
CREATE INDEX IF NOT EXISTS idx_tasks_family
  ON public.tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_family
  ON public.task_categories(family_id);
CREATE INDEX IF NOT EXISTS idx_recipes_family
  ON public.recipes(family_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_family
  ON public.meal_plan(family_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_family
  ON public.shopping_list(family_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_family
  ON public.bank_accounts(family_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_family_date
  ON public.calendar_events(family_id, date);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_family
  ON public.calendar_connections(family_id);

-- Transactions are listed per family ordered by date.
CREATE INDEX IF NOT EXISTS idx_transactions_family_date
  ON public.transactions(family_id, date DESC);
