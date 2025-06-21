-- Remove the constraint on valid event types to allow dynamic event types
-- This allows us to add new event types without requiring database migrations

-- Drop the existing constraint
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS valid_event_type;

-- Keep the basic length constraint for event_type to prevent abuse
-- but remove the specific enum constraint
ALTER TABLE analytics_events 
ADD CONSTRAINT event_type_length_check 
CHECK (char_length(event_type) > 0 AND char_length(event_type) <= 100);

-- Update the comment to reflect the change
COMMENT ON COLUMN analytics_events.event_type IS 'Type of event (dynamic - can be any string up to 100 characters)';

-- Update the example comment to include conversation_starter_click
COMMENT ON COLUMN analytics_events.event_data IS 'Event-specific data examples:
link_click: {"url": "https://example.com", "link_text": "Click here", "click_position": 0}
conversation_starter_click: {"label": "How can I help you?", "position": 0, "prompt": "What can you do for me?"}
message_reaction: {"reaction_type": "thumbs_up", "reaction_value": 1}
file_download: {"file_name": "document.pdf", "file_size": 1024, "file_type": "pdf"}
copy_message: {"message_length": 150, "copy_method": "button"}
share_chat: {"share_method": "link", "recipient_count": 1}
feedback_submitted: {"rating": 5, "feedback_text": "Great response!", "feedback_type": "rating"}
error_occurred: {"error_type": "network", "error_message": "Connection failed", "error_code": "NET_001"}
feature_used: {"feature_name": "voice_input", "feature_context": "message_composer"}'; 