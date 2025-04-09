-- Add SendGrid template ID and support email columns to chat_configs table
ALTER TABLE chat_configs 
ADD COLUMN sendgrid_template_id TEXT CHECK (char_length(sendgrid_template_id) <= 500),
ADD COLUMN support_email TEXT CHECK (char_length(support_email) <= 255);

-- Add comments to explain the purpose of the columns
COMMENT ON COLUMN chat_configs.sendgrid_template_id IS 'SendGrid template ID for email communications';
COMMENT ON COLUMN chat_configs.support_email IS 'Support email address for the company';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_configs_sendgrid_template_id ON chat_configs(sendgrid_template_id);