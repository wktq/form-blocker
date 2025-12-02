-- Add whitelist_keywords column to form_configs table
ALTER TABLE form_configs
ADD COLUMN IF NOT EXISTS whitelist_keywords TEXT[] DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN form_configs.whitelist_keywords IS 'ホワイトリストキーワード（一致したら即許可）';
