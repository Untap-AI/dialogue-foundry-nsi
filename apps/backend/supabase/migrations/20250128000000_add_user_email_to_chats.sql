-- Add user_email column to chats table
-- This stores the email address provided by the user during the conversation
-- to avoid requesting it multiple times

ALTER TABLE chats 
ADD COLUMN user_email TEXT;

-- Add a check constraint to ensure email format is valid when provided
ALTER TABLE chats 
ADD CONSTRAINT chats_user_email_format_check 
CHECK (
    user_email IS NULL OR 
    user_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Create an index on user_email for efficient lookups
CREATE INDEX IF NOT EXISTS idx_chats_user_email ON chats (user_email);

-- Add comment to document the column
COMMENT ON COLUMN chats.user_email IS 'Email address provided by the user during the conversation. Used to avoid requesting email multiple times and for follow-up communications.'; 