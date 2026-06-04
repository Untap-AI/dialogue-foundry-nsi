-- Add configurable active hours to chat_configs.
-- When timezone, active_start_time, and active_end_time are all set, the bot is
-- only "live" within that daily window (evaluated in the configured timezone,
-- with support for overnight windows like 17:00 -> 09:00). When any of these are
-- NULL the bot is always active (backward compatible default).

ALTER TABLE chat_configs
    ADD COLUMN IF NOT EXISTS timezone TEXT,
    ADD COLUMN IF NOT EXISTS active_start_time TIME,
    ADD COLUMN IF NOT EXISTS active_end_time TIME;

COMMENT ON COLUMN chat_configs.timezone IS 'IANA timezone (e.g. America/New_York) the active hours window is evaluated in';
COMMENT ON COLUMN chat_configs.active_start_time IS 'Daily time the bot becomes active (inclusive). NULL means always active';
COMMENT ON COLUMN chat_configs.active_end_time IS 'Daily time the bot becomes inactive (exclusive). NULL means always active';
