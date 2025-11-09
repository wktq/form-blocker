-- Add blocked_domains column for form-level domain blacklists
ALTER TABLE public.form_configs
ADD COLUMN IF NOT EXISTS blocked_domains TEXT[] DEFAULT '{}'::text[] NOT NULL;
