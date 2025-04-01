# API Changes: Chat-Company Association

## Overview

We've made significant changes to how chats are associated with companies in the Dialogue Foundry backend:

1. Added a `company_id` column to the `chats` table that references `chat_configs.company_id`
2. Modified the chat creation and message endpoints to use this relationship
3. Simplified the API by removing the need to pass `companyId` in every message request

## Database Changes

- Added a `company_id` column to the `chats` table with a foreign key to `chat_configs.company_id`
- Created an index on `company_id` for better query performance
- Added appropriate comments for documentation

## API Changes

### Chat Creation Endpoint

The chat creation endpoint now accepts a `companyId` parameter:

```
POST /chats
```

**Request Body:**
```json
{
  "userId": "user-123",
  "name": "My Chat",
  "companyId": "company-xyz"
}
```

**Important Notes:**
- The `companyId` will be validated against the `chat_configs` table
- If the `companyId` doesn't exist in the `chat_configs` table, the request will fail with a 400 error
- The `companyId` must be created in the `chat_configs` table before it can be used to create chats
- Once stored with the chat, this company ID will be used for all subsequent messages

**Error Response Example:**
```json
{
  "error": "Invalid company ID. No configuration found for \"company-xyz\"."
}
```

### Message Endpoints

The message endpoints have been updated to no longer require a `companyId` parameter in the request body. Instead, they retrieve the `company_id` from the associated chat:

```
POST /chats/:chatId/messages
```

**Previous Request Body (OLD):**
```json
{
  "content": "Hello, world!",
  "model": "gpt-4",
  "temperature": 0.7,
  "companyId": "company-xyz"
}
```

**New Request Body (NEW):**
```json
{
  "content": "Hello, world!",
  "model": "gpt-4",
  "temperature": 0.7
}
```

Similarly, the streaming endpoint no longer requires a `companyId` parameter:

```
GET /chats/:chatId/stream
POST /chats/:chatId/stream
```

## Front-End Changes Required

If you're integrating with this API, you'll need to make the following changes:

1. When creating a new chat, include the `companyId` in the request body
2. Ensure the `companyId` exists in the `chat_configs` table before using it
3. Remove the `companyId` parameter from all message and stream requests
4. Ensure your error handling can process the new error messages if a chat doesn't have a `company_id` associated with it

## Error Handling

The API now returns specific error messages if:

- A chat doesn't have a `company_id` associated with it
- The `company_id` doesn't exist in the `chat_configs` table
- The provided `company_id` for chat creation is invalid

## New Endpoints

A new endpoint has been added to retrieve all chats for a specific company:

```
GET /chats/company/:companyId
```

This endpoint returns all chats associated with the specified company ID.

## Benefits

These changes offer several benefits:

1. **Simplified API**: No need to pass `companyId` with every message request
2. **Data Integrity**: Enforces proper relationships between chats and companies
3. **Performance**: Can efficiently query chats by company ID
4. **Consistency**: Company information is stored in one place and not duplicated across requests

If you have any questions or need further clarification, please contact the backend team. 