-- Remove system_prompt from chats table
ALTER TABLE chats DROP COLUMN IF EXISTS system_prompt;

-- Update database version
COMMENT ON SCHEMA public IS 'Standard public schema with system_prompt removed from chats table'; 