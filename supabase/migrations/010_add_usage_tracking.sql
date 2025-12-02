-- Usage tracking table for monitoring monthly usage per user
-- Tracks block counts and limit violations

CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  blocks_count INTEGER NOT NULL DEFAULT 0 CHECK (blocks_count >= 0),
  blocks_skipped INTEGER NOT NULL DEFAULT 0 CHECK (blocks_skipped >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one record per user per period
  UNIQUE(user_id, period_start)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON public.usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_period ON public.usage_stats(period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_period ON public.usage_stats(user_id, period_start DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_usage_stats_updated_at ON public.usage_stats;
CREATE TRIGGER update_usage_stats_updated_at
  BEFORE UPDATE ON public.usage_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see their own usage stats
DROP POLICY IF EXISTS "Users can view their own usage stats" ON public.usage_stats;
CREATE POLICY "Users can view their own usage stats"
  ON public.usage_stats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own usage stats" ON public.usage_stats;
CREATE POLICY "Users can insert their own usage stats"
  ON public.usage_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own usage stats" ON public.usage_stats;
CREATE POLICY "Users can update their own usage stats"
  ON public.usage_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Helper function to get or create current period usage stats
CREATE OR REPLACE FUNCTION get_or_create_current_usage(p_user_id UUID)
RETURNS public.usage_stats
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_usage public.usage_stats;
BEGIN
  -- Calculate current period (month boundaries in JST timezone)
  v_period_start := date_trunc('month', NOW() AT TIME ZONE 'Asia/Tokyo');
  v_period_end := v_period_start + INTERVAL '1 month';

  -- Try to get existing record
  SELECT * INTO v_usage
  FROM public.usage_stats
  WHERE user_id = p_user_id
    AND period_start = v_period_start
  LIMIT 1;

  -- Create if not exists
  IF NOT FOUND THEN
    INSERT INTO public.usage_stats (
      user_id,
      period_start,
      period_end,
      blocks_count,
      blocks_skipped
    )
    VALUES (
      p_user_id,
      v_period_start,
      v_period_end,
      0,
      0
    )
    RETURNING * INTO v_usage;
  END IF;

  RETURN v_usage;
END;
$$;

-- Function to increment block count
CREATE OR REPLACE FUNCTION increment_block_count(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
BEGIN
  v_period_start := date_trunc('month', NOW() AT TIME ZONE 'Asia/Tokyo');

  -- Ensure usage record exists
  PERFORM get_or_create_current_usage(p_user_id);

  -- Increment block count
  UPDATE public.usage_stats
  SET blocks_count = blocks_count + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND period_start = v_period_start;
END;
$$;

-- Function to increment skipped count (when limit exceeded)
CREATE OR REPLACE FUNCTION increment_skipped_count(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
BEGIN
  v_period_start := date_trunc('month', NOW() AT TIME ZONE 'Asia/Tokyo');

  -- Ensure usage record exists
  PERFORM get_or_create_current_usage(p_user_id);

  -- Increment skipped count
  UPDATE public.usage_stats
  SET blocks_skipped = blocks_skipped + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND period_start = v_period_start;
END;
$$;

-- Initialize usage stats for existing users
INSERT INTO public.usage_stats (user_id, period_start, period_end, blocks_count, blocks_skipped)
SELECT
  id as user_id,
  date_trunc('month', NOW() AT TIME ZONE 'Asia/Tokyo') as period_start,
  date_trunc('month', NOW() AT TIME ZONE 'Asia/Tokyo') + INTERVAL '1 month' as period_end,
  0 as blocks_count,
  0 as blocks_skipped
FROM public.users
ON CONFLICT (user_id, period_start) DO NOTHING;
