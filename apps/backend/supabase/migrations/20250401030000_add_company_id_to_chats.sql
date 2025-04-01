-- Add company_id column to the chats table
ALTER TABLE chats 
ADD COLUMN company_id TEXT REFERENCES chat_configs(company_id);

-- Create an index for better performance when querying by company_id
CREATE INDEX idx_chats_company_id ON chats(company_id);

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN chats.company_id IS 'Foreign key to chat_configs.company_id, allowing chats to be associated with a specific company'; 