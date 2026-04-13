-- Add admin role to family members
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Owners are automatically admins
UPDATE public.family_members SET is_admin = true WHERE is_owner = true;
