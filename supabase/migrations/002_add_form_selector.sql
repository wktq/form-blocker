ALTER TABLE public.form_configs
ADD COLUMN IF NOT EXISTS form_selector TEXT DEFAULT 'form' NOT NULL;
