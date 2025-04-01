-- Rename the chat_configs table temporarily to preserve data
ALTER TABLE chat_configs RENAME TO chat_configs_old;

-- Create new chat_configs table with company_id instead of domain
CREATE TABLE IF NOT EXISTS chat_configs (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    
    -- REQUIRED
    company_id TEXT NOT NULL UNIQUE CHECK (char_length(company_id) <= 100),
    system_prompt TEXT NOT NULL CHECK (char_length(system_prompt) <= 10000),
    pinecone_index_name TEXT CHECK (char_length(pinecone_index_name) <= 500),
    
    -- CONSTRAINTS
    CONSTRAINT unique_company_id UNIQUE (company_id)
);

-- Create index for chat_configs
CREATE INDEX IF NOT EXISTS idx_chat_configs_company_id ON chat_configs (company_id);

-- Set up triggers for keeping updated_at current
CREATE TRIGGER update_chat_configs_updated_at
BEFORE UPDATE ON chat_configs
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Migrate data from old table to new table
-- Convert domain to company_id (for initial migration, use domain as company_id)
INSERT INTO chat_configs (company_id, system_prompt, pinecone_index_name, created_at, updated_at)
SELECT 
    domain as company_id, 
    system_prompt, 
    pinecone_index_name,
    created_at,
    updated_at
FROM chat_configs_old;

-- Drop the old table
DROP TABLE chat_configs_old; 