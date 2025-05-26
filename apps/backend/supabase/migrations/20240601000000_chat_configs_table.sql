-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at function for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create chat_configs table with current structure
CREATE TABLE IF NOT EXISTS chat_configs (
    -- PRIMARY KEY
    company_id TEXT PRIMARY KEY,
    
    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    
    -- REQUIRED
    system_prompt TEXT NOT NULL CHECK (char_length(system_prompt) <= 10000),
    
    -- OPTIONAL
    pinecone_index_name TEXT CHECK (char_length(pinecone_index_name) <= 500),
    sendgrid_template_id TEXT CHECK (char_length(sendgrid_template_id) <= 500),
    support_email TEXT CHECK (char_length(support_email) <= 255)
);

-- Create indexes for chat_configs
CREATE INDEX IF NOT EXISTS idx_chat_configs_company_id ON chat_configs (company_id);
CREATE INDEX IF NOT EXISTS idx_chat_configs_sendgrid_template_id ON chat_configs(sendgrid_template_id);

-- Set up triggers for keeping updated_at current
CREATE TRIGGER update_chat_configs_updated_at
BEFORE UPDATE ON chat_configs
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Add comments to explain the purpose of the columns
COMMENT ON COLUMN chat_configs.sendgrid_template_id IS 'SendGrid template ID for email communications';
COMMENT ON COLUMN chat_configs.support_email IS 'Support email address for the company';

-- Enable RLS on chat_configs table
ALTER TABLE chat_configs ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies
-- For now, only allow authenticated users to read chat_configs, but not modify them
CREATE POLICY "Allow authenticated users to read chat_configs"
ON chat_configs
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow only specific admin users to modify chat_configs
-- This policy assumes you have a user management system with admin roles
CREATE POLICY "Allow admins to modify chat_configs"
ON chat_configs
USING (auth.uid() IN (
    SELECT id 
    FROM auth.users 
    WHERE auth.uid() IN (
        '00000000-0000-0000-0000-000000000000' -- Replace with actual admin user ID(s)
        -- Add more admin UIDs as needed
    )
))
WITH CHECK (auth.uid() IN (
    SELECT id 
    FROM auth.users 
    WHERE auth.uid() IN (
        '00000000-0000-0000-0000-000000000000' -- Replace with actual admin user ID(s)
        -- Add more admin UIDs as needed
    )
)); 