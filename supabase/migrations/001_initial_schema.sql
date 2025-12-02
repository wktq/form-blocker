-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types with error handling to avoid "already exists" errors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE submission_status AS ENUM ('allowed', 'challenged', 'held', 'blocked');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('email', 'webhook', 'dashboard');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appeal_status') THEN
        CREATE TYPE appeal_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Forms table
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  site_url TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Form configurations table
CREATE TABLE IF NOT EXISTS public.form_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL UNIQUE REFERENCES public.forms(id) ON DELETE CASCADE,
  enable_url_detection BOOLEAN DEFAULT true NOT NULL,
  enable_paste_detection BOOLEAN DEFAULT true NOT NULL,
  threshold_sales DECIMAL(3,2) DEFAULT 0.70 NOT NULL CHECK (threshold_sales >= 0 AND threshold_sales <= 1),
  threshold_spam DECIMAL(3,2) DEFAULT 0.85 NOT NULL CHECK (threshold_spam >= 0 AND threshold_spam <= 1),
  banned_keywords TEXT[] DEFAULT '{}' NOT NULL,
  allowed_domains TEXT[] DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  status submission_status NOT NULL,
  score_sales DECIMAL(3,2) NOT NULL CHECK (score_sales >= 0 AND score_sales <= 1),
  score_spam DECIMAL(3,2) NOT NULL CHECK (score_spam >= 0 AND score_spam <= 1),
  final_decision TEXT NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB NOT NULL,
  detection_reasons TEXT[] DEFAULT '{}' NOT NULL,
  llm_reasoning TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  condition JSONB NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Appeals table
CREATE TABLE IF NOT EXISTS public.appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  contact_info JSONB,
  status appeal_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON public.forms(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_api_key ON public.forms(api_key);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON public.submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_form_id ON public.notifications(form_id);
CREATE INDEX IF NOT EXISTS idx_appeals_submission_id ON public.appeals(submission_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON public.appeals(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forms_updated_at ON public.forms;
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_configs_updated_at ON public.form_configs;
CREATE TRIGGER update_form_configs_updated_at BEFORE UPDATE ON public.form_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_submissions_updated_at ON public.submissions;
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'fb_live_';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create form_config when a form is created
CREATE OR REPLACE FUNCTION create_default_form_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.form_configs (form_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_form_config_trigger ON public.forms;
CREATE TRIGGER create_form_config_trigger
  AFTER INSERT ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION create_default_form_config();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Forms policies
DROP POLICY IF EXISTS "Users can view their own forms" ON public.forms;
CREATE POLICY "Users can view their own forms"
  ON public.forms FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own forms" ON public.forms;
CREATE POLICY "Users can create their own forms"
  ON public.forms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own forms" ON public.forms;
CREATE POLICY "Users can update their own forms"
  ON public.forms FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own forms" ON public.forms;
CREATE POLICY "Users can delete their own forms"
  ON public.forms FOR DELETE
  USING (auth.uid() = user_id);

-- Form configs policies
DROP POLICY IF EXISTS "Users can view configs of their forms" ON public.form_configs;
CREATE POLICY "Users can view configs of their forms"
  ON public.form_configs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_configs.form_id
    AND forms.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update configs of their forms" ON public.form_configs;
CREATE POLICY "Users can update configs of their forms"
  ON public.form_configs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_configs.form_id
    AND forms.user_id = auth.uid()
  ));

-- Submissions policies
DROP POLICY IF EXISTS "Users can view submissions of their forms" ON public.submissions;
CREATE POLICY "Users can view submissions of their forms"
  ON public.submissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = submissions.form_id
    AND forms.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update submissions of their forms" ON public.submissions;
CREATE POLICY "Users can update submissions of their forms"
  ON public.submissions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = submissions.form_id
    AND forms.user_id = auth.uid()
  ));

-- Notifications policies
DROP POLICY IF EXISTS "Users can manage notifications of their forms" ON public.notifications;
CREATE POLICY "Users can manage notifications of their forms"
  ON public.notifications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = notifications.form_id
    AND forms.user_id = auth.uid()
  ));

-- Appeals policies
DROP POLICY IF EXISTS "Users can view appeals of their submissions" ON public.appeals;
CREATE POLICY "Users can view appeals of their submissions"
  ON public.appeals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.submissions
    JOIN public.forms ON forms.id = submissions.form_id
    WHERE submissions.id = appeals.submission_id
    AND forms.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update appeals of their submissions" ON public.appeals;
CREATE POLICY "Users can update appeals of their submissions"
  ON public.appeals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.submissions
    JOIN public.forms ON forms.id = submissions.form_id
    WHERE submissions.id = appeals.submission_id
    AND forms.user_id = auth.uid()
  ));
