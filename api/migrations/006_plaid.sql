-- Homebase: Plaid bank-sync tables and columns.
-- Introduces plaid_items (one row per linked institution) and extends
-- bank_accounts + transactions with Plaid identifiers so we can reconcile
-- incremental /transactions/sync results.

-- ============= PLAID ITEMS =============

CREATE TABLE public.plaid_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL UNIQUE,
  access_token_encrypted TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  -- /transactions/sync cursor — null until first successful sync completes.
  transactions_cursor TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_plaid_items_family ON public.plaid_items(family_id);

CREATE TRIGGER update_plaid_items_updated_at BEFORE UPDATE ON public.plaid_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= EXTEND bank_accounts =============

ALTER TABLE public.bank_accounts
  ADD COLUMN plaid_item_id UUID REFERENCES public.plaid_items(id) ON DELETE CASCADE,
  ADD COLUMN plaid_account_id TEXT UNIQUE,
  ADD COLUMN iso_currency_code TEXT,
  ADD COLUMN mask TEXT,
  ADD COLUMN account_type TEXT,
  ADD COLUMN account_subtype TEXT,
  ADD COLUMN last_plaid_sync_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_bank_accounts_plaid_item ON public.bank_accounts(plaid_item_id);

-- ============= EXTEND transactions =============

ALTER TABLE public.transactions
  ADD COLUMN plaid_transaction_id TEXT UNIQUE,
  ADD COLUMN merchant_name TEXT,
  ADD COLUMN iso_currency_code TEXT,
  ADD COLUMN pending BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN payment_channel TEXT;

CREATE INDEX idx_transactions_plaid_tx ON public.transactions(plaid_transaction_id);
