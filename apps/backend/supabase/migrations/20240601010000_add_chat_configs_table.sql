-- Create chat_configs table to store configuration by domain
CREATE TABLE IF NOT EXISTS chat_configs (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    
    -- REQUIRED
    domain TEXT NOT NULL UNIQUE CHECK (char_length(domain) <= 500),
    system_prompt TEXT NOT NULL CHECK (char_length(system_prompt) <= 10000),
    pinecone_index_name TEXT CHECK (char_length(pinecone_index_name) <= 500),
    
    -- CONSTRAINTS
    CONSTRAINT unique_domain UNIQUE (domain)
);

-- Create indexes for chat_configs
CREATE INDEX IF NOT EXISTS idx_chat_configs_domain ON chat_configs (domain);

-- Set up triggers for keeping updated_at current
CREATE TRIGGER update_chat_configs_updated_at
BEFORE UPDATE ON chat_configs
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Add initial default chat config
INSERT INTO chat_configs (domain, system_prompt, pinecone_index_name)
VALUES ('default', 'You are a helpful assistant.', 'default-index'); 