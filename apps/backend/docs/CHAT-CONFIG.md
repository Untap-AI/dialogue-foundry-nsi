# Chat Configuration Management

This document describes how to manage chat configurations in the Dialogue Foundry platform.

## Overview

Chat configurations allow you to customize the behavior of your chatbot based on the domain from which requests are made. Each configuration contains:

- **Domain**: A unique identifier (e.g., "example.com")
- **System Prompt**: The instructions given to the AI model to guide its behavior
- **Pinecone Index Name**: The name of the Pinecone index for vector search (optional)

## Why Domain-Based Configuration?

Domain-based configuration allows you to:

1. Have different chat behaviors for different websites/applications
2. Store domain-specific system prompts centrally in the database
3. Configure vector search capabilities per domain
4. Customize the AI's personality and capabilities for each use case

## Database Structure

Chat configurations are stored in the `chat_configs` table with the following schema:

```sql
CREATE TABLE IF NOT EXISTS chat_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    domain TEXT NOT NULL UNIQUE CHECK (char_length(domain) <= 500),
    system_prompt TEXT NOT NULL CHECK (char_length(system_prompt) <= 10000),
    pinecone_index_name TEXT CHECK (char_length(pinecone_index_name) <= 500)
);
```

## Managing Chat Configurations

There are two tools available for managing chat configurations:

### 1. Interactive CLI Tool

Run the interactive CLI tool to manage configurations with a user-friendly interface:

```bash
pnpm chat-config
```

This opens a menu-driven interface where you can:
- List all configurations
- Get a configuration by domain
- Create new configurations
- Update existing configurations
- Delete configurations

### 2. Command-Line Interface (CLI)

For automation and scripting purposes, use the CLI tool:

```bash
pnpm chat-config-cli [command] [arguments]
```

Available commands:

- `list`: List all chat configurations
  ```bash
  pnpm chat-config-cli list
  ```

- `get`: Get a configuration for a specific domain
  ```bash
  pnpm chat-config-cli get example.com
  ```

- `create`: Create a new configuration
  ```bash
  pnpm chat-config-cli create example.com "You are a helpful assistant." my-pinecone-index
  ```

- `update`: Update an existing configuration
  ```bash
  pnpm chat-config-cli update example.com "New system prompt"
  ```

- `delete`: Delete a configuration
  ```bash
  pnpm chat-config-cli delete example.com
  ```

## Default Configuration

A default configuration is created automatically with the domain "default". This configuration is used when a request comes from a domain that doesn't have a specific configuration.

The default configuration cannot be deleted.

## API Behavior

When a chat request is made:

1. The system tries to find a configuration for the domain in the request (from the `domain` parameter or `Origin` header)
2. If found, it uses that configuration's system prompt and Pinecone index
3. If not found, it falls back to the default configuration
4. If a chat has its own system prompt set, that takes precedence over the domain configuration

## Adding New Customers

When adding a new customer:

1. Create a new chat configuration for their domain:
   ```bash
   pnpm chat-config-cli create customer-domain.com "Custom system prompt for this customer" customer-pinecone-index
   ```

2. The customer can immediately begin using the chat API, and it will automatically use their configured system prompt and Pinecone index. 