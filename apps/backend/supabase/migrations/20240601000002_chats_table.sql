-- Chats Table
CREATE TABLE IF NOT EXISTS chats (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- RELATIONSHIPS
    user_id UUID NOT NULL,
    company_id TEXT REFERENCES chat_configs(company_id), -- Added company_id as foreign key
    
    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    
    -- REQUIRED
    name TEXT NOT NULL CHECK (char_length(name) <= 500)
    
    -- system_prompt was removed
);

-- Create indexes for chats
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats (user_id);
CREATE INDEX IF NOT EXISTS idx_chats_company_id ON chats (company_id);

-- Set up triggers for keeping updated_at current
CREATE TRIGGER update_chats_updated_at
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies
CREATE POLICY "Allow full access to own chats"
ON chats
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add comments
COMMENT ON COLUMN chats.company_id IS 'Foreign key to chat_configs.company_id, allowing chats to be associated with a specific company'; 