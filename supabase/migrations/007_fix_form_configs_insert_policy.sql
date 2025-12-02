-- Ensure optional columns exist (idempotent for environments that missed prior migrations)
ALTER TABLE public.form_configs
ADD COLUMN IF NOT EXISTS blocked_domains TEXT[] DEFAULT '{}'::text[] NOT NULL;

ALTER TABLE public.form_configs
ADD COLUMN IF NOT EXISTS form_selector TEXT DEFAULT 'form' NOT NULL;

-- Allow authenticated users to insert configs for their own forms
DROP POLICY IF EXISTS "Users can insert configs of their forms" ON public.form_configs;
CREATE POLICY "Users can insert configs of their forms"
  ON public.form_configs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = form_configs.form_id
      AND forms.user_id = auth.uid()
    )
  );

-- Recreate trigger function with SECURITY DEFINER so it can bypass RLS when creating defaults
CREATE OR REPLACE FUNCTION create_default_form_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.form_configs (form_id)
  VALUES (NEW.id)
  ON CONFLICT (form_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill missing config rows for existing forms
INSERT INTO public.form_configs (form_id)
SELECT f.id
FROM public.forms f
LEFT JOIN public.form_configs c ON c.form_id = f.id
WHERE c.form_id IS NULL;
