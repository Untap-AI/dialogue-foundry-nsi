-- Analytics Events Table for Generic Event Tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- RELATIONSHIPS
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    company_id TEXT REFERENCES chat_configs(company_id),
    
    -- EVENT DATA
    event_type TEXT NOT NULL CHECK (char_length(event_type) <= 100),
    event_data JSONB NOT NULL DEFAULT '{}',
    
    -- CONTEXT DATA
    message_role TEXT CHECK (message_role IN ('user', 'assistant')),
    session_id TEXT, -- For tracking user sessions
    
    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    referrer TEXT,
    ip_address INET,
    
    -- CONSTRAINTS
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'link_click',
        'message_reaction',
        'file_download',
        'copy_message',
        'share_chat',
        'feedback_submitted',
        'error_occurred',
        'feature_used'
    ))
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_chat_id ON analytics_events (chat_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_message_id ON analytics_events (message_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_company_id ON analytics_events (company_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events (session_id);

-- GIN index for JSONB event_data for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_data ON analytics_events USING GIN (event_data);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_analytics_events_company_type_date ON analytics_events (company_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_chat_type_date ON analytics_events (chat_id, event_type, created_at);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies
CREATE POLICY "Allow full access to own analytics events"
ON analytics_events
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE analytics_events IS 'Generic analytics events table for tracking various user interactions and behaviors';
COMMENT ON COLUMN analytics_events.chat_id IS 'The chat where the event occurred';
COMMENT ON COLUMN analytics_events.message_id IS 'The specific message related to the event (if applicable)';
COMMENT ON COLUMN analytics_events.event_type IS 'Type of event (link_click, message_reaction, etc.)';
COMMENT ON COLUMN analytics_events.event_data IS 'JSON data specific to the event type';
COMMENT ON COLUMN analytics_events.message_role IS 'Whether the event was related to a user or assistant message';
COMMENT ON COLUMN analytics_events.session_id IS 'User session identifier for tracking user journeys';

-- Example event_data structures for different event types:
COMMENT ON COLUMN analytics_events.event_data IS 'Event-specific data examples:
link_click: {"url": "https://example.com", "link_text": "Click here", "click_position": 0}
message_reaction: {"reaction_type": "thumbs_up", "reaction_value": 1}
file_download: {"file_name": "document.pdf", "file_size": 1024, "file_type": "pdf"}
copy_message: {"message_length": 150, "copy_method": "button"}
share_chat: {"share_method": "link", "recipient_count": 1}
feedback_submitted: {"rating": 5, "feedback_text": "Great response!", "feedback_type": "rating"}
error_occurred: {"error_type": "network", "error_message": "Connection failed", "error_code": "NET_001"}
feature_used: {"feature_name": "voice_input", "feature_context": "message_composer"}'; 