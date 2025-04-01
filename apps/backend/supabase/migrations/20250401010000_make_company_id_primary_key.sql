-- Begin transaction
BEGIN;

-- Create a temporary table with our desired structure
CREATE TABLE chat_configs_new (
    company_id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    pinecone_index_name TEXT,
    system_prompt TEXT NOT NULL CHECK (char_length(system_prompt) <= 10000)
);

-- Copy data from the old table to the new one
INSERT INTO chat_configs_new (company_id, created_at, updated_at, pinecone_index_name, system_prompt)
SELECT company_id, created_at, updated_at, pinecone_index_name, system_prompt
FROM chat_configs;

-- Drop the old table
DROP TABLE chat_configs;

-- Rename the new table to the original name
ALTER TABLE chat_configs_new RENAME TO chat_configs;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_chat_configs_company_id ON chat_configs (company_id);

-- Set up trigger for keeping updated_at current
DROP TRIGGER IF EXISTS update_chat_configs_updated_at ON chat_configs;
CREATE TRIGGER update_chat_configs_updated_at
BEFORE UPDATE ON chat_configs
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Update database version
COMMENT ON SCHEMA public IS 'Standard public schema with company_id as primary key in chat_configs table';

-- Commit the transaction
COMMIT; 