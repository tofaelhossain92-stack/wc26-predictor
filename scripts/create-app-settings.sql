-- Simple key-value settings table for runtime toggles (e.g. chatbot on/off)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS app_settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

-- Default: chatbot enabled
INSERT INTO app_settings (key, value) VALUES ('chatbot_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
